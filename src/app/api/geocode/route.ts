import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/serverSupabase";

export const runtime = "nodejs";
export const maxDuration = 60;

export interface CityKey {
  city: string | null;
  state: string | null;
  country: string | null;
}

export interface CityCoord extends CityKey {
  lat: number;
  lng: number;
}

/** Chave estável para agrupar/comparar cidades independentemente de nulos. */
function keyOf(c: CityKey): string {
  return `${c.city ?? ""}|${c.state ?? ""}|${c.country ?? ""}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Geocodifica uma cidade via Nominatim (OSM). Retorna null se não encontrar. */
async function geocode(c: CityKey): Promise<{ lat: number; lng: number } | null> {
  const parts = [c.city, c.state, c.country].filter(Boolean).join(", ");
  if (!parts) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      parts
    )}`;
    const res = await fetch(url, {
      headers: {
        // Nominatim exige um User-Agent identificável.
        "User-Agent": "CristaoQuiz/1.0 (admin stats geocoder)",
        "Accept-Language": "pt-BR",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Recebe uma lista de cidades e devolve suas coordenadas, usando a tabela
 * `city_coordinates` como cache e geocodificando apenas as que faltam.
 */
export async function POST(request: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ coords: [] });

  const { cities } = (await request.json()) as { cities?: CityKey[] };
  if (!cities?.length) return NextResponse.json({ coords: [] });

  // Deduplica as cidades pedidas.
  const unique = new Map<string, CityKey>();
  for (const c of cities) unique.set(keyOf(c), c);

  // Lê o que já está em cache.
  const { data: cached } = await supabase
    .from("city_coordinates")
    .select("city, state, country, lat, lng");
  const cacheMap = new Map<string, CityCoord>();
  for (const row of (cached ?? []) as CityCoord[]) cacheMap.set(keyOf(row), row);

  const result: CityCoord[] = [];
  const toInsert: CityCoord[] = [];

  for (const [key, c] of Array.from(unique.entries())) {
    const hit = cacheMap.get(key);
    if (hit && hit.lat != null && hit.lng != null) {
      result.push(hit);
      continue;
    }
    const geo = await geocode(c);
    if (geo) {
      const coord: CityCoord = { ...c, lat: geo.lat, lng: geo.lng };
      result.push(coord);
      toInsert.push(coord);
    }
    // Respeita o limite de ~1 req/s do Nominatim entre cidades novas.
    await sleep(1100);
  }

  if (toInsert.length) {
    await supabase
      .from("city_coordinates")
      .upsert(toInsert, { onConflict: "city,state,country" });
  }

  return NextResponse.json({ coords: result });
}
