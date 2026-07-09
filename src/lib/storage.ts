export interface PlayerSession {
  playerId: string;
  playerName: string;
  roomCode: string;
  roomId: string;
}

const SESSION_KEY = "cristao:session";
const SOLO_NAME_KEY = "cristao:soloName";
const SOLO_VERSION_KEY = "cristao:soloVersion";
const DEVICE_ID_KEY = "cristao_quiz_device_id";

/** Gera um UUID v4 (usa crypto.randomUUID quando disponível; senão, fallback RFC4122). */
function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retorna o identificador persistente deste dispositivo, criando-o na primeira
 * chamada. Usado para métricas de audiência (dispositivos únicos ao longo do
 * tempo) sem exigir login. Idempotente: uma vez gerado, permanece no localStorage.
 */
export function ensureDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUuidV4();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Alias de leitura — garante e devolve o device_id. Vazio no lado servidor. */
export function getDeviceId(): string {
  return ensureDeviceId();
}

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
