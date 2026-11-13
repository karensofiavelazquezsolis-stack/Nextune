// Almacenamiento interno de descargas (IndexedDB), separado por cuenta.
import { getToken } from "./api";

const DB_NAME = "nexttune-offline";
const STORE = "descargas";

type Id = number | string;
export type DescargaInfo = { id: Id; meta: any; bytes: number; savedAt: number };

const abrir = (): Promise<IDBDatabase> =>
  new Promise((ok, err) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => {
      const s = r.result.createObjectStore(STORE, { keyPath: "key" });
      s.createIndex("uid", "uid");
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => err(r.error);
  });

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir();
  return new Promise<T>((ok, err) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => { db.close(); ok(req.result); };
    t.onerror = t.onabort = () => { db.close(); err(t.error); };
  });
}

const k = (uid: number, id: Id) => `${uid}:${id}`;
const urls = new Map<string, string>();

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export async function pedirPersistencia() {
  try { await navigator.storage?.persist?.(); } catch { /* opcional */ }
}

// Descarga el audio desde el backend (que valida Premium) con progreso y verificación de tamaño
export async function descargarArchivo(file: string, onProgress: (pct: number) => void, signal: AbortSignal): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`/api/descargas/archivo?file=${encodeURIComponent(file)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "No se pudo descargar la canción");
  }
  const total = Number(res.headers.get("Content-Length")) || 0;
  const reader = res.body?.getReader();
  if (!reader) {
    const b = await res.blob();
    if (!b.size) throw new Error("El archivo descargado está vacío");
    onProgress(100);
    return b;
  }
  const parts: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    received += value.length;
    if (total) onProgress(Math.min(99, Math.round((received / total) * 100)));
  }
  if (!received || (total && received !== total)) throw new Error("La descarga quedó incompleta");
  onProgress(100);
  return new Blob(parts as BlobPart[], { type: res.headers.get("Content-Type") || "audio/mpeg" });
}

// Guarda y VERIFICA: si no queda completo, se borra y se lanza error (nunca aparece como descargada)
export async function guardarDescarga(uid: number, song: any, blob: Blob) {
  const key = k(uid, song.id);
  await tx("readwrite", (s) => s.put({ key, uid, id: song.id, meta: { ...song }, blob, bytes: blob.size, savedAt: Date.now() }));
  const back = await tx<any>("readonly", (s) => s.get(key));
  if (!back || !back.blob || back.blob.size !== blob.size || !blob.size) {
    await tx("readwrite", (s) => s.delete(key)).catch(() => {});
    throw new Error("No se pudo verificar el archivo guardado");
  }
}

export async function listarDescargas(uid: number): Promise<DescargaInfo[]> {
  const rows = await tx<any[]>("readonly", (s) => s.index("uid").getAll(uid));
  return rows
    .filter((r) => r.blob && r.blob.size > 0 && r.blob.size === r.bytes) // descarta archivos incompletos
    .map((r) => ({ id: r.id, meta: r.meta, bytes: r.bytes, savedAt: r.savedAt }))
    .sort((a, b) => a.savedAt - b.savedAt);
}

export async function obtenerUrl(uid: number, id: Id): Promise<string> {
  const key = k(uid, id);
  const ya = urls.get(key);
  if (ya) return ya;
  const row = await tx<any>("readonly", (s) => s.get(key));
  if (!row?.blob?.size) return "";
  const u = URL.createObjectURL(row.blob);
  urls.set(key, u);
  return u;
}

export async function borrarDescarga(uid: number, id: Id) {
  const key = k(uid, id);
  const u = urls.get(key);
  if (u) { URL.revokeObjectURL(u); urls.delete(key); }
  await tx("readwrite", (s) => s.delete(key));
}

export function liberarUrls() {
  urls.forEach((u) => URL.revokeObjectURL(u));
  urls.clear();
}