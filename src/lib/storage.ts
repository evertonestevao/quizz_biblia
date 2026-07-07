export interface PlayerSession {
  playerId: string;
  playerName: string;
  roomCode: string;
  roomId: string;
}

const SESSION_KEY = "cristao:session";
const SOLO_NAME_KEY = "cristao:soloName";
const SOLO_VERSION_KEY = "cristao:soloVersion";

export function saveSession(session: PlayerSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): PlayerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

export function saveSoloName(name: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOLO_NAME_KEY, name);
}

export function getSoloName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(SOLO_NAME_KEY) ?? "";
}

export function saveSoloVersion(versionId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOLO_VERSION_KEY, versionId);
}

export function getSoloVersion(): string {
  if (typeof window === "undefined") return "acf";
  return localStorage.getItem(SOLO_VERSION_KEY) ?? "acf";
}
