"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  count: number;
}

/** Ícone circular com o número de jogadores daquela cidade. */
function countIcon(count: number): L.DivIcon {
  const size = count >= 10 ? 40 : 34;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:#D4AF37;color:#0B1026;
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:14px;font-family:system-ui,sans-serif;
      border:2px solid #FCF3D9;box-shadow:0 1px 6px rgba(0,0,0,.5);
    ">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Ajusta o zoom/enquadramento sempre que os pontos mudam. */
function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 6);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
  }, [points, map]);
  return null;
}

export default function LocationsMap({ points }: { points: MapPoint[] }) {
  return (
    <MapContainer
      center={[-14.235, -51.925]}
      zoom={4}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p, i) => (
        <Marker key={`${p.label}-${i}`} position={[p.lat, p.lng]} icon={countIcon(p.count)}>
          <Tooltip>
            {p.label} — {p.count} jogador{p.count === 1 ? "" : "es"}
          </Tooltip>
        </Marker>
      ))}
      <FitBounds points={points} />
    </MapContainer>
  );
}
