import type { Book } from "@/types/bible";

export type BibleVersionId = "acf" | "nvi" | "aa";

export interface BibleVersion {
  id: BibleVersionId;
  label: string;
  /** Carrega o JSON da versão sob demanda (não infla o bundle inicial). */
  loader: () => Promise<Book[]>;
}

export const BIBLE_VERSIONS: BibleVersion[] = [
  {
    id: "acf",
    label: "ACF — Almeida Corrigida Fiel",
    loader: async () => (await import("@/data/acf.json")).default as Book[],
  },
  {
    id: "nvi",
    label: "NVI — Nova Versão Internacional",
    loader: async () => (await import("@/data/nvi.json")).default as Book[],
  },
  {
    id: "aa",
    label: "AA — Almeida Atualizada",
    loader: async () => (await import("@/data/aa.json")).default as Book[],
  },
];

export const DEFAULT_VERSION_ID: BibleVersionId = "acf";

export function getVersion(id: string): BibleVersion {
  return BIBLE_VERSIONS.find((v) => v.id === id) ?? BIBLE_VERSIONS[0];
}

export function isVersionId(value: string): value is BibleVersionId {
  return BIBLE_VERSIONS.some((v) => v.id === value);
}

const cache = new Map<BibleVersionId, Book[]>();

/** Carrega (com cache em memória) os livros de uma versão. */
export async function loadBooks(id: string): Promise<Book[]> {
  const version = getVersion(id);
  const cached = cache.get(version.id);
  if (cached) return cached;
  const books = await version.loader();
  cache.set(version.id, books);
  return books;
}
