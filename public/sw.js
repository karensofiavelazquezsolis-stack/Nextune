// Service worker de NextTune: guarda la app (pantallas, estilos, scripts, fuentes e imágenes) para abrirla sin internet.
// El audio descargado NO pasa por aquí: lo guarda y lo lee la propia app (Cache Storage "nexttune-offline-audio-v1").
const SHELL = "nexttune-shell-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then((c) => c.add("/")).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("nexttune-shell-") && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

const guardable = (res) => res && (res.ok || res.type === "opaque");

async function paginaConRespaldo(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put("/", res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await cache.match("/")) || Response.error();
  }
}

async function cacheYActualiza(req) {
  const cache = await caches.open(SHELL);
  const guardado = await cache.match(req);
  const red = fetch(req).then((res) => { if (guardable(res)) cache.put(req, res.clone()); return res; }).catch(() => null);
  if (guardado) { red.catch(() => {}); return guardado; }
  return (await red) || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  const propio = url.origin === self.location.origin;
  if (propio && (url.pathname.startsWith("/api/") || url.pathname.startsWith("/audio/") || url.pathname.startsWith("/__offline_audio/") || url.pathname === "/sw.js")) return;
  if (req.mode === "navigate") { e.respondWith(paginaConRespaldo(req)); return; }
  if (propio || req.destination === "image" || /(^|\.)(googleapis|gstatic)\.com$/.test(url.hostname)) e.respondWith(cacheYActualiza(req));
});