import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import { api, setToken } from "./api";
import { A11yLauncher, DialogBox, SkipLink, announce, useDialog, useReducedMotion } from "./accesibilidad";

type Screen =
  | "inicio"
  | "busqueda"
  | "biblioteca"
  | "crear"
  | "cuenta"
  | "membresia"
  | "pago"
  | "descargas"
  | "admin"
  | "recuperar"
  | "amigos";

type Role = "normal" | "premium" | "admin";

type IconName =
  | "home"
  | "search"
  | "library"
  | "plus"
  | "play"
  | "pause"
  | "heart"
  | "more"
  | "chevron"
  | "shuffle"
  | "previous"
  | "next"
  | "repeat"
  | "share"
  | "download"
  | "device"
  | "lyrics"
  | "queue"
  | "user"
  | "crown"
  | "check"
  | "x"
  | "arrow"
  | "bell"
  | "offline"
  | "trash"
  | "grip"
  | "users"
  | "camera";

const iconPaths: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 10.8 12 3l9 7.8v9.7a.5.5 0 0 1-.5.5H15v-6H9v6H3.5a.5.5 0 0 1-.5-.5Z" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  library: <><path d="M4 4v16M9 4v16M14 6l5-2 2 15-5 1Z" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  play: <><path d="m9 6 10 6-10 6Z" /></>,
  pause: <><path d="M9 6v12M15 6v12" /></>,
  heart: <><path d="M20.8 5.9a5.5 5.5 0 0 0-7.8 0L12 7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.3a5.5 5.5 0 0 0 0-7.8Z" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  chevron: <><path d="m9 18 6-6-6-6" /></>,
  shuffle: <><path d="M3 6h3c5 0 7 12 12 12h3M18 3l3 3-3 3M3 18h3c2 0 3.5-2 5-4M18 15l3 3-3 3" /></>,
  previous: <><path d="M6 5v14M18 6l-9 6 9 6Z" /></>,
  next: <><path d="M18 5v14M6 6l9 6-9 6Z" /></>,
  repeat: <><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" /></>,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.7 10.7 6.6-4.2M8.7 13.3l6.6 4.2" /></>,
  download: <><path d="M12 3v13M7 11l5 5 5-5M4 21h16" /></>,
  device: <><path d="M5 7.5a10 10 0 0 1 14 0M8 11a6 6 0 0 1 8 0M11 14.5a2 2 0 0 1 2 0M12 17v4" /></>,
  lyrics: <><path d="M5 4h14v12H9l-4 4ZM9 8h6M9 12h4" /></>,
  queue: <><path d="M4 6h11M4 12h11M4 18h7M18 15v6M15 18h6" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  crown: <><path d="m3 7 4 4 5-7 5 7 4-4-2 11H5Z" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  arrow: <><path d="m15 18-6-6 6-6" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  offline: <><path d="m3 3 18 18M8.5 8.5a6 6 0 0 1 7.8.3M5 12a10 10 0 0 1 1-1M19 12a10 10 0 0 0-1-1M9 16a4.3 4.3 0 0 1 6 0M12 20h.01" /></>,
  trash: <><path d="M4 7h16M9 11v6M15 11v6M6 7l1 14h10l1-14M9 7V4h6v3" /></>,
  grip: <><path d="M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01" /></>,
  camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4Z" /><circle cx="12" cy="13" r="3.5" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M19 20a6 6 0 0 0-3-5.2" /></>,
};

function Icon({ name, size = 20, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function Button({
  children,
  variant = "primary",
  className = "",
  onClick,
  type = "button",
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-accent text-black shadow-glow hover:bg-accent-bright",
    secondary: "bg-panel-strong text-white hover:bg-line",
    ghost: "bg-transparent text-muted hover:bg-panel hover:text-white",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function Chip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active ? "border-accent bg-accent text-black shadow-glow-sm" : "border-line bg-panel text-muted hover:border-muted hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

type User = { id_usuario: number; nombre: string; correo: string; telefono: string | null; fecha_nacimiento: string | null; id_rol: number };
type Suscripcion = { plan: string; precio: number; fecha_inicio: string; fecha_fin: string; dias: number };
type Pago = { monto: number; fecha: string; metodo: string; estado: string; plan: string };
type Session = { token: string; user: User; role: Role; premium: boolean; expired: boolean; suscripcion: Suscripcion | null; pagos?: Pago[] };
type Id = number | string;
type Friend = { id_usuario: number; nombre: string; correo?: string; foto?: string | null; estado: "amigo" | "enviada" | "recibida" };
type Notif = { id: number; tipo: "solicitud" | "cancion" | "playlist"; de_id: number; de_nombre: string; de_foto?: string | null; titulo?: string; cancion?: any; leida: boolean; resuelta?: boolean; fecha?: string };
type PlaylistItem = { id: number; name: string; songIds: Id[]; covers?: string[] };
type Song = { id: Id; title: string; artist: string; album: string; genre: string; year: number; duration: number; file: string; preview?: string; color: string; artwork?: string; full?: boolean };

const palette = [
  "from-[#ff6a00] via-[#783400] to-black",
  "from-[#ff9a3d] via-[#4b1d00] to-[#111]",
  "from-[#d85500] via-[#181818] to-black",
  "from-[#ff7d21] via-[#662600] to-[#0a0a0a]",
  "from-[#ffb37a] via-[#6b2900] to-black",
  "from-[#f05f00] via-[#30170a] to-[#111]",
];

let songs: Song[] = [];
const toSong = (row: any, index: number): Song => ({
  ...row,
  album: row.album ?? "Sencillo",
  genre: row.genre ?? "Sin género",
  year: row.year ?? 2025,
  color: palette[index % palette.length],
});

const norm = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const addSongs = (rows: any[]): Song[] =>
  rows.map((row) => {
    const found = songs.find((s) => s.id === row.id);
    if (found) return found;
    const song = toSong({ ...row, full: row.full ?? !/^https?:\/\//i.test(String(row.file || "")) }, songs.length);
    songs.push(song);
    return song;
  });

// Busca la posición por id: sigue funcionando aunque la lista de canciones se haya recargado
const songIndex = (song: Song) => songs.findIndex((s) => s.id === song.id);

function useExternalSongs(params: string) {
  const [state, setState] = useState<{ loading: boolean; list: Song[] }>({ loading: false, list: [] });
  useEffect(() => {
    if (!params) { setState({ loading: false, list: [] }); return; }
    let cancel = false;
    setState((s) => ({ ...s, loading: true }));
    const t = window.setTimeout(() => {
      api<any[]>(`/external/canciones?${params}`)
        .catch(() => [] as any[])
        .then((rows) => { if (!cancel) setState({ loading: false, list: addSongs(rows) }); });
    }, 350);
    return () => { cancel = true; window.clearTimeout(t); };
  }, [params]);
  return state;
}

type LyricLine = { t: number; text: string };
const parseLrc = (raw: string): LyricLine[] => {
  const out: LyricLine[] = [];
  for (const line of raw.split("\n")) {
    const tags = [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!tags.length) continue;
    const text = line.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of tags) out.push({ t: Number(m[1]) * 60 + Number(m[2]), text });
  }
  return out.sort((a, b) => a.t - b.t);
};

// Persistencia local de portadas personalizadas de playlist y estado offline real
const PL_COVERS_KEY = "nexttune_playlist_covers_v1";
const getSavedPlaylistCovers = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(PL_COVERS_KEY) || "{}"); } catch { return {}; }
};
const savePlaylistCover = (playlistId: number | string, dataUrl: string) => {
  try {
    const all = getSavedPlaylistCovers();
    all[String(playlistId)] = dataUrl;
    localStorage.setItem(PL_COVERS_KEY, JSON.stringify(all));
  } catch {}
};

const OFFLINE_AUDIO_CACHE = "nexttune-offline-audio-v1";
// Clave estable por canción: la descarga se encuentra aunque el enlace externo (Deezer/iTunes) cambie o caduque
const offlineKey = (song: Song) => `/__offline_audio/${encodeURIComponent(String(song.id))}`;
const OFFLINE_STATE_KEY = "nexttune_offline_state_v1";
type OfflineCache = { session: Session; favs: Id[]; playlists: PlaylistItem[]; downloads: Id[]; catalog: Song[] };
const saveOfflineCache = (data: OfflineCache) => {
  try { localStorage.setItem(OFFLINE_STATE_KEY, JSON.stringify(data)); } catch {}
};
const loadOfflineCache = (): OfflineCache | null => {
  try { const r = localStorage.getItem(OFFLINE_STATE_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
};
const clearOfflineCache = () => {
  try { localStorage.removeItem(OFFLINE_STATE_KEY); } catch {}
};

// ───────────── ÁLBUMES GUARDADOS (cada usuario guarda los suyos; se conservan en este dispositivo) ─────────────
type SavedAlbum = { key: string; album: string; artist: string; artwork?: string };
let albumsOwner = 0; // id del usuario que inició sesión
const albumKey = (album: string, artist: string) => `${norm(album)}|${norm(artist)}`;
const albumStoreKey = () => `nexttune_saved_albums_v1_${albumsOwner}`;
const readSavedAlbums = (): SavedAlbum[] => {
  try { const r = JSON.parse(localStorage.getItem(albumStoreKey()) || "[]"); return Array.isArray(r) ? r : []; } catch { return []; }
};
const albumListeners = new Set<() => void>();
const writeSavedAlbums = (list: SavedAlbum[]) => {
  try { localStorage.setItem(albumStoreKey(), JSON.stringify(list)); } catch {}
  albumListeners.forEach((fn) => fn());
};
function useSavedAlbums() {
  const [list, setList] = useState<SavedAlbum[]>(readSavedAlbums);
  useEffect(() => {
    const fn = () => setList(readSavedAlbums());
    albumListeners.add(fn);
    fn();
    return () => { albumListeners.delete(fn); };
  }, []);
  const isSaved = (album: string, artist: string) => list.some((a) => a.key === albumKey(album, artist));
  // Guarda el álbum de esa canción o lo quita si ya estaba guardado. Devuelve true si quedó guardado.
  const toggle = (song: Song): boolean => {
    const key = albumKey(song.album, song.artist);
    const current = readSavedAlbums();
    const saved = current.some((a) => a.key === key);
    writeSavedAlbums(saved ? current.filter((a) => a.key !== key) : [...current, { key, album: song.album, artist: song.artist, artwork: song.artwork }]);
    announce(saved ? `Álbum ${song.album} quitado de tu biblioteca` : `Álbum ${song.album} guardado en tu biblioteca`);
    return !saved;
  };
  const remove = (key: string) => writeSavedAlbums(readSavedAlbums().filter((a) => a.key !== key));
  return { list, isSaved, toggle, remove };
}

function PlaylistCover({ covers, customCover, className = "" }: { covers: string[]; customCover?: string; className?: string }) {
  const imgs = covers.slice(0, 4);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-[#ff6a00] via-[#783400] to-black ${className}`}>
      {customCover ? (
        <img src={customCover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : imgs.length >= 4 ? (
        <div className="grid h-full w-full grid-cols-2 grid-rows-2">{imgs.map((src, i) => <img key={i} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover" />)}</div>
      ) : imgs.length ? (
        <img src={imgs[0]} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-white/70"><Icon name="library" size={34} /></span>
      )}
    </div>
  );
}

const fmtTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
const fmtDate = (value?: string | null) => (value ? value.slice(0, 10).split("-").reverse().join("/") : "");
const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const shortName = (name: string) => { const [first, second] = name.split(" "); return second ? `${first} ${second[0]}.` : first; };

// Convierte cualquier imagen (captura de pantalla, "copiar imagen" de una página…) a JPG de máx. 1200 px
async function shrinkImage(file: Blob, maxSide = 1200, quality = 0.9): Promise<string> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("No se pudo abrir esa imagen"));
      i.src = src;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.fillStyle = "#000"; // fondo para imágenes con transparencia
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(src);
  }
}

const audioSrc = (song: Song) => {
  if (!song?.file) return "";
  if (/^https?:\/\//i.test(song.file)) {
    // Los enlaces externos (Deezer, iTunes, Jamendo) pasan por TU servidor: así el navegador no los bloquea
    const url = typeof location !== "undefined" && location.protocol === "https:" ? song.file.replace(/^http:\/\//i, "https://") : song.file;
    return `/api/audio?url=${encodeURIComponent(url)}`;
  }
  const name = song.file
    .replace(/\\/g, "/")
    .split("/")
    .pop() || "";
  if (!name) return "";
  return `/audio/${encodeURIComponent(name)}`;
};

function Cover({ song, className = "" }: { song: Song; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative overflow-hidden bg-gradient-to-br ${song.color} ${className}`}>
      {song.artwork ? (
        <img src={song.artwork} alt="" loading="lazy" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <div className="absolute -right-5 -top-5 size-24 rounded-full border border-white/15" />
          <div className="absolute bottom-3 left-3 h-1 w-9 rounded-full bg-white/70" />
          <div className="absolute bottom-3 left-14 h-1 w-4 rounded-full bg-white/30" />
          <span className="absolute right-3 top-3 text-[10px] font-black tracking-[.22em] text-white/60">NT</span>
        </>
      )}
    </div>
  );
}

// Abre el menú de compartir desde cualquier lista de canciones
const openShare = (song: Song) => window.dispatchEvent(new CustomEvent<Song>("nexttune:share", { detail: song }));

function SongCard({
  song,
  onPlay,
  onQueue,
  compact = false,
  fluid = false,
}: {
  song: Song;
  onPlay: () => void;
  onQueue?: () => void;
  compact?: boolean;
  fluid?: boolean;
}) {
  if (compact) {
    return (
      <div className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-panel">
        <Cover song={song} className="size-12 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{song.title}</p>
          <p className="truncate text-xs text-muted">{song.artist}</p>
        </div>
        <button aria-label={`Reproducir ${song.title}`} onClick={onPlay} className="rounded-full p-2 text-muted hover:bg-panel-strong hover:text-accent">
          <Icon name="play" size={18} />
        </button>
        {onQueue && (
          <button aria-label={`Agregar ${song.title} a la cola`} title="Agregar a la cola" onClick={onQueue} className="rounded-full p-2 text-muted hover:bg-panel-strong hover:text-accent">
            <Icon name="queue" size={18} />
          </button>
        )}
        <button aria-label={`Compartir ${song.title}`} title="Compartir / enviar a un amigo" onClick={() => openShare(song)} className="rounded-full p-2 text-muted hover:bg-panel-strong hover:text-accent">
          <Icon name="share" size={18} />
        </button>
      </div>
    );
  }
  return (
    <button onClick={onPlay} className={`group text-left ${fluid ? "w-full min-w-0 sm:w-40 sm:shrink-0 lg:w-44" : "w-36 shrink-0 sm:w-40 lg:w-44"}`}>
      <div className="relative">
        <Cover song={song} className="aspect-square w-full rounded-2xl shadow-card" />
        <span className="absolute bottom-3 right-3 flex size-10 translate-y-2 items-center justify-center rounded-full bg-accent text-black opacity-0 shadow-glow transition group-hover:translate-y-0 group-focus-visible:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100">
          <Icon name="play" size={19} filled />
        </span>
      </div>
      <p className="mt-3 truncate text-sm font-bold text-white">{song.title}</p>
      <p className="mt-1 truncate text-xs text-muted">{song.artist}</p>
    </button>
  );
}

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-black shadow-glow">
        <svg viewBox="0 0 32 32" className="size-6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
          <path d="M6 23V9l8 14V9l12 14V9" />
        </svg>
      </div>
      {!compact && <span className="text-xl font-black tracking-tight text-white">Next<span className="text-accent">Tune</span></span>}
    </div>
  );
}

const navItems: { screen: Screen; label: string; icon: IconName }[] = [
  { screen: "inicio", label: "Inicio", icon: "home" },
  { screen: "busqueda", label: "Búsqueda", icon: "search" },
  { screen: "biblioteca", label: "Biblioteca", icon: "library" },
  { screen: "crear", label: "Crear", icon: "plus" },
  { screen: "amigos", label: "Amigos", icon: "users" },
];

function Navigation({ screen, onNavigate, friends, pending }: { screen: Screen; onNavigate: (screen: Screen) => void; friends: Friend[]; pending: number }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-ink px-5 py-6 lg:flex">
        <div className="px-2"><Logo /></div>
        <nav aria-label="Navegación principal" className="mt-10 space-y-2">
          {navItems.map((item) => {
            const active = screen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => onNavigate(item.screen)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  active ? "bg-accent-soft text-accent" : "text-muted hover:bg-panel hover:text-white"
                }`}
              >
                <Icon name={item.icon} filled={active && item.icon === "home"} />
                {item.label}
                {item.screen === "amigos" && pending > 0 && <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] font-black text-black">{pending}<span className="sr-only"> solicitudes pendientes</span></span>}
                {active && <span className="ml-auto h-5 w-1 rounded-full bg-accent shadow-glow-sm" />}
              </button>
            );
          })}
        </nav>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-muted">Amigos</p>
          {friends.filter((f) => f.estado === "amigo").length ? friends.filter((f) => f.estado === "amigo").slice(0, 10).map((f) => (
            <button key={f.id_usuario} onClick={() => onNavigate("amigos")} className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-2 text-left transition hover:bg-panel">
              <Avatar name={f.nombre} foto={f.foto} size={30} />
              <span className="truncate text-sm font-semibold text-white">{f.nombre}</span>
            </button>
          )) : <p className="px-4 pt-2 text-xs leading-relaxed text-muted">Aún no tienes amigos. Agrégalos en la pestaña Amigos.</p>}
        </div>
        <button onClick={() => onNavigate("membresia")} className="mt-4 block w-full shrink-0 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/15 to-transparent p-4 text-left transition hover:border-accent/60 hover:from-accent/25">
          <Icon name="crown" size={22} />
          <span className="mt-3 block text-sm font-bold text-white">Música sin límites</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted">Descarga tus canciones y escucha sin conexión.</span>
          <span className="mt-4 block text-xs font-bold text-accent">Conocer Premium</span>
        </button>
      </aside>
      <nav aria-label="Navegación principal" className="fixed inset-x-0 bottom-0 z-40 grid h-20 grid-cols-5 border-t border-line bg-ink/95 px-2 pb-safe backdrop-blur-xl lg:hidden">
        {navItems.map((item) => {
          const active = screen === item.screen;
          return (
            <button key={item.screen} onClick={() => onNavigate(item.screen)} aria-current={active ? "page" : undefined} className={`flex flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-accent" : "text-muted"}`}>
              <span className="relative"><Icon name={item.icon} size={21} filled={active && item.icon === "home"} />{item.screen === "amigos" && pending > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-accent"><span className="sr-only">Solicitudes pendientes</span></span>}</span>
              {item.label}
              <span className={`h-1 w-1 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
            </button>
          );
        })}
      </nav>
    </>
  );
}

function Header({ onAccount, premium, user, avatar, unread, onBell }: { onAccount: () => void; premium: boolean; user: User; avatar: string | null; unread: number; onBell: () => void }) {
  const today = cap(new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }));
  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-line/60 bg-canvas/85 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
      <div className="lg:hidden"><Logo compact /></div>
      <div className="hidden lg:block">
        <p className="text-xs font-medium text-muted">{today}</p>
        <p className="text-sm font-bold text-white">Tu música, a tu ritmo.</p>
      </div>
      <div className="flex items-center gap-2">
        <A11yLauncher variant="header" />
        <button onClick={onBell} aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"} aria-haspopup="dialog" className="relative rounded-full bg-panel p-3 text-muted transition hover:text-white">
          <Icon name="bell" size={19} />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black leading-4 text-black">{unread > 9 ? "9+" : unread}</span>}
        </button>
        <button onClick={onAccount} aria-haspopup="dialog" aria-label={`Mi cuenta: ${user.nombre}, ${premium ? "Premium" : "Plan gratis"}`} className="flex items-center gap-3 rounded-full bg-panel py-1.5 pl-1.5 pr-3 transition hover:bg-panel-strong">
          <Avatar name={user.nombre} foto={avatar} size={36} />
          <span className="hidden text-left sm:block">
            <span className="block text-xs font-bold text-white">{shortName(user.nombre)}</span>
            <span className={`flex items-center gap-1 text-[10px] font-bold ${premium ? "text-accent" : "text-muted"}`}>
              {premium && <Icon name="crown" size={11} />} {premium ? "Premium" : "Plan Gratis"}
            </span>
          </span>
          <Icon name="chevron" size={15} />
        </button>
      </div>
    </header>
  );
}

function ResetPasswordScreen({ token, onBack }: { token: string; onBack: () => void }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api("/recuperar/validar", "POST", { token, contrasena: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md rounded-3xl border border-line bg-panel p-8 shadow-2xl">
        <Logo />
        <h2 className="mt-6 text-2xl font-black text-white">Crea una nueva contraseña</h2>
        <p className="mt-1 text-xs text-muted">Usa al menos 6 caracteres.</p>

        {success ? (
          <div className="mt-6 rounded-2xl bg-accent/10 border border-accent/20 p-4 text-center">
            <p className="text-sm font-bold text-accent">¡Contraseña actualizada con éxito!</p>
            <p className="mt-2 text-xs text-muted">Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <Button className="mt-4 w-full" onClick={onBack}>Ir al login</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {error && <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">{error}</div>}
            <div>
              <label htmlFor="rp-new" className="text-xs font-bold text-muted">Nueva contraseña</label>
              <input
                id="rp-new"
                autoComplete="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-4 text-sm text-white outline-none focus:border-accent"
                required
              />
            </div>
            <div>
              <label htmlFor="rp-confirm" className="text-xs font-bold text-muted">Confirmar contraseña</label>
              <input
                id="rp-confirm"
                autoComplete="new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
                className="mt-1 h-12 w-full rounded-xl border border-line bg-ink px-4 text-sm text-white outline-none focus:border-accent"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : "Guardar contraseña"}
            </Button>
            <button type="button" onClick={onBack} className="w-full text-center text-xs font-bold text-muted hover:text-white">
              Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, onMore }: { title: string; subtitle?: string; children: React.ReactNode; onMore?: () => void }) {
  return (
    <section className="mt-9">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {onMore && <button onClick={onMore} className="text-xs font-bold text-muted transition hover:text-accent">Ver todo</button>}
      </div>
      {children}
    </section>
  );
}

const HOME_GENRES = ["Pop", "Rock", "Hip Hop", "Reggaetón", "Regional", "Electrónica"];

function HeroCarousel({ onPlay }: { onPlay: (index: number) => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false); // pausa elegida con el botón
  const [hovering, setHovering] = useState(false);     // pausa temporal con mouse o teclado dentro
  const reduced = useReducedMotion();

  const slides = [
    {
      badge: "SELECCIÓN NEXTTUNE",
      title: "Tu mundo suena",
      highlight: "mejor sin pausas.",
      description: "Una mezcla creada para acompañar tu tarde con nuevos sonidos y tus favoritos de siempre.",
      // Puedes poner aquí una URL de imagen o una ruta local como "/tu-imagen1.jpg" (guardándola en public)
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
    },
    {
      badge: "LO MÁS NUEVO",
      title: "Descubre los",
      highlight: "estrenos del día.",
      description: "Actualiza tu biblioteca con los sencillos más sonados y artistas en tendencia.",
      image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    },
    {
      badge: "EXCLUSIVO",
      title: "Tus vibras,",
      highlight: "tu propio ritmo.",
      description: "Explora listas personalizadas que se adaptan exactamente à lo que quieres escuchar ahora.",
      image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    },
  ];

  // WCAG 2.2.2: el movimiento automático se puede pausar, se detiene al interactuar y no corre si pidieron menos movimiento
  const autoplay = !reduced && !userPaused && !hovering;
  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 7000);
    return () => window.clearInterval(timer);
  }, [autoplay, slides.length]);

  const current = slides[currentIndex];

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Destacados de NextTune"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovering(false); }}
      className="on-dark relative mt-6 overflow-hidden rounded-3xl border border-white/5 bg-panel p-6 transition-all duration-300 sm:p-8 shadow-xl"
    >
      {/* Imagen de fondo con gradiente oscuro encima para leer el texto */}
      <div className="absolute inset-0 z-0">
        <img
          src={current.image}
          alt=""
          className="h-full w-full object-cover transition-all duration-700 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/50" />
      </div>

      <div className="relative z-10 max-w-xl" role="group" aria-roledescription="diapositiva" aria-label={`${currentIndex + 1} de ${slides.length}`} aria-live={autoplay ? "off" : "polite"}>
        <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent">
          {current.badge}
        </span>
        <h1 className="mt-5 max-w-lg text-3xl font-black leading-[1.08] tracking-tight text-white sm:text-5xl">
          {current.title} <span className="text-accent">{current.highlight}</span>
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted sm:text-base">
          {current.description}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button onClick={() => onPlay(0)}>
            <Icon name="play" size={18} filled /> Reproducir
          </Button>

          <div className="flex items-center gap-1">
            {!reduced && (
              <button
                onClick={() => setUserPaused((v) => !v)}
                aria-label={userPaused ? "Reanudar el cambio automático de diapositivas" : "Pausar el cambio automático de diapositivas"}
                className="mr-1 flex size-9 items-center justify-center rounded-full bg-black/50 text-white"
              >
                <Icon name={userPaused ? "play" : "pause"} size={16} filled={userPaused} />
              </button>
            )}
            {/* Indicadores: el botón mide 24 px (WCAG 2.5.8) y la bolita es solo decorativa */}
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className="flex size-6 items-center justify-center"
                aria-label={`Ir a diapositiva ${idx + 1}`}
                aria-current={currentIndex === idx ? "true" : undefined}
              >
                <span className={`h-2 rounded-full transition-all ${currentIndex === idx ? "w-6 bg-accent" : "w-2 bg-white/60"}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Home({ onPlay, favs }: { onPlay: (index: number) => void; favs: Set<Id> }) {
  const [genre, setGenre] = useState("Todos");
  const ext = useExternalSongs(genre === "Todos" ? "" : new URLSearchParams({ genero: genre }).toString());
  const regularSongs = songs.slice(0, 6);
  const favSongs = songs.filter((song) => favs.has(song.id));
  const recommended = useMemo(() => {
    const indexes = songs.map((_, i) => i);
    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }
    return indexes.slice(0, 6);
  }, [songs.length]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; list: Song[] }>();
    for (const s of songs) {
      const k = norm(s.genre);
      if (!k || k === "sin genero" || k === "general") continue;
      if (!map.has(k)) map.set(k, { label: s.genre, list: [] });
      map.get(k)!.list.push(s);
    }
    return [...map.values()].filter((g) => g.list.length >= 2).sort((a, b) => b.list.length - a.list.length).slice(0, 8);
  }, [songs, songs.length]);

  const genreSongs = genre === "Todos" ? [] : songs.filter((s) => norm(s.genre) === norm(genre));

  return (
    <div>
      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {["Todos", ...HOME_GENRES].map((item) => <Chip key={item} label={item} active={genre === item} onClick={() => setGenre(item)} />)}
      </div>

      {genre !== "Todos" ? (
        <section className="mt-6">
          <h1 className="text-3xl font-black text-white">{genre}</h1>
          <p className="mt-1 text-sm text-muted">{ext.loading ? "Buscando canciones..." : `${genreSongs.length} ${genreSongs.length === 1 ? "canción" : "canciones"}`}</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:flex sm:flex-wrap">
            {genreSongs.map((song) => <SongCard fluid key={song.id} song={song} onPlay={() => onPlay(songIndex(song))} />)}
          </div>
          {!ext.loading && !genreSongs.length && <p className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">No encontramos canciones de este género.</p>}
        </section>
      ) : (
        <>
          <HeroCarousel onPlay={onPlay} />

          <Section title="Escuchado regularmente" subtitle="Continúa justo donde lo dejaste">
            <div className="scrollbar-none flex gap-4 overflow-x-auto pb-3">{regularSongs.map((song, i) => <SongCard key={song.id} song={song} onPlay={() => onPlay(i)} />)}</div>
          </Section>
          <Section title="Tus favoritas" subtitle={`${favSongs.length} ${favSongs.length === 1 ? "canción" : "canciones"}`}>
            {favSongs.length ? (
              <div className="scrollbar-none flex gap-4 overflow-x-auto pb-3">{favSongs.slice(0, 12).map((song) => <SongCard key={song.id} song={song} onPlay={() => onPlay(songIndex(song))} />)}</div>
            ) : (
              <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">Aún no has agregado canciones a tus favoritas. ¡Toca el corazón de cualquier canción para guardarla aquí!</p>
            )}
          </Section>
          <Section title="Recomendaciones para ti" subtitle="Basadas en tus reproducciones recientes">
            <div className="scrollbar-none flex gap-4 overflow-x-auto pb-3">{recommended.map((i) => songs[i] && <SongCard key={songs[i].id} song={songs[i]} onPlay={() => onPlay(i)} />)}</div>
          </Section>
          {groups.map((g) => (
            <Section key={g.label} title={g.label} onMore={HOME_GENRES.some((x) => norm(x) === norm(g.label)) ? () => setGenre(HOME_GENRES.find((x) => norm(x) === norm(g.label))!) : undefined}>
              <div className="scrollbar-none flex gap-4 overflow-x-auto pb-3">{g.list.slice(0, 12).map((song) => <SongCard key={song.id} song={song} onPlay={() => onPlay(songIndex(song))} />)}</div>
            </Section>
          ))}
        </>
      )}
    </div>
  );
}

const SEARCH_GENRES = ["Pop", "Rock", "Hip Hop", "Reggaetón", "Regional", "Electrónica", "Indie"];

function SearchScreen({ onPlay, onQueue }: { onPlay: (index: number) => void; onQueue: (song: Song) => void }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const savedAlbums = useSavedAlbums();
  const q = norm(query);
  const ext = useExternalSongs(q.length >= 2 ? new URLSearchParams({ q: query.trim() }).toString() : "");
  const extGenre = useExternalSongs(genre ? new URLSearchParams({ genero: genre }).toString() : "");
  const tokens = q.split(/\s+/).filter(Boolean);

  const matches = useMemo(() => {
    if (!tokens.length) return [] as Song[];
    return songs
      .map((s) => {
        const t = norm(s.title), a = norm(s.artist), al = norm(s.album);
        if (!tokens.every((k) => t.includes(k) || a.includes(k) || al.includes(k))) return null;
        const score =
          (a === q ? 100 : a.startsWith(q) ? 80 : a.includes(q) ? 60 : 0) +
          (t === q ? 90 : t.startsWith(q) ? 70 : t.includes(q) ? 50 : 0) +
          (al.includes(q) ? 20 : 0);
        return { s, score };
      })
      .filter((x): x is { s: Song; score: number } => x !== null)
      .sort((x, y) => y.score - x.score)
      .map((x) => x.s);
  }, [query, songs.length, ext.list]);

  const artists = useMemo(() => {
    const seen = new Map<string, Song>();
    for (const s of matches) if (tokens.every((k) => norm(s.artist).includes(k)) && !seen.has(norm(s.artist))) seen.set(norm(s.artist), s);
    return [...seen.values()].slice(0, 6);
  }, [matches]);
  const albums = useMemo(() => {
    const seen = new Map<string, Song>();
    for (const s of matches) if (norm(s.album) !== "sencillo" && tokens.every((k) => norm(s.album).includes(k)) && !seen.has(norm(s.album))) seen.set(norm(s.album), s);
    return [...seen.values()].slice(0, 6);
  }, [matches]);

  const genreSongs = genre ? songs.filter((s) => norm(s.genre) === norm(genre)) : [];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-3xl font-black text-white">Búsqueda</h1>
        <p className="mt-2 text-sm text-muted">Encuentra canciones, artistas y álbumes.</p>
      </div>
      <label className="flex max-w-2xl items-center gap-3 rounded-2xl border border-line bg-panel px-4 transition focus-within:border-accent">
        <Icon name="search" size={21} />
        <input type="text" inputMode="search" enterKeyHint="search" aria-label="Buscar canciones, artistas y álbumes" autoComplete="off" value={query} onChange={(e) => { setQuery(e.target.value); setGenre(null); }} placeholder="¿Qué quieres escuchar?" className="h-14 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted" />
        {query && <button onClick={() => setQuery("")} aria-label="Borrar búsqueda" className="p-1 text-muted hover:text-white"><Icon name="x" size={18} /></button>}
      </label>

      {query ? (
        <div className="mt-8">
          {ext.loading && <p className="mb-3 text-xs text-muted">Buscando más resultados...</p>}
          {matches.length ? (
            <>
              {artists.length > 0 && (
                <div className="mb-8">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Artistas</p>
                  <div className="scrollbar-none flex gap-3 overflow-x-auto">
                    {artists.map((song) => (
                      <button key={song.artist} onClick={() => setQuery(song.artist)} className="flex w-28 shrink-0 flex-col items-center text-center">
                        <Cover song={song} className="size-24 rounded-full" />
                        <span className="mt-2 w-full truncate text-xs font-bold text-white">{song.artist}</span>
                        <span className="text-[10px] text-muted">Artista</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Canciones</p>
              <div className="max-w-3xl space-y-1">
                {matches.slice(0, 40).map((song) => <SongCard compact key={song.id} song={song} onPlay={() => onPlay(songIndex(song))} onQueue={() => onQueue(song)} />)}
              </div>
              {albums.length > 0 && (
                <div className="mt-8 max-w-3xl">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">Álbumes</p>
                  <div className="space-y-2">
                    {albums.map((song) => {
                      const saved = savedAlbums.isSaved(song.album, song.artist);
                      return (
                        <div key={`${song.album}-${song.id}`} className="flex items-center gap-2 rounded-xl bg-panel p-3 hover:bg-panel-strong">
                          <button onClick={() => onPlay(songIndex(song))} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                            <Cover song={song} className="size-12 shrink-0 rounded-lg" />
                            <span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{song.album}</span><span className="block truncate text-xs text-muted">Álbum · {song.artist}</span></span>
                          </button>
                          <button onClick={() => savedAlbums.toggle(song)} aria-pressed={saved} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${saved ? "bg-accent text-black" : "border border-line text-white hover:border-accent"}`}>{saved ? "Guardado ✓" : "Guardar álbum"}</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : !ext.loading && (
            <div className="max-w-3xl"><div className="rounded-2xl border border-dashed border-line p-10 text-center"><p className="font-bold text-white">Sin resultados</p><p className="mt-2 text-sm text-muted">Prueba con otro título, artista o álbum.</p></div></div>
          )}
        </div>
      ) : genre ? (
        <div className="mt-8">
          <button onClick={() => setGenre(null)} className="mb-4 flex items-center gap-2 text-sm font-bold text-muted hover:text-white"><Icon name="arrow" size={18} /> Géneros</button>
          <h2 className="text-2xl font-black text-white">{genre}</h2>
          <p className="mt-1 text-sm text-muted">{extGenre.loading ? "Buscando canciones..." : `${genreSongs.length} ${genreSongs.length === 1 ? "canción" : "canciones"}`}</p>
          <div className="mt-5 max-w-3xl space-y-1">
            {genreSongs.map((song) => <SongCard compact key={song.id} song={song} onPlay={() => onPlay(songIndex(song))} onQueue={() => onQueue(song)} />)}
          </div>
        </div>
      ) : (
        <Section title="Explora por género">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {SEARCH_GENRES.map((g, i) => (
              <button key={g} onClick={() => setGenre(g)} className={`on-dark relative h-28 overflow-hidden rounded-2xl bg-gradient-to-br ${palette[i % palette.length]} p-4 text-left text-base font-black text-white transition hover:-translate-y-1`}>
                {g}<span className="absolute -bottom-4 -right-4 size-16 rotate-12 rounded-xl border border-white/15 bg-black/20" />
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function PlaylistDetail({
  id,
  onBack,
  onPlayList,
  onQueue,
  onChanged,
  notify,
  premium,
  onDownloadList,
  onPremium,
  friends,
}: {
  id: number;
  onBack: () => void;
  onPlayList: (list: Song[], loop?: Song[]) => void;
  onQueue: (song: Song) => void;
  onChanged: () => void;
  notify: (m: string) => void;
  premium: boolean;
  onDownloadList: (list: Song[]) => void;
  onPremium: () => void;
  friends: Friend[];
}) {
  const [inviting, setInviting] = useState(false);
  const [data, setData] = useState<{ name: string; songs: Song[] } | null>(null);
  const [name, setName] = useState("");
  const [picker, setPicker] = useState(false);
  const [filter, setFilter] = useState("");
  const [customCover, setCustomCover] = useState<string | undefined>(() => getSavedPlaylistCovers()[String(id)]);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const load = () =>
    api<{ id: number; name: string; songs: any[] }>(`/playlists/${id}`)
      .then((d) => { setData({ name: d.name, songs: addSongs(d.songs) }); setName(d.name); })
      .catch((e) => notify(e.message));
  useEffect(() => {
    setCustomCover(getSavedPlaylistCovers()[String(id)]);
    load();
  }, [id]);

  const ext = useExternalSongs(picker && filter.trim().length >= 2 ? new URLSearchParams({ q: filter.trim() }).toString() : "");

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("Selecciona una imagen JPG o PNG");
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      savePlaylistCover(id, url);
      setCustomCover(url);
      onChanged();
      notify("Portada de playlist actualizada");
    };
    reader.readAsDataURL(file);
  };

  const rename = async () => {
    if (!data || !name.trim() || name.trim() === data.name) return setName(data?.name ?? "");
    try { await api(`/playlists/${id}`, "PUT", { nombre: name.trim() }); notify("Nombre actualizado"); await load(); onChanged(); } catch (e) { notify((e as Error).message); }
  };

  const addSong = async (song: Song) => {
    try {
      await api(`/playlists/${id}/canciones`, "POST", song);
      notify(`"${song.title}" agregada a la playlist`);
      await load();
      onChanged();
    } catch (e) {
      notify((e as Error).message);
    }
  };

  const removeSong = async (song: Song) => {
    try { await api(`/playlists/${id}/canciones/${song.id}`, "DELETE"); notify("Canción quitada"); await load(); onChanged(); } catch (e) { notify((e as Error).message); }
  };

  const removePlaylist = async () => {
    if (!window.confirm("¿Eliminar esta playlist?")) return;
    try { await api(`/playlists/${id}`, "DELETE"); notify("Playlist eliminada"); onChanged(); onBack(); } catch (e) { notify((e as Error).message); }
  };

  if (!data) return <p className="text-sm text-muted">Cargando...</p>;
  const invite = async (friend: Friend) => {
    setInviting(false);
    try { await api("/compartir/playlist", "POST", { id_amigo: friend.id_usuario, id_playlist: id }); notify(`Invitaste a ${shortName(friend.nombre)} a "${data.name}"`); } catch (e) { notify((e as Error).message); }
  };
  const minutes = Math.round(data.songs.reduce((sum, s) => sum + s.duration, 0) / 60);
  const shuffled = () => [...data.songs].sort(() => Math.random() - 0.5);
  const existingIds = new Set(data.songs.map((s) => s.id));
  const availableSongs = [...songs, ...ext.list]
    .filter((s, idx, arr) => arr.findIndex((x) => x.id === s.id) === idx)
    .filter((s) => !existingIds.has(s.id) && norm(`${s.title} ${s.artist}`).includes(norm(filter)))
    .slice(0, 40);

  return (
    <div>
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-bold text-muted hover:text-white"><Icon name="arrow" size={18} /> Playlists</button>
      {inviting && <FriendPicker title="Invitar a la playlist" friends={friends} onPick={invite} onClose={() => setInviting(false)} />}
      <input type="file" ref={coverInputRef} onChange={handleCoverChange} accept="image/png, image/jpeg" className="hidden" />
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <button onClick={() => coverInputRef.current?.click()} title="Cambiar portada" className="group relative aspect-square w-48 shrink-0 overflow-hidden rounded-3xl shadow-card">
          <PlaylistCover covers={data.songs.map((s) => s.artwork || "").filter(Boolean)} customCover={customCover} className="h-full w-full" />
          <span className="absolute inset-0 flex items-center justify-center on-dark bg-black/55 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Cambiar portada</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Playlist</p>
          <input aria-label="Nombre de la playlist" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur())} className="mt-1 w-full bg-transparent text-3xl font-black text-white outline-none focus:border-b focus:border-accent sm:text-4xl" />
          <p className="mt-2 text-sm text-muted">{data.songs.length} canciones · {minutes} min</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={!data.songs.length} onClick={() => onPlayList(data.songs)}><Icon name="play" size={18} filled /> Reproducir</Button>
            <Button variant="secondary" disabled={!data.songs.length} onClick={() => onPlayList(shuffled())}><Icon name="shuffle" size={18} /> Aleatorio</Button>
            <Button variant="secondary" onClick={() => { setPicker(!picker); setFilter(""); }}>
              <Icon name={picker ? "x" : "plus"} size={18} /> {picker ? "Cerrar buscador" : "Agregar canciones"}
            </Button>
            <Button
              variant="secondary"
              disabled={!data.songs.length}
              onClick={() => {
                if (!premium) { notify("Necesitas Premium para descargar playlists completas"); onPremium(); return; }
                onDownloadList(data.songs);
              }}
            >
              <Icon name="download" size={18} /> Descargar playlist
            </Button>
            <Button variant="secondary" onClick={() => setInviting(true)}><Icon name="users" size={18} /> Invitar amigo</Button>
            <Button variant="ghost" onClick={removePlaylist}><Icon name="trash" size={18} /> Eliminar</Button>
          </div>
        </div>
      </div>

      {/* Buscador desplegable para agregar más canciones a la playlist */}
      {picker && (
        <div className="mt-6 max-w-3xl rounded-2xl border border-accent/30 bg-panel p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Agregar canciones a “{data.name}”</p>
            {ext.loading && <span className="text-[11px] text-muted">Buscando en catálogo...</span>}
          </div>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Busca por canción o artista para agregar..." aria-label="Buscar canciones para agregar a la playlist"
            autoFocus
            className="mb-3 h-11 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent"
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {availableSongs.length ? availableSongs.map((song) => (
              <button
                key={song.id}
                onClick={() => addSong(song)}
                className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-panel-strong"
              >
                <Cover song={song} className="size-10 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{song.title}</span>
                  <span className="block truncate text-xs text-muted">{song.artist} · {song.album}</span>
                </span>
                <span className="flex items-center gap-1 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-bold text-accent">
                  <Icon name="plus" size={15} /> Agregar
                </span>
              </button>
            )) : (
              <p className="py-6 text-center text-xs text-muted">
                {ext.loading ? "Buscando..." : "No hay más canciones con ese nombre o ya están en tu playlist."}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 max-w-3xl space-y-1">
        {data.songs.length ? data.songs.map((song, i) => (
          <div key={song.id} className="group flex items-center gap-3 rounded-xl p-2 hover:bg-panel">
            <span className="w-5 text-center text-xs text-muted">{i + 1}</span>
            <button onClick={() => onPlayList(data.songs.slice(i), data.songs)}><Cover song={song} className="size-12 rounded-lg" /></button>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{song.title}</p><p className="truncate text-xs text-muted">{song.artist} · {song.album}</p></div>
            <button onClick={() => onQueue(song)} title="Agregar a la cola" className="p-2 text-muted hover:text-accent"><Icon name="queue" size={18} /></button>
            <button onClick={() => removeSong(song)} title="Quitar de la playlist" className="p-2 text-muted hover:text-red-400"><Icon name="trash" size={18} /></button>
          </div>
        )) : <p className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Esta playlist está vacía. Usa el botón “Agregar canciones” de arriba para empezar.</p>}
      </div>
    </div>
  );
}

function Library({
  onPlay,
  onQueue,
  onPremium,
  premium,
  favs,
  onToggleFav,
  playlists,
  downloads,
  initialTab = "Favoritas",
  onPlayList,
  onPlaylistsChanged,
  onAddToPlaylist,
  onDownloadList,
  onRemoveDownload,
  onRemoveAllDownloads,
  notify,
  friends,
}: {
  onPlay: (index: number) => void;
  onQueue: (song: Song) => void;
  onPremium: () => void;
  premium: boolean;
  favs: Set<Id>;
  onToggleFav: (song: Song) => void;
  playlists: PlaylistItem[];
  downloads: Set<Id>;
  initialTab?: string;
  onPlayList: (list: Song[], loop?: Song[]) => void;
  onPlaylistsChanged: () => void;
  friends: Friend[];
  onAddToPlaylist: (song: Song) => void;
  onDownloadList: (list: Song[]) => void;
  onRemoveDownload: (song: Song) => void;
  onRemoveAllDownloads: () => void;
  notify: (m: string) => void;
}) {
  const [tab, setTab] = useState(initialTab);
  const [openPl, setOpenPl] = useState<number | null>(null);
  const savedCovers = getSavedPlaylistCovers();
  const favSongs = songs.filter((song) => favs.has(song.id));
  const downSongs = songs.filter((song) => downloads.has(song.id));
  const savedAlbums = useSavedAlbums();
  const playSavedAlbum = (a: SavedAlbum) => {
    let list = songs.filter((s) => albumKey(s.album, s.artist) === a.key);
    if (!list.length) list = songs.filter((s) => norm(s.album) === norm(a.album));
    if (!list.length) { notify("Este álbum no está disponible en el catálogo por ahora"); return; }
    onPlayList(list);
  };
  const empty = (text: string) => <p className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">{text}</p>;
  return (
    <div>
      <h1 className="text-3xl font-black text-white">Tu biblioteca</h1>
      <div className="scrollbar-none mt-5 flex gap-2 overflow-x-auto">
        {["Favoritas", "Playlists", "Descargas", "Álbumes"].map((item) => <Chip key={item} label={item} active={tab === item} onClick={() => { setTab(item); setOpenPl(null); }} />)}
      </div>
      {tab === "Descargas" ? (
        <div className="mt-8">
          {premium ? (
            <>
              <div className="mb-5 flex items-center justify-between rounded-2xl border border-accent/20 bg-accent/10 p-4">
                <div className="flex items-center gap-3"><span className="rounded-full bg-accent/15 p-2 text-accent"><Icon name="offline" /></span><div><p className="text-sm font-bold text-white">Tus descargas</p><p className="text-xs text-muted">{downSongs.length} canciones disponibles para escuchar sin conexión</p></div></div>
                <div className="flex items-center gap-2">{downSongs.length > 0 && <button onClick={onRemoveAllDownloads} className="rounded-full border border-line px-3 py-1 text-[10px] font-bold text-muted hover:border-red-400 hover:text-red-400">Eliminar todas</button>}<span className="rounded-full bg-accent px-3 py-1 text-[10px] font-black text-black">PREMIUM</span></div>
              </div>
              {downSongs.length ? downSongs.map((song) => <div key={song.id}><SongCard compact song={song} onPlay={() => onPlay(songIndex(song))} onQueue={() => onQueue(song)} /><div className="-mt-2 mb-2 ml-17 flex items-center gap-4"><p className="text-[10px] font-bold text-accent">Disponible sin conexión</p><button onClick={() => onRemoveDownload(song)} aria-label={`Eliminar descarga de ${song.title}`} className="flex items-center gap-1 text-[10px] font-bold text-muted hover:text-red-400"><Icon name="trash" size={12} /> Eliminar descarga</button></div></div>) : empty("Aún no has descargado canciones. Usa el botón Descargar en el reproductor.")}
            </>
          ) : (
            <div className="rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/10 to-panel p-8 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent/15 text-accent"><Icon name="download" size={25} /></span>
              <h2 className="mt-5 text-xl font-black text-white">Escucha donde quieras</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">Las descargas y la reproducción sin conexión están disponibles con Premium.</p>
              <Button className="mt-6" onClick={onPremium}><Icon name="crown" size={17} /> Obtener Premium</Button>
            </div>
          )}
        </div>
      ) : tab === "Playlists" ? (
        <div className="mt-8">
          {openPl !== null ? (
            <PlaylistDetail
              id={openPl}
              onBack={() => setOpenPl(null)}
              onPlayList={onPlayList}
              onQueue={onQueue}
              onChanged={onPlaylistsChanged}
              notify={notify}
              premium={premium}
              onDownloadList={onDownloadList}
              onPremium={onPremium}
              friends={friends}
            />
          ) : playlists.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {playlists.map((playlist) => (
                <button key={playlist.id} className="group text-left" onClick={() => setOpenPl(playlist.id)}>
                  <PlaylistCover covers={playlist.covers ?? []} customCover={savedCovers[String(playlist.id)]} className="aspect-square rounded-2xl shadow-card transition group-hover:-translate-y-1" />
                  <p className="mt-3 truncate text-sm font-bold text-white">{playlist.name}</p>
                  <p className="text-xs text-muted">{playlist.songIds.length} canciones</p>
                </button>
              ))}
            </div>
          ) : empty("Aún no tienes playlists. Crea la primera en la sección Crear.")}
        </div>
      ) : tab === "Álbumes" ? (
        <div className="mt-8">
          {savedAlbums.list.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {savedAlbums.list.map((a, i) => (
                <div key={a.key}>
                  <button className="block w-full text-left" onClick={() => playSavedAlbum(a)} aria-label={`Reproducir el álbum ${a.album}, de ${a.artist}`}>
                    <Cover song={{ color: palette[i % palette.length], artwork: a.artwork } as Song} className="aspect-square rounded-2xl" />
                    <p className="mt-3 truncate text-sm font-bold text-white">{a.album}</p>
                    <p className="truncate text-xs text-muted">{a.artist}</p>
                  </button>
                  <button onClick={() => savedAlbums.remove(a.key)} aria-label={`Quitar el álbum ${a.album} de mi biblioteca`} className="mt-2 rounded-full border border-line px-3 py-1.5 text-[11px] font-bold text-muted transition hover:border-red-400 hover:text-red-400">Quitar de mi biblioteca</button>
                </div>
              ))}
            </div>
          ) : empty("Aún no has guardado álbumes. Búscalos en Búsqueda y toca “Guardar álbum” en los que te gusten.")}
        </div>
      ) : (
        <div className="mt-8 max-w-3xl space-y-1">
          {favSongs.length ? favSongs.map((song) => (
            <div key={song.id} className="group flex items-center gap-3 rounded-xl p-2 hover:bg-panel">
              <button onClick={() => onPlay(songIndex(song))}><Cover song={song} className="size-12 rounded-lg" /></button>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{song.title}</p><p className="truncate text-xs text-muted">{song.artist} · {song.album}</p></div>
              <button onClick={() => onAddToPlaylist(song)} aria-label="Agregar a playlist" title="Agregar a playlist" className="p-2 text-muted hover:text-accent"><Icon name="plus" size={19} /></button>
              <button onClick={() => onQueue(song)} aria-label="Agregar a la cola" title="Agregar a la cola" className="p-2 text-muted hover:text-accent"><Icon name="queue" size={19} /></button>
              <button onClick={() => openShare(song)} aria-label="Compartir" title="Compartir / enviar a un amigo" className="p-2 text-muted hover:text-accent"><Icon name="share" size={19} /></button>
              <button onClick={() => onToggleFav(song)} aria-label="Quitar de favoritas" className="p-2 text-accent"><Icon name="heart" size={20} filled /></button>
            </div>
          )) : empty("Todavía no tienes favoritas. Toca el corazón en el reproductor para guardar una canción.")}
        </div>
      )}
    </div>
  );
}

function CreatePlaylist({ notify, onSave }: { notify: (message: string) => void; onSave: (name: string, list: Song[], coverDataUrl?: string) => Promise<void> }) {
  const [name, setName] = useState("Mi playlist");
  const [added, setAdded] = useState<Id[]>([]);
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");
  const [cover, setCover] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ext = useExternalSongs(picker && filter.trim().length >= 2 ? new URLSearchParams({ q: filter.trim() }).toString() : "");
  const addedSongs = added.map((id) => songs.find((song) => song.id === id)).filter((song): song is Song => Boolean(song));
  const minutes = Math.round(addedSongs.reduce((sum, song) => sum + song.duration, 0) / 60);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notify("Por favor selecciona una imagen JPG o PNG");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCover(reader.result as string);
      notify("Imagen de portada cargada");
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!name.trim()) return notify("Escribe un nombre para la playlist");
    setSaving(true);
    try {
      await onSave(name.trim(), addedSongs, cover || undefined);
      setAdded([]);
      setName("Mi playlist");
      setCover(null);
      notify("Playlist guardada");
    } catch (e) {
      notify((e as Error).message || "Error al guardar la playlist");
    } finally {
      setSaving(false);
    }
  };

  const availableSongs = [...songs, ...ext.list]
    .filter((s, idx, arr) => arr.findIndex((x) => x.id === s.id) === idx)
    .filter((s) => !added.includes(s.id) && norm(`${s.title} ${s.artist}`).includes(norm(filter)))
    .slice(0, 60);

  return (
    <div>
      <h1 className="text-3xl font-black text-white">Crear playlist</h1>
      <p className="mt-2 text-sm text-muted">Dale forma a una selección que suene a ti.</p>
      <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg" className="hidden" />
      <div className="mt-7 grid gap-7 lg:grid-cols-[18rem_1fr]">
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-line bg-panel text-muted transition hover:border-accent hover:text-accent"
          >
            {cover ? (
              <>
                <img src={cover} alt="Portada" className="absolute inset-0 h-full w-full object-cover" />
                <span className="absolute inset-0 flex items-center justify-center on-dark bg-black/50 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Cambiar portada</span>
              </>
            ) : (
              <>
                <Icon name="plus" size={30} /><span className="mt-3 text-sm font-bold">Agregar portada</span><span className="mt-1 text-xs">JPG o PNG</span>
              </>
            )}
          </button>
          <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-muted">Nombre</label>
          <input aria-label="Nombre de la playlist" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-line bg-panel px-4 text-sm text-white outline-none focus:border-accent" />
          <Button className="mt-4 w-full" disabled={saving} onClick={save}>{saving ? "Guardando..." : "Guardar playlist"}</Button>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => notify("Enlace copiado")}><Icon name="share" size={18} /> Compartir</Button>
        </div>
        <div>
          <div className="flex items-center justify-between"><div><p className="font-bold text-white">Canciones agregadas</p><p className="text-xs text-muted">{added.length} canciones · {minutes} min</p></div><Button variant="secondary" onClick={() => setPicker(!picker)}><Icon name={picker ? "x" : "plus"} size={17} /> {picker ? "Cerrar" : "Agregar"}</Button></div>
          {picker && <div className="mt-4 rounded-2xl border border-line bg-panel p-2">
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar canción o artista..." aria-label="Buscar canción o artista" className="mb-2 h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-white outline-none focus:border-accent" />
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {availableSongs.map((song) => (
                <button key={song.id} onClick={() => setAdded((items) => [...items, song.id])} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-panel-strong"><Cover song={song} className="size-10 rounded-lg" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{song.title}</span><span className="text-xs text-muted">{song.artist}</span></span><span className="text-accent"><Icon name="plus" size={18} /></span></button>
              ))}
            </div>
          </div>}
          <div className="mt-4 space-y-1">
            {addedSongs.length ? addedSongs.map((song) => (
              <div key={song.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-panel">
                <span className="cursor-grab text-muted"><Icon name="grip" /></span><Cover song={song} className="size-12 rounded-lg" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{song.title}</p><p className="text-xs text-muted">{song.artist}</p></div>
                <button onClick={() => setAdded((items) => items.filter((item) => item !== song.id))} className="p-2 text-muted hover:text-red-400"><Icon name="trash" size={18} /></button>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">Tu playlist está vacía. Agrega canciones para comenzar.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}


// ───────────── PLANES (un solo lugar para precios; el admin los edita y se refleja en toda la app) ─────────────
type Plan = { id: string; nombre: string; precio: number; dias: number };
const PLANS_KEY = "nexttune_plans_v1";
const DEFAULT_PLANS: Plan[] = [
  { id: "mensual", nombre: "Premium mensual", precio: 89, dias: 30 },
  { id: "anual", nombre: "Premium anual", precio: 899, dias: 365 },
];
let currentPlans: Plan[] = (() => {
  try { const r = JSON.parse(localStorage.getItem(PLANS_KEY) || "null"); if (Array.isArray(r) && r.length) return r; } catch {}
  return DEFAULT_PLANS;
})();
const planListeners = new Set<() => void>();
const setPlans = (list: Plan[]) => {
  currentPlans = list;
  try { localStorage.setItem(PLANS_KEY, JSON.stringify(list)); } catch {}
  planListeners.forEach((fn) => fn());
};
const loadPlans = () =>
  api<any[]>("/planes")
    .then((rows) => {
      if (!Array.isArray(rows) || !rows.length) return;
      setPlans(rows.map((r, i) => ({
        id: String(r.id ?? r.id_plan ?? DEFAULT_PLANS[i]?.id ?? i),
        nombre: String(r.nombre ?? r.name ?? DEFAULT_PLANS[i]?.nombre ?? "Premium"),
        precio: Number(r.precio ?? r.price ?? 0),
        dias: Number(r.dias ?? r.days ?? 30),
      })));
    })
    .catch(() => {});
function usePlans() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    planListeners.add(fn);
    return () => { planListeners.delete(fn); };
  }, []);
  return currentPlans;
}
// "Gratis" nunca es el plan de pago: antes se tomaba la primera fila de la tabla (que era Gratis)
const isFree = (p: Plan) => /grat/i.test(p.nombre);
const paidPlans = (): Plan[] => { const l = currentPlans.filter((p) => !isFree(p)); return [...(l.length ? l : DEFAULT_PLANS)].sort((a, b) => a.dias - b.dias); };
const mainPlan = () => paidPlans()[0];
let selectedPlanId: string | null = null;
const selectedPlan = () => paidPlans().find((p) => p.id === selectedPlanId) ?? mainPlan();
const planPeriod = (d: number) => (d === 30 ? "mes" : d === 365 ? "año" : `${d} días`);
const money = (n: number) => `$${Number(n).toLocaleString("es-MX")}`;

function Membership({ onPay, premium }: { onPay: () => void; premium: boolean }) {
  usePlans();
  const premiumPlans = paidPlans();
  return (
    <div className="mx-auto max-w-4xl">
      <div className="text-center"><span className="inline-flex rounded-full bg-accent/10 p-3 text-accent"><Icon name="crown" size={27} /></span><h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">Escucha sin límites.</h1><p className="mx-auto mt-3 max-w-xl text-sm text-muted">Lleva tu música contigo, incluso cuando no tengas conexión.</p></div>
      <div className={`mt-9 grid gap-4 ${premiumPlans.length > 1 ? "lg:grid-cols-3" : "md:grid-cols-2"} md:grid-cols-2`}>
        <div className="rounded-3xl border border-line bg-panel p-6"><p className="text-sm font-bold text-muted">GRATIS</p><p className="mt-3 text-3xl font-black text-white">$0</p><p className="text-xs text-muted">para siempre</p><div className="my-6 h-px bg-line" />{["Escucha en línea", "Playlists y favoritas", "Anuncios entre canciones"].map((item) => <p key={item} className="mb-4 flex gap-3 text-sm text-muted"><Icon name="check" size={18} />{item}</p>)}</div>
        {premiumPlans.map((plan, i) => <div key={plan.id} className="relative overflow-hidden rounded-3xl border border-accent/50 bg-gradient-to-br from-accent/15 to-panel p-6 shadow-glow-sm"><span className="absolute right-5 top-5 rounded-full bg-accent px-3 py-1 text-[10px] font-black text-black">{premium ? "PLAN ACTUAL" : i === 0 ? "RECOMENDADO" : plan.dias >= 365 ? "AHORRA MÁS" : "OFERTA"}</span><p className="text-sm font-bold text-accent">{plan.nombre.toUpperCase()}</p><p className="mt-3 text-3xl font-black text-white">{money(plan.precio)} <span className="text-sm font-medium text-muted">MXN / {planPeriod(plan.dias)}</span></p><p className="text-xs text-muted">Cancela cuando quieras</p><div className="my-6 h-px bg-accent/20" />{["Sin anuncios", "Descargas ilimitadas", "Reproducción sin conexión", "Audio de alta calidad"].map((item) => <p key={item} className="mb-4 flex gap-3 text-sm text-white"><span className="text-accent"><Icon name="check" size={18} /></span>{item}</p>)}<Button className="mt-2 w-full" disabled={premium} onClick={() => { selectedPlanId = plan.id; onPay(); }}>{premium ? "Premium activo" : "Obtener " + plan.nombre}</Button></div>)}
      </div>
    </div>
  );
}

function Payment({ onSuccess, onBack, onPay }: { onSuccess: () => void; onBack: () => void; onPay: (method: string, card: string, planId: string) => Promise<{ estado: string; comprobante: string }> }) {
  usePlans();
  const plan = selectedPlan();
  const method = "Tarjeta";
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);
  const [receipt, setReceipt] = useState<{ comprobante: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const card = String(new FormData(event.currentTarget).get("card") || "");
    setBusy(true); setErr("");
    try {
      const r = await onPay(method, card, plan.id);
      setReceipt(r);
      setResult(r.estado === "aprobado" ? "approved" : "rejected");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  if (result) return <div className="mx-auto max-w-lg rounded-3xl border border-line bg-panel p-7 text-center">
    <span className={`mx-auto flex size-16 items-center justify-center rounded-full ${result === "approved" ? "bg-accent text-black shadow-glow" : "bg-red-500/15 text-red-300"}`}><Icon name={result === "approved" ? "check" : "x"} size={30} /></span>
    <p className={`mt-5 text-xs font-black uppercase tracking-widest ${result === "approved" ? "text-accent" : "text-red-300"}`}>{result === "approved" ? "Pago aprobado" : "Pago rechazado"}</p>
    <h1 className="mt-2 text-3xl font-black">{result === "approved" ? "Compra exitosa" : "No pudimos procesar el pago"}</h1>
    <p className="mt-3 text-sm text-muted">{result === "approved" ? "Tu membresía Premium está lista para activarse." : "Verifica los datos o intenta con otro método."}</p>
    {result === "approved" && <div className="mt-6 rounded-2xl bg-canvas p-5 text-left text-xs"><div className="flex justify-between"><span className="text-muted">Comprobante</span><span className="font-bold">{receipt?.comprobante}</span></div><div className="mt-3 flex justify-between"><span className="text-muted">Plan</span><span className="font-bold">{plan.nombre}</span></div><div className="mt-3 flex justify-between"><span className="text-muted">Método</span><span className="font-bold">{method}</span></div><div className="mt-3 flex justify-between"><span className="text-muted">Total</span><span className="font-bold text-accent">{money(plan.precio)} MXN</span></div></div>}
    <Button className="mt-6 w-full" onClick={result === "approved" ? onSuccess : () => setResult(null)}>{result === "approved" ? "Ir a escuchar música" : "Intentar de nuevo"}</Button>
  </div>;
  return (
    <div className="mx-auto max-w-xl">
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-bold text-muted hover:text-white"><Icon name="arrow" size={18} /> Volver</button>
      <h1 className="text-3xl font-black text-white">Finalizar compra</h1><p className="mt-2 text-sm text-muted">Escribe los datos de tu tarjeta para activar tu plan Premium. Tu membresía comienza en cuanto confirmes la compra.</p>
      <form onSubmit={submit} className="mt-6 rounded-3xl border border-line bg-panel p-5 sm:p-7">
        <label className="text-xs font-bold text-muted">Nombre en la tarjeta<input required autoComplete="cc-name" placeholder="Nombre completo" className="mt-2 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label>
        <label className="mt-5 block text-xs font-bold text-muted">Número de tarjeta<input required name="card" autoComplete="cc-number" minLength={16} placeholder="4242 4242 4242 4242" inputMode="numeric" className="mt-2 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label>
        <div className="mt-5 grid grid-cols-2 gap-3"><label className="text-xs font-bold text-muted">Vencimiento<input required autoComplete="cc-exp" placeholder="MM/AA" className="mt-2 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label><label className="text-xs font-bold text-muted">CVV<input required placeholder="000" type="password" className="mt-2 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label></div>
        <div className="my-6 flex justify-between border-y border-line py-4"><span className="text-sm text-muted">{plan.nombre}</span><span className="font-black text-white">{money(plan.precio)} MXN</span></div>
        {err && <p className="mb-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-bold text-red-300">{err}</p>}<Button type="submit" disabled={busy} className="w-full">{busy ? "Procesando..." : "Confirmar compra"}</Button>
      </form>
    </div>
  );
}

type AdminSection = "Resumen" | "Usuarios" | "Roles y permisos" | "Membresías" | "Pagos" | "Catálogo";

function AdminDashboard({ user, avatar, onAvatar, onRename, onLogout, notify: _parentNotify }: { user: User; avatar: string | null; onAvatar: (dataUrl: string) => void; onRename: (name: string) => Promise<void>; onLogout: () => void; notify: (message: string) => void }) {
  const [adminToast, setAdminToast] = useState("");
  const notify = (message: string) => setAdminToast(message);
  useEffect(() => { if (!adminToast) return; const t = setTimeout(() => setAdminToast(""), 3200); return () => clearTimeout(t); }, [adminToast]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.nombre);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenuOpen(false); setEditingName(false); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);
  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try { onAvatar(await resizeImage(file)); notify("Foto actualizada"); } catch (e) { notify((e as Error).message); }
  };
  const submitName = async () => {
    const n = nameDraft.trim();
    if (n.length < 2) { notify("Escribe un nombre válido"); return; }
    try { await onRename(n); setEditingName(false); setMenuOpen(false); notify("Nombre actualizado"); } catch (e) { notify((e as Error).message || "No se pudo guardar el nombre"); }
  };
  const [section, setSection] = useState<AdminSection>("Resumen");
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState("");
  type AdminUser = { id: number; name: string; email: string; phone: string | null; birth: string | null; role: string; membership: string };
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [pagos, setPagos] = useState<string[][]>([]);
  const plans = usePlans();
  const [confirmDel, setConfirmDel] = useState<AdminUser | null>(null);
  const emptyUser = { nombre: "", correo: "", telefono: "", fecha_nacimiento: "", contrasena: "", role: "Usuario normal" };
  const [newUser, setNewUser] = useState<typeof emptyUser | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [songForm, setSongForm] = useState<{ id?: Id; title: string; artist: string; album: string; genre: string; artwork: string; audio: string; audioName: string; duration: number } | null>(null);
  const [, bump] = useState(0);
  const [savingSong, setSavingSong] = useState(false);
  type CatTab = "Canciones" | "Álbumes" | "Artistas" | "Géneros";
  const [catTab, setCatTab] = useState<CatTab>("Canciones");
  const [catQuery, setCatQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const readFile = (file: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(new Error("No se pudo leer el archivo")); r.readAsDataURL(file); });
  // Portada: sirve para archivo, imagen pegada (Ctrl+V / botón) o arrastrada
  const applyCover = async (file: Blob) => {
    if (!file.type.startsWith("image/")) { notify("Eso no es una imagen"); return; }
    if (file.size > 15 * 1024 * 1024) { notify("La imagen pesa más de 15 MB"); return; }
    try {
      const directo = ["image/jpeg", "image/png", "image/webp"].includes(file.type) && file.size <= 1.5 * 1024 * 1024;
      const url = directo ? await readFile(file) : await shrinkImage(file);
      setSongForm((s) => s && { ...s, artwork: url });
      notify("Portada lista");
    } catch (er) { notify((er as Error).message); }
  };
  const pasteCoverButton = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (type) { await applyCover(await item.getType(type)); return; }
      }
      notify("No hay ninguna imagen copiada. Copia una y vuelve a intentar");
    } catch { notify("Presiona Ctrl + V para pegar la imagen"); }
  };
  // Con el formulario abierto, Ctrl+V con una imagen copiada la pone de portada (si pegas texto, funciona normal)
  useEffect(() => {
    if (!songForm) return;
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.kind === "file" && i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      e.preventDefault();
      void applyCover(file);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [!!songForm]);
  const savePlan = async (plan: Plan) => {
    if (!plan.nombre.trim() || !(plan.precio > 0) || !(plan.dias > 0)) { notify("Revisa nombre, precio y días"); return; }
    try { await api(`/admin/planes/${plan.id}`, "PUT", { nombre: plan.nombre.trim(), precio: plan.precio, dias: plan.dias }); } catch (e) { notify(`Guardado local (${(e as Error).message})`); }
    setPlans(currentPlans.map((p) => (p.id === plan.id ? { ...plan, nombre: plan.nombre.trim() } : p)));
    setEditPlan(null);
    notify("Plan actualizado en toda la app");
  };
  const saveSong = async () => {
    if (!songForm) return;
    const f = songForm;
    if (!f.title.trim() || !f.artist.trim()) { notify("Falta el nombre o el artista"); return; }
    if (!f.id && !f.audio) { notify("Sube el archivo de audio"); return; }
    setSavingSong(true);
    try {
      const body = { title: f.title.trim(), artist: f.artist.trim(), album: f.album.trim() || "Sencillo", genre: f.genre.trim() || "Sin género", artwork: f.artwork || undefined, audio: f.audio || undefined, audioName: f.audioName || undefined, duration: f.duration || undefined };
      const saved: any = f.id ? await api(`/admin/canciones/${f.id}`, "PUT", body) : await api("/admin/canciones", "POST", body);
      if (f.id) {
        const s = songs.find((x) => x.id === f.id);
        if (s) Object.assign(s, { title: body.title, artist: body.artist, album: body.album, genre: body.genre, artwork: f.artwork || s.artwork });
      } else {
        addSongs([{ ...(saved || {}), id: saved?.id ?? saved?.id_cancion ?? `new-${Date.now()}`, title: body.title, artist: body.artist, album: body.album, genre: body.genre, artwork: f.artwork || saved?.artwork, file: saved?.file ?? f.audioName, duration: saved?.duration ?? f.duration ?? 0, full: true }]);
      }
      notify(f.id ? "Canción actualizada" : "Canción agregada al catálogo");
      setSongForm(null); bump((n) => n + 1); loadStats();
    } catch (e) { notify((e as Error).message); }
    finally { setSavingSong(false); }
  };
  const removeSong = async (song: Song) => {
    if (!window.confirm(`¿Eliminar "${song.title}" del catálogo?`)) return;
    try { await api(`/admin/canciones/${song.id}`, "DELETE"); } catch (e) { notify((e as Error).message); return; }
    songs = songs.filter((s) => s.id !== song.id); bump((n) => n + 1); loadStats(); notify("Canción eliminada");
  };
  const loadUsers = () => api<AdminUser[]>("/admin/usuarios").then(setUsers).catch((e) => notify(e.message));
  const loadStats = () => api("/admin/resumen").then(setStats).catch(() => {});
  useEffect(() => {
    loadUsers(); loadStats(); loadPlans();
    api<any[]>("/admin/pagos").then((rows) => setPagos(rows.map((r) => [r.nombre, r.monto >= 800 ? "Premium anual" : "Premium mensual", `$${r.monto}`, r.metodo, fmtDate(r.fecha), cap(r.estado)]))).catch(() => {});
  }, []);
  const changeRole = async (id: number, role: string) => { try { await api(`/admin/usuarios/${id}/rol`, "PUT", { role }); notify("Rol actualizado"); } catch (e) { notify((e as Error).message); } loadUsers(); loadStats(); };
  const removeUser = async (id: number) => { try { await api(`/admin/usuarios/${id}`, "DELETE"); notify("Usuario eliminado"); } catch (e) { notify((e as Error).message); } loadUsers(); loadStats(); };
  const createUser = async () => {
    if (!newUser) return;
    const u = newUser;
    if (u.nombre.trim().length < 2) { notify("Escribe el nombre del usuario"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(u.correo.trim())) { notify("Escribe un correo válido"); return; }
    if (u.contrasena.length < 6) { notify("La contraseña debe tener 6 o más caracteres"); return; }
    setSavingUser(true);
    try { await api("/admin/usuarios", "POST", { ...u, nombre: u.nombre.trim(), correo: u.correo.trim() }); notify("Usuario creado"); setNewUser(null); await loadUsers(); loadStats(); }
    catch (e) { notify((e as Error).message); }
    finally { setSavingUser(false); }
  };
  const removeDemo = async () => { setConfirmDemo(false); try { const r: any = await api("/admin/usuarios-demo", "DELETE"); notify(`Se quitaron ${r?.eliminados ?? 0} usuarios de demostración`); } catch (e) { notify((e as Error).message); } loadUsers(); loadStats(); };
  const menu: { label: AdminSection; icon: IconName }[] = [
    { label: "Resumen", icon: "home" }, { label: "Usuarios", icon: "user" }, { label: "Roles y permisos", icon: "device" },
    { label: "Membresías", icon: "crown" }, { label: "Pagos", icon: "library" }, { label: "Catálogo", icon: "lyrics" },
  ];
  const selectSection = (next: AdminSection) => { setSection(next); setDrawer(false); };
  const demoUsers = users.filter((x) => /@ejemplo\.com$/i.test(x.email) && x.role !== "Administrador");
  const nPremium = stats?.premium ?? 0, nAdmin = stats?.admins ?? 0;
  const nGratis = Math.max(0, (stats?.usuarios ?? 0) - nPremium - nAdmin);
  const nTotal = nPremium + nGratis + nAdmin;
  const pPrem = nTotal ? (nPremium / nTotal) * 100 : 0, pGrat = nTotal ? (nGratis / nTotal) * 100 : 0;
  const donut = nTotal ? `conic-gradient(#ff6a00 0 ${pPrem}%, #6b7280 ${pPrem}% ${pPrem + pGrat}%, #f5f5f5 ${pPrem + pGrat}% 100%)` : "conic-gradient(#3f3f46 0 100%)";
  const maxMes = Math.max(1, ...(stats?.meses ?? []).map((x: { count: number }) => x.count));
  const hayMembresias = (stats?.meses ?? []).some((x: { count: number }) => x.count > 0);
  const filteredUsers = users.filter((user) => `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(query.toLowerCase()));
  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const nq = norm(catQuery.trim());
  // Solo canciones del catálogo propio (id numérico); las de Deezer (dz-...) no se pueden editar
  const dbSongs = songs.filter((x) => /^\d+$/.test(String(x.id)));
  const catSongs = dbSongs.filter((s) => !nq || norm(`${s.title} ${s.artist} ${s.album} ${s.genre}`).includes(nq));
  const catGroups = (() => {
    if (catTab === "Canciones") return [] as { key: string; name: string; sub: string; list: Song[] }[];
    const field = catTab === "Álbumes" ? "album" : catTab === "Artistas" ? "artist" : "genre";
    const empty = catTab === "Álbumes" ? "Sencillo" : catTab === "Artistas" ? "Sin artista" : "Sin género";
    const map = new Map<string, Song[]>();
    dbSongs.forEach((s) => { const k = String(s[field] || "").trim() || empty; map.set(k, [...(map.get(k) ?? []), s]); });
    return [...map.entries()]
      .map(([name, list]) => ({ key: name, name, list, sub: catTab === "Álbumes" ? [...new Set(list.map((x) => x.artist))].join(", ") : catTab === "Artistas" ? [...new Set(list.map((x) => x.album))].slice(0, 3).join(" · ") : [...new Set(list.map((x) => x.artist))].slice(0, 3).join(", ") }))
      .filter((g) => !nq || norm(`${g.name} ${g.sub} ${g.list.map((x) => x.title).join(" ")}`).includes(nq))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  })();
  const renderSong = (song: Song) => <div key={song.id} className="flex items-center gap-3 border-b border-line p-3 last:border-0"><Cover song={song} className="size-11 shrink-0 rounded-lg" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{song.title}</p><p className="truncate text-xs text-muted">{song.artist} · {song.album} · {song.genre} · {fmtTime(song.duration)}</p></div><Button variant="ghost" onClick={() => setSongForm({ id: song.id, title: song.title, artist: song.artist, album: song.album, genre: song.genre, artwork: song.artwork || "", audio: "", audioName: "", duration: song.duration })}>Editar</Button><button onClick={() => removeSong(song)} aria-label="Eliminar canción" className="p-2 text-muted hover:text-red-400"><Icon name="trash" size={18} /></button></div>;
  const AdminMenu = () => <>{menu.map((item) => <button key={item.label} onClick={() => selectSection(item.label)} aria-current={section === item.label ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${section === item.label ? "bg-accent-soft text-accent" : "text-muted hover:bg-panel hover:text-white"}`}><Icon name={item.icon} size={19} />{item.label}</button>)}</>;
  return (
    <div className="min-h-screen bg-canvas text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-ink p-5 lg:block">
        <Logo /><p className="mt-8 px-4 text-[10px] font-bold uppercase tracking-widest text-accent">Administración</p><nav aria-label="Administración" className="mt-3 space-y-1"><AdminMenu /></nav>
        <div className="absolute bottom-5 left-5 right-5 space-y-2"><Button variant="ghost" className="w-full" onClick={onLogout}>Cerrar sesión</Button></div>
      </aside>
      {drawer && <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onMouseDown={(event) => event.target === event.currentTarget && setDrawer(false)}><DialogBox onClose={() => setDrawer(false)} label="Menú de administración" className="h-full w-72 bg-ink p-5"><div className="flex items-center justify-between"><Logo /><button onClick={() => setDrawer(false)} aria-label="Cerrar menú"><Icon name="x" /></button></div><nav className="mt-8 space-y-1"><AdminMenu /></nav><Button variant="ghost" className="mt-8 w-full" onClick={onLogout}>Cerrar sesión</Button></DialogBox></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-xl sm:px-8">
          <button onClick={() => setDrawer(true)} aria-label="Abrir menú de administración" className="rounded-xl bg-panel p-3 lg:hidden"><Icon name="library" /></button>
          <div><p className="text-xs text-muted">Panel de control</p><p className="font-black">{section}</p></div>
          <div className="flex items-center gap-3"><A11yLauncher variant="header" /><div ref={menuRef} className="relative">
            <button onClick={() => { setMenuOpen((v) => !v); setEditingName(false); setNameDraft(user.nombre); }} aria-haspopup="menu" aria-expanded={menuOpen} className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 text-left transition hover:bg-panel">
              <Avatar name={user.nombre} foto={avatar} size={40} />
              <span className="hidden sm:block"><span className="block text-xs font-bold">{user.nombre}</span><span className="text-[10px] font-bold text-accent">Administrador</span></span>
              <span className="hidden sm:block"><Icon name="chevron" size={14} /></span>
            </button>
            {menuOpen && <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-line bg-panel p-3 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-line px-1 pb-3"><Avatar name={user.nombre} foto={avatar} size={48} /><div className="min-w-0"><p className="truncate text-sm font-bold">{user.nombre}</p><p className="truncate text-xs text-muted">{user.correo}</p></div></div>
              {editingName ? <div className="mt-3"><input aria-label="Nuevo nombre" autoFocus value={nameDraft} maxLength={60} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void submitName(); if (e.key === "Escape") setEditingName(false); }} className="h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-white outline-none focus:border-accent" /><div className="mt-2 flex gap-2"><Button variant="secondary" className="flex-1 !min-h-9" onClick={() => setEditingName(false)}>Cancelar</Button><Button className="flex-1 !min-h-9" onClick={submitName}>Guardar</Button></div></div> : <div className="mt-2 space-y-1">
                <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white hover:bg-panel-strong"><Icon name="user" size={18} />Cambiar foto<input type="file" accept="image/*" className="hidden" onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.target.value = ""; }} /></label>
                <button role="menuitem" onClick={() => { setNameDraft(user.nombre); setEditingName(true); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-white hover:bg-panel-strong"><Icon name="lyrics" size={18} />Cambiar nombre</button>
                <button role="menuitem" onClick={() => { setMenuOpen(false); onLogout(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-red-300 hover:bg-red-500/10"><Icon name="arrow" size={18} />Cerrar sesión</button>
              </div>}
            </div>}
          </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-8">
          {section === "Resumen" && <div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">{[[String(stats?.usuarios ?? "–"), "Usuarios"], [String(stats?.premium ?? "–"), "Usuarios Premium"], [`$${(stats?.ingresos ?? 0).toLocaleString("es-MX")}`, "Ingresos"], [String(stats?.canciones ?? "–"), "Canciones"], [String(stats?.albumes ?? "–"), "Álbumes"]].map(([value, label]) => <div key={label} className="rounded-2xl border border-line bg-panel p-5"><p className="text-2xl font-black">{value}</p><p className="mt-1 text-xs text-muted">{label}</p></div>)}</div>
            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-line bg-panel p-6"><p className="font-bold">Nuevas membresías</p><p className="text-xs text-muted">Últimos 6 meses</p>
                <div className="mt-6 flex items-end gap-4" style={{ height: 190 }}>{(stats?.meses ?? []).map((mes: { label: string; count: number }, i: number) => <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-white">{mes.count}</span><div className="w-full rounded-t-lg bg-gradient-to-t from-accent to-accent-bright" style={{ height: mes.count ? Math.max(8, Math.round((mes.count / maxMes) * 130)) : 2, opacity: mes.count ? 1 : 0.4 }} /><span className="text-[10px] text-muted">{mes.label}</span></div>)}</div>
                {stats && !hayMembresias && <p className="mt-3 text-center text-xs text-muted">Aún no hay membresías en estos meses.</p>}
              </div>
              <div className="rounded-3xl border border-line bg-panel p-6"><p className="font-bold">Distribución de usuarios</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-8">
                  <div className="relative size-40 rounded-full" style={{ background: donut }}><div className="absolute inset-[1.6rem] flex items-center justify-center rounded-full bg-panel"><div className="text-center"><p className="text-2xl font-black">{nTotal ? Math.round(pPrem) : 0}%</p><p className="text-[10px] text-muted">Premium</p></div></div></div>
                  <div className="space-y-3 text-xs"><p className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: "#ff6a00" }} /> Premium · {nPremium}</p><p className="flex items-center gap-2 text-muted"><span className="size-2.5 rounded-full" style={{ background: "#6b7280" }} /> Gratis · {nGratis}</p><p className="flex items-center gap-2 text-muted"><span className="size-2.5 rounded-full" style={{ background: "#f5f5f5" }} /> Admin · {nAdmin}</p></div>
                </div>
              </div>
            </div>
          </div>}
          {section === "Usuarios" && <div>
            <label className="flex items-center gap-2 rounded-xl border border-line bg-panel px-4"><Icon name="search" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar usuarios..." className="h-12 flex-1 bg-transparent text-sm outline-none" /></label>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-panel">{filteredUsers.length === 0 && <p className="p-6 text-center text-sm text-muted">Sin usuarios.</p>}{filteredUsers.map((user) => <div key={user.id} className="flex items-center justify-between gap-3 border-b border-line p-4 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-bold">{user.name}</p><p className="truncate text-xs text-muted">{user.email}</p></div><span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold ${user.role === "Administrador" ? "bg-white/10 text-white" : user.role === "Usuario Premium" ? "bg-accent/15 text-accent" : "bg-canvas text-muted"}`}>{user.role}</span></div>)}</div>
          </div>}
          {section === "Roles y permisos" && <div>
            <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-line bg-panel px-4"><Icon name="search" size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar usuarios..." className="h-12 flex-1 bg-transparent text-sm outline-none" /></label><Button onClick={() => setNewUser({ ...emptyUser })}><Icon name="plus" size={17} /> Crear usuario</Button></div>
            {demoUsers.length > 0 && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4"><p className="text-xs text-muted">Hay <span className="font-bold text-white">{demoUsers.length}</span> usuarios de demostración (correos @ejemplo.com).</p><Button variant="secondary" onClick={() => setConfirmDemo(true)}>Quitar demostración</Button></div>}
            <div className="mt-5 grid gap-3 md:grid-cols-3">{[["Usuario normal", "Escuchar, buscar, favoritas, playlists"], ["Usuario Premium", "Todo lo anterior, descargas y modo sin conexión"], ["Administrador", "Gestionar usuarios, pagos, roles y catálogo"]].map(([role, permission]) => <div key={role} className="rounded-2xl border border-line bg-panel p-5"><p className="font-bold text-accent">{role}</p><p className="mt-2 text-xs leading-relaxed text-muted">{permission}</p></div>)}</div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-panel">{filteredUsers.length === 0 && <p className="p-6 text-center text-sm text-muted">Sin usuarios.</p>}{filteredUsers.map((user) => <div key={user.id} className="grid gap-3 border-b border-line p-4 last:border-0 md:grid-cols-[1.3fr_1fr_1fr_auto] md:items-center"><div className="min-w-0"><p className="truncate text-sm font-bold">{user.name}</p><p className="truncate text-xs text-muted">{user.email}</p></div><select aria-label={`Rol de ${user.name}`} value={user.role} onChange={(e) => changeRole(user.id, e.target.value)} className="rounded-xl border border-line bg-canvas px-3 py-2 text-xs outline-none"><option>Administrador</option><option>Usuario normal</option><option>Usuario Premium</option></select><span className={`w-fit rounded-full px-3 py-1 text-[10px] font-bold ${user.membership === "Activa" ? "bg-accent/15 text-accent" : "bg-canvas text-muted"}`}>{user.membership}</span><button onClick={() => setConfirmDel(user)} aria-label="Eliminar usuario" className="justify-self-end p-2 text-muted hover:text-red-400"><Icon name="trash" size={18} /></button></div>)}</div>
          </div>}
          {section === "Membresías" && <div className="grid gap-4 md:grid-cols-2">{plans.map((plan) => <div key={plan.id} className="rounded-3xl border border-line bg-panel p-6"><div className="flex justify-between"><Icon name="crown" />{!isFree(plan) && <button onClick={() => setEditPlan({ ...plan })} aria-label="Editar plan" className="text-muted hover:text-white"><Icon name="more" /></button>}</div><p className="mt-5 text-xl font-black">{plan.nombre}</p><p className="mt-1 text-accent">{isFree(plan) ? "$0" : money(plan.precio)} MXN</p><p className="text-xs text-muted">{isFree(plan) ? "Plan base · sin vencimiento" : `${plan.dias} días`}</p>{isFree(plan) ? <p className="mt-5 text-xs text-muted">Este plan no se edita.</p> : <Button variant="secondary" className="mt-5" onClick={() => setEditPlan({ ...plan })}>Editar plan</Button>}</div>)}</div>}
          {section === "Pagos" && <div className="overflow-hidden rounded-2xl border border-line bg-panel">{pagos.map((row, n) => <div key={n} className="grid gap-2 border-b border-line p-4 text-xs last:border-0 sm:grid-cols-3 lg:grid-cols-6">{row.map((cell, i) => <span key={i} className={i === 5 ? cell === "Aprobado" ? "font-bold text-emerald-400" : cell === "Rechazado" ? "font-bold text-red-400" : "font-bold text-accent" : i === 0 ? "font-bold text-white" : "text-muted"}>{cell}</span>)}</div>)}</div>}
          {section === "Catálogo" && <div>
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="scrollbar-none flex gap-2 overflow-x-auto">{(["Canciones", "Álbumes", "Artistas", "Géneros"] as CatTab[]).map((item) => <Chip key={item} label={item} active={catTab === item} onClick={() => { setCatTab(item); setOpenGroup(null); setCatQuery(""); }} />)}</div><Button onClick={() => setSongForm({ title: "", artist: "", album: "", genre: "", artwork: "", audio: "", audioName: "", duration: 0 })}><Icon name="plus" size={17} /> Agregar canción</Button></div>
            <label className="mt-5 flex items-center gap-2 rounded-xl border border-line bg-panel px-4"><Icon name="search" size={18} /><input value={catQuery} onChange={(e) => setCatQuery(e.target.value)} placeholder={catTab === "Canciones" ? "Buscar por canción, artista, álbum o género..." : `Buscar ${catTab.toLowerCase()}...`} className="h-12 flex-1 bg-transparent text-sm outline-none" />{catQuery && <button onClick={() => setCatQuery("")} aria-label="Limpiar búsqueda" className="text-muted hover:text-white"><Icon name="x" size={16} /></button>}</label>
            <p className="mt-3 text-xs text-muted">{catTab === "Canciones" ? `${catSongs.length} de ${dbSongs.length} canciones` : `${catGroups.length} ${catTab.toLowerCase()}`}</p>
            {catTab === "Canciones" ? <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-panel">{catSongs.length === 0 && <p className="p-6 text-center text-sm text-muted">{dbSongs.length === 0 ? "Aún no hay canciones." : "Sin resultados para tu búsqueda."}</p>}{catSongs.map(renderSong)}</div>
            : <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-panel">{catGroups.length === 0 && <p className="p-6 text-center text-sm text-muted">{dbSongs.length === 0 ? "Aún no hay canciones." : "Sin resultados para tu búsqueda."}</p>}{catGroups.map((g) => <div key={g.key} className="border-b border-line last:border-0">
              <button onClick={() => setOpenGroup(openGroup === g.key ? null : g.key)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-panel-strong"><Cover song={g.list[0]} className="size-11 shrink-0 rounded-lg" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{g.name}</p><p className="truncate text-xs text-muted">{g.sub}</p></div><span className="shrink-0 text-xs font-bold text-accent">{g.list.length} {g.list.length === 1 ? "canción" : "canciones"}</span><span className={`shrink-0 text-muted transition ${openGroup === g.key ? "rotate-90" : ""}`}><Icon name="chevron" size={16} /></span></button>
              {openGroup === g.key && <div className="border-t border-line bg-canvas/40"><div className="flex items-center justify-between gap-3 border-b border-line p-3"><p className="truncate text-xs text-muted">Agregar una canción a <span className="font-bold text-white">{g.name}</span></p><Button variant="secondary" className="shrink-0 !min-h-9" onClick={() => setSongForm({ title: "", artist: catTab === "Artistas" ? g.name : catTab === "Álbumes" ? g.list[0]?.artist ?? "" : "", album: catTab === "Álbumes" && g.name !== "Sencillo" ? g.name : "", genre: catTab === "Géneros" && g.name !== "Sin género" ? g.name : catTab === "Álbumes" ? g.list[0]?.genre ?? "" : "", artwork: "", audio: "", audioName: "", duration: 0 })}><Icon name="plus" size={16} /> Agregar canción</Button></div>{g.list.map(renderSong)}</div>}
            </div>)}</div>}
          </div>}
        </main>
      </div>
      {confirmDel && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && setConfirmDel(null)}>
        <DialogBox onClose={() => setConfirmDel(null)} label="Confirmar eliminación de usuario" className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-red-500/15 text-red-300"><Icon name="trash" size={26} /></span>
          <h2 className="mt-4 text-xl font-black">¿Estás seguro?</h2>
          <p className="mt-2 text-sm text-muted">Vas a eliminar al usuario <span className="font-bold text-white">{confirmDel.name}</span> ({confirmDel.email}). Esta acción no se puede deshacer.</p>
          <div className="mt-6 flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setConfirmDel(null)}>Cancelar</Button><Button className="flex-1 !bg-red-500 !text-white" onClick={async () => { const id = confirmDel.id; setConfirmDel(null); await removeUser(id); }}>Sí, eliminar</Button></div>
        </DialogBox>
      </div>}
      {editPlan && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && setEditPlan(null)}>
        <DialogBox onClose={() => setEditPlan(null)} label="Editar plan" className="w-full max-w-md rounded-3xl border border-line bg-panel p-6">
          <h2 className="text-xl font-black">Editar plan</h2><p className="mt-1 text-xs text-muted">Los cambios se aplican en Membresía, pago y anuncios.</p>
          <label className="mt-5 block text-xs font-bold text-muted">Nombre<input value={editPlan.nombre} onChange={(e) => setEditPlan({ ...editPlan, nombre: e.target.value })} className="mt-1 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-muted">Precio (MXN)<input type="number" min={1} value={editPlan.precio || ""} onChange={(e) => setEditPlan({ ...editPlan, precio: Number(e.target.value) })} className="mt-1 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label>
            <label className="text-xs font-bold text-muted">Duración (días)<input type="number" min={1} value={editPlan.dias || ""} onChange={(e) => setEditPlan({ ...editPlan, dias: Number(e.target.value) })} className="mt-1 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label>
          </div>
          <div className="mt-6 flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setEditPlan(null)}>Cancelar</Button><Button className="flex-1" onClick={() => savePlan(editPlan)}>Guardar</Button></div>
        </DialogBox>
      </div>}
      {newUser && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && setNewUser(null)}>
        <DialogBox onClose={() => setNewUser(null)} label="Crear usuario" className="my-auto w-full max-w-md rounded-3xl border border-line bg-panel p-6">
          <h2 className="text-xl font-black">Crear usuario</h2><p className="mt-1 text-xs text-muted">Se crea con el correo y la contraseña que escribas aquí.</p>
          {([["Nombre completo", "nombre", "text"], ["Correo electrónico", "correo", "email"], ["Teléfono (opcional)", "telefono", "tel"], ["Fecha de nacimiento (opcional)", "fecha_nacimiento", "date"], ["Contraseña (6+ caracteres)", "contrasena", "password"]] as [string, keyof typeof emptyUser, string][]).map(([label, key, type]) => <label key={key} className="mt-4 block text-xs font-bold text-muted">{label}<input type={type} value={newUser[key]} onChange={(e) => setNewUser({ ...newUser, [key]: e.target.value })} autoComplete="off" className="mt-1 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label>)}
          <label className="mt-4 block text-xs font-bold text-muted">Rol<select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="mt-1 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent"><option>Usuario normal</option><option>Usuario Premium</option><option>Administrador</option></select></label>
          <div className="mt-6 flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setNewUser(null)}>Cancelar</Button><Button className="flex-1" disabled={savingUser} onClick={createUser}>{savingUser ? "Creando..." : "Crear usuario"}</Button></div>
        </DialogBox>
      </div>}
      {confirmDemo && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && setConfirmDemo(false)}>
        <DialogBox onClose={() => setConfirmDemo(false)} label="Quitar usuarios de demostración" className="w-full max-w-sm rounded-3xl border border-line bg-panel p-6 text-center">
          <h2 className="text-xl font-black">¿Quitar demostración?</h2>
          <p className="mt-2 text-sm text-muted">Se eliminarán {demoUsers.length} usuarios con correo @ejemplo.com. No se tocan los administradores. Esta acción no se puede deshacer.</p>
          <div className="mt-6 flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setConfirmDemo(false)}>Cancelar</Button><Button className="flex-1 !bg-red-500 !text-white" onClick={removeDemo}>Sí, quitar</Button></div>
        </DialogBox>
      </div>}
      {songForm && <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && setSongForm(null)}>
        <DialogBox onClose={() => setSongForm(null)} label={songForm.id ? "Editar canción" : "Agregar canción"} className="my-auto w-full max-w-lg rounded-3xl border border-line bg-panel p-6">
          <h2 className="text-xl font-black">{songForm.id ? "Editar canción" : "Agregar canción"}</h2>
          <div className="mt-5 flex items-center gap-4">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void applyCover(f); }}
              className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#ff6a00] via-[#783400] to-black"
            >
              {songForm.artwork ? <img src={songForm.artwork} alt="Vista previa de la portada" className="absolute inset-0 h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-white/70"><Icon name="library" size={30} /></span>}
            </div>
            <div className="flex min-w-0 flex-col items-start gap-2">
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-full bg-panel-strong px-4 py-2 text-xs font-bold hover:bg-line">Subir portada<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) await applyCover(f); }} /></label>
                <button type="button" onClick={pasteCoverButton} className="rounded-full bg-accent px-4 py-2 text-xs font-black text-black">Pegar imagen</button>
              </div>
              <p className="text-[11px] text-muted">Copia una imagen y pégala aquí con el botón o con Ctrl + V. También puedes arrastrarla sobre la vista previa.</p>
            </div>
          </div>
          {[["Nombre de la canción", "title"], ["Artista", "artist"], ["Álbum (opcional)", "album"], ["Género (opcional)", "genre"]].map(([label, key]) => <label key={key} className="mt-4 block text-xs font-bold text-muted">{label}<input value={(songForm as any)[key]} onChange={(e) => setSongForm({ ...songForm, [key]: e.target.value })} className="mt-1 h-12 w-full rounded-xl border border-line bg-canvas px-4 text-sm text-white outline-none focus:border-accent" /></label>)}
          <label className="mt-4 block text-xs font-bold text-muted">Archivo de audio {songForm.id && "(opcional: solo si quieres reemplazarlo)"}
            <input type="file" accept="audio/*" className="mt-1 block w-full text-xs text-muted file:mr-3 file:rounded-full file:border-0 file:bg-panel-strong file:px-4 file:py-2 file:text-xs file:font-bold file:text-white" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 25 * 1024 * 1024) { notify("El audio pesa más de 25 MB"); return; } try { const url = await readFile(f); const dur = await new Promise<number>((res) => { const a = new Audio(); a.preload = "metadata"; a.onloadedmetadata = () => res(Math.round(a.duration || 0)); a.onerror = () => res(0); a.src = url; }); setSongForm((s) => s && { ...s, audio: url, audioName: f.name, duration: dur || s.duration }); } catch (er) { notify((er as Error).message); } }} />
            {songForm.audioName && <span className="mt-1 block text-[11px] text-accent">{songForm.audioName}</span>}
          </label>
          <div className="mt-6 flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setSongForm(null)}>Cancelar</Button><Button className="flex-1" disabled={savingSong} onClick={saveSong}>{savingSong ? "Guardando..." : "Guardar"}</Button></div>
        </DialogBox>
      </div>}
      {adminToast ? <Toast message={adminToast} /> : <div aria-hidden="true" className="pointer-events-none fixed left-1/2 top-2 z-[60] hidden -translate-x-1/2 items-center gap-1.5 rounded-full border border-line bg-panel/70 px-3 py-1 text-[10px] font-semibold text-muted opacity-60 sm:flex"><span className="size-1.5 rounded-full bg-accent" />Modo administrador</div>}
    </div>
  );
}

// Mascota de la pantalla de acceso: gatita bailando con audífonos (varios pasos), notas flotando y ecualizador
function MusicMascot() {
  return (
    <div aria-hidden="true" className="mc-wrap relative mb-6 mt-10 flex select-none justify-center">
      <style>{`
        .mc-wrap{display:flex}
        @media (max-height:400px){.mc-wrap{display:none}}
        @media (max-height:780px){.nt-hero{font-size:2.6rem;line-height:1.1}.mc-wrap{margin:1.6rem 0 .8rem}}
        /* Coreografía de 2.4 s: rebote, paso a la izquierda, paso a la derecha y salto con manos arriba */
        .mc-bob{transform-origin:100px 172px;animation:mc-dance 2.4s ease-in-out infinite}
        @keyframes mc-dance{
          0%{transform:translate(0,0) rotate(-4deg) scale(1,1)}
          12.5%{transform:translate(0,-12px) rotate(4deg) scale(.98,1.03)}
          25%{transform:translate(0,0) rotate(-4deg) scale(1.03,.96)}
          37.5%{transform:translate(-16px,-12px) rotate(-11deg) scale(.98,1.03)}
          50%{transform:translate(-16px,0) rotate(6deg) scale(1.03,.96)}
          62.5%{transform:translate(16px,-12px) rotate(11deg) scale(.98,1.03)}
          75%{transform:translate(16px,0) rotate(-6deg) scale(1.03,.96)}
          87.5%{transform:translate(0,-26px) rotate(0deg) scale(.96,1.06)}
          100%{transform:translate(0,0) rotate(-4deg) scale(1.04,.95)}
        }
        .mc-armL{transform-origin:58px 140px;animation:mc-armL 2.4s ease-in-out infinite}
        .mc-armR{transform-origin:142px 140px;animation:mc-armR 2.4s ease-in-out infinite}
        @keyframes mc-armL{0%{transform:rotate(-20deg)}12.5%{transform:rotate(60deg)}25%{transform:rotate(-20deg)}37.5%{transform:rotate(60deg)}50%{transform:rotate(-20deg)}62.5%{transform:rotate(60deg)}75%{transform:rotate(-20deg)}87.5%{transform:rotate(88deg)}100%{transform:rotate(-20deg)}}
        @keyframes mc-armR{0%{transform:rotate(-60deg)}12.5%{transform:rotate(20deg)}25%{transform:rotate(-60deg)}37.5%{transform:rotate(20deg)}50%{transform:rotate(-60deg)}62.5%{transform:rotate(20deg)}75%{transform:rotate(-60deg)}87.5%{transform:rotate(-88deg)}100%{transform:rotate(-60deg)}}
        .mc-footL,.mc-footR{transform-box:fill-box;transform-origin:50% 100%}
        .mc-footL{animation:mc-foot .6s ease-in-out infinite alternate}
        .mc-footR{animation:mc-foot .6s ease-in-out infinite alternate-reverse}
        @keyframes mc-foot{from{transform:translateY(0) rotate(-8deg)}to{transform:translateY(-7px) rotate(8deg)}}
        .mc-tail{transform-origin:138px 160px;animation:mc-tail .6s ease-in-out infinite alternate}
        @keyframes mc-tail{from{transform:rotate(-14deg)}to{transform:rotate(16deg)}}
        .mc-earL,.mc-earR{transform-box:fill-box;transform-origin:50% 100%;animation:mc-ear 1.2s ease-in-out infinite alternate}
        .mc-earR{animation-direction:alternate-reverse}
        @keyframes mc-ear{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
        .mc-mouth{transform-box:fill-box;transform-origin:50% 0;animation:mc-mouth .3s ease-in-out infinite alternate}
        @keyframes mc-mouth{from{transform:scaleY(.55)}to{transform:scaleY(1.05)}}
        .mc-shadow{transform-box:fill-box;transform-origin:center;animation:mc-shadow 2.4s ease-in-out infinite}
        @keyframes mc-shadow{0%,25%,50%,75%,100%{transform:translateX(0) scaleX(1);opacity:.35}12.5%{transform:translateX(0) scaleX(.85);opacity:.25}37.5%{transform:translateX(-16px) scaleX(.85);opacity:.25}62.5%{transform:translateX(16px) scaleX(.85);opacity:.25}87.5%{transform:translateX(0) scaleX(.6);opacity:.15}}
        .mc-eq{transform-box:fill-box;transform-origin:50% 100%;animation:mc-eq 1s ease-in-out infinite alternate}
        @keyframes mc-eq{from{transform:scaleY(.18)}to{transform:scaleY(1)}}
        .mc-note{animation:mc-note 3.2s ease-in infinite;opacity:0}
        @keyframes mc-note{0%{transform:translateY(10px) rotate(-8deg);opacity:0}25%{opacity:1}100%{transform:translateY(-34px) rotate(10deg);opacity:0}}
        @media (prefers-reduced-motion:reduce){.mc-bob,.mc-armL,.mc-armR,.mc-footL,.mc-footR,.mc-tail,.mc-earL,.mc-earR,.mc-mouth,.mc-shadow,.mc-eq,.mc-note{animation:none}.mc-note{opacity:.7}.mc-eq{transform:scaleY(.6)}}
      `}</style>
      <svg viewBox="0 40 340 150" width="340" height="150" className="block overflow-visible" style={{ width: "clamp(190px, 38vh, 340px)", height: "auto", aspectRatio: "340 / 150" }} role="presentation">
        <defs>
          <radialGradient id="mcBody" cx="40%" cy="30%" r="80%"><stop offset="0" stopColor="#ffb06a" /><stop offset=".55" stopColor="#ff6a00" /><stop offset="1" stopColor="#c24500" /></radialGradient>
          <linearGradient id="mcBar" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff6a00" /><stop offset="1" stopColor="#ffb06a" /></linearGradient>
        </defs>
        <ellipse className="mc-shadow" cx="100" cy="182" rx="46" ry="5" fill="#000" />
        <g className="mc-bob">
          <path className="mc-tail" d="M138 160 C170 165 182 140 172 118" stroke="#ff6a00" strokeWidth="9" strokeLinecap="round" fill="none" />
          <ellipse className="mc-footL" cx="82" cy="170" rx="15" ry="7" fill="#b84300" />
          <ellipse className="mc-footR" cx="118" cy="170" rx="15" ry="7" fill="#b84300" />
          <g stroke="#ff6a00" strokeWidth="10" strokeLinecap="round">
            <g className="mc-armL"><path d="M58 140 L34 152" fill="none" /><circle cx="30" cy="154" r="7" fill="#ff8a2b" stroke="none" /></g>
            <g className="mc-armR"><path d="M142 140 L166 152" fill="none" /><circle cx="170" cy="154" r="7" fill="#ff8a2b" stroke="none" /></g>
          </g>
          <g className="mc-earL"><path d="M60 94 L66 60 L90 78 Z" fill="#ff6a00" /><path d="M67 84 L69 70 L81 79 Z" fill="#ffb3a0" /></g>
          <g className="mc-earR"><path d="M140 94 L134 60 L110 78 Z" fill="#ff6a00" /><path d="M133 84 L131 70 L119 79 Z" fill="#ffb3a0" /></g>
          <ellipse cx="100" cy="118" rx="50" ry="47" fill="url(#mcBody)" />
          <ellipse cx="100" cy="134" rx="30" ry="22" fill="#ffd2a8" opacity=".35" />
          <path d="M80 114 Q88 105 96 114" stroke="#2a1000" strokeWidth="4" strokeLinecap="round" fill="none" />
          <path d="M104 114 Q112 105 120 114" stroke="#2a1000" strokeWidth="4" strokeLinecap="round" fill="none" />
          <circle cx="76" cy="126" r="5.5" fill="#ff7a6a" opacity=".6" /><circle cx="124" cy="126" r="5.5" fill="#ff7a6a" opacity=".6" />
          <path className="mc-mouth" d="M91 126 Q100 139 109 126 Z" fill="#7a1f00" />
          <path d="M55 112 C55 56 145 56 145 112" stroke="#151515" strokeWidth="8" strokeLinecap="round" fill="none" />
          <rect x="44" y="100" width="17" height="32" rx="8" fill="#151515" stroke="#ff9a3d" strokeWidth="2.5" />
          <rect x="139" y="100" width="17" height="32" rx="8" fill="#151515" stroke="#ff9a3d" strokeWidth="2.5" />
        </g>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} className="mc-eq" x={208 + i * 17} y="100" width="10" height="72" rx="5" fill="url(#mcBar)" style={{ animationDuration: `${0.55 + (i * 37) % 6 / 10}s`, animationDelay: `${-i * 0.17}s`, opacity: 0.55 + (i % 3) * 0.2 }} />)}
        <g fill="#ff9a3d" fontSize="24" fontWeight="900">
          <text className="mc-note" x="212" y="92" style={{ animationDelay: "0s" }}>♪</text>
          <text className="mc-note" x="262" y="84" style={{ animationDelay: "-1.1s" }}>♫</text>
          <text className="mc-note" x="300" y="94" style={{ animationDelay: "-2.2s" }}>♪</text>
          <text className="mc-note" x="168" y="70" style={{ animationDelay: "-1.6s" }}>♫</text>
          <text className="mc-note" x="20" y="74" style={{ animationDelay: "-0.6s" }}>♪</text>
        </g>
      </svg>
    </div>
  );
}

// Fondo animado de la pantalla de acceso: resplandores naranjas y líneas diagonales con destellos que cruzan en una misma dirección
function LoginBackdrop() {
  const lines = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const r = (n: number) => { const x = Math.sin((i + 1) * 997 + n * 131) * 10000; return x - Math.floor(x); };
    return { top: r(1) * 100, left: -10 + r(2) * 90, len: 140 + r(3) * 320, thick: r(4) > 0.8 ? 3 : r(4) > 0.45 ? 2 : 1, delay: -r(5) * 20, dur: 6 + r(6) * 9, op: 0.35 + r(7) * 0.65 };
  }), []);
  const sparks = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const r = (n: number) => { const x = Math.sin((i + 1) * 577 + n * 211) * 10000; return x - Math.floor(x); };
    return { left: r(1) * 100, top: r(2) * 100, size: 2 + r(3) * 3.5, delay: -r(4) * 6, dur: 2.5 + r(5) * 3.5 };
  }), []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-ink">
      <style>{`
        .nt-glow{position:absolute;border-radius:9999px;filter:blur(90px);opacity:.45;animation:nt-float 18s ease-in-out infinite alternate}
        .nt-glow-a{width:46vmax;height:46vmax;left:-12vmax;top:-14vmax;background:radial-gradient(circle,#ff6a00 0%,transparent 65%)}
        .nt-glow-b{width:40vmax;height:40vmax;right:-10vmax;bottom:-14vmax;background:radial-gradient(circle,#ff8a1f 0%,transparent 65%);animation-duration:22s;animation-delay:-6s}
        @keyframes nt-float{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(6vmax,4vmax,0) scale(1.18)}}
        .nt-lines{position:absolute;left:-50%;top:-50%;width:200%;height:200%;transform:rotate(-28deg)}
        .nt-line{position:absolute;border-radius:9999px;opacity:0;background:linear-gradient(90deg,rgba(255,106,0,0) 0%,rgba(255,106,0,.55) 65%,#ffd9b0 100%);animation:nt-streak linear infinite}
        .nt-line::after{content:"";position:absolute;right:-2px;top:50%;width:7px;height:7px;margin-top:-3.5px;border-radius:9999px;background:#fff4e6;box-shadow:0 0 10px 3px rgba(255,160,70,.95),0 0 22px 6px rgba(255,106,0,.6)}
        @keyframes nt-streak{0%{transform:translate3d(0,0,0);opacity:0}12%{opacity:var(--o)}85%{opacity:var(--o)}100%{transform:translate3d(95vmax,0,0);opacity:0}}
        .nt-spark{position:absolute;border-radius:9999px;background:#ffb066;box-shadow:0 0 8px 2px rgba(255,140,40,.8);opacity:0;animation:nt-twinkle ease-in-out infinite}
        @keyframes nt-twinkle{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1)}}
        @media (prefers-reduced-motion:reduce){.nt-glow,.nt-line,.nt-spark{animation:none}.nt-line{opacity:.35}.nt-spark{opacity:.6}}
      `}</style>
      <div className="nt-glow nt-glow-a" /><div className="nt-glow nt-glow-b" />
      <div className="nt-lines">
        {lines.map((l, i) => <span key={`l${i}`} className="nt-line" style={{ top: `${l.top}%`, left: `${l.left}%`, width: l.len, height: l.thick, animationDuration: `${l.dur}s`, animationDelay: `${l.delay}s`, ["--o" as any]: l.op }} />)}
      </div>
      {sparks.map((d, i) => <span key={`s${i}`} className="nt-spark" style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }} />)}
    </div>
  );
}

function AccessFlow({ onAccess }: { onAccess: (session: Session) => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recoverStep, setRecoverStep] = useState<1 | 2 | 3>(1);
  const [recEmail, setRecEmail] = useState("");
  const [recCode, setRecCode] = useState("");
  const [busy, setBusy] = useState(false);
  const doLogin = async (mail: string, pass: string) => {
    setError("");
    try {
      await onAccess(await api<Session>("/login", "POST", { correo: mail, contrasena: pass }));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const login = (event: FormEvent) => { event.preventDefault(); void doLogin(email, password); };
  const register = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirm")) {
      setError("Las contraseñas no coinciden");
      return;
    }
    try {
      await api("/registro", "POST", { nombre: data.get("name"), correo: data.get("email"), telefono: data.get("phone"), fecha_nacimiento: data.get("birth"), contrasena: data.get("password") });
    } catch (e) { setError((e as Error).message); return; }
    setMessage("Registro exitoso. Tu cuenta se creó con el Plan Gratis.");
    setError("");
    window.setTimeout(() => { setMode("login"); setEmail(String(data.get("email"))); setPassword(""); }, 900);
  };

  const resetRecover = () => { setRecoverStep(1); setRecEmail(""); setRecCode(""); setMessage(""); setError(""); };

  const recover = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    setBusy(true);
    try {
      if (recoverStep === 1) {
        const mail = String(data.get("email") || "").trim();
        await api("/recuperar", "POST", { correo: mail });
        setRecEmail(mail);
        setMessage("Si el correo está registrado, te enviamos un código de 6 dígitos. Revisa tu bandeja y el spam.");
        setRecoverStep(2);
      } else if (recoverStep === 2) {
        const code = String(data.get("codigo") || "").trim();
        await api("/recuperar/verificar", "POST", { correo: recEmail, codigo: code });
        setRecCode(code);
        setMessage("Código verificado. Ahora crea tu nueva contraseña.");
        setRecoverStep(3);
      } else {
        if (data.get("newpass") !== data.get("confirm2")) { setError("Las contraseñas no coinciden"); return; }
        await api("/recuperar/validar", "POST", { correo: recEmail, codigo: recCode, contrasena: data.get("newpass") });
        setMessage("¡Contraseña actualizada! Te llevamos al inicio de sesión.");
        const mail = recEmail;
        window.setTimeout(() => {
          resetRecover();
          setMode("login");
          setEmail(mail);
          setPassword("");
        }, 1400);
      }
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const switchMode = (next: "login" | "register" | "recover") => { setMode(next); setError(""); setMessage(""); if (next === "recover") resetRecover(); };

  const recoverTitle = recoverStep === 1 ? "Recupera tu contraseña" : recoverStep === 2 ? "Escribe tu código" : "Crea una nueva contraseña";
  const recoverSubtitle = recoverStep === 1 ? "Te enviaremos un código de 6 dígitos a tu correo." : recoverStep === 2 ? `Enviamos un código a ${recEmail}.` : "Usa al menos 6 caracteres.";
  const recoverButton = recoverStep === 1 ? "Enviar código" : recoverStep === 2 ? "Verificar código" : "Guardar contraseña";

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink px-4 py-7 text-white sm:px-7">
      <LoginBackdrop />
      <div className="relative z-10 mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-6xl overflow-hidden rounded-3xl border border-line bg-canvas/80 backdrop-blur-md lg:grid-cols-[1.05fr_.95fr]">
        <div className="on-dark relative hidden overflow-hidden bg-gradient-to-br from-[#3b1900] via-panel to-ink p-10 lg:flex lg:flex-col">
          <div className="absolute -right-24 top-24 size-80 rounded-full bg-accent/20 blur-3xl" />
          <Logo />
          <div className="relative my-auto max-w-lg pt-6"><p className="text-xs font-black uppercase tracking-[.25em] text-accent">Música sin límites</p><h1 className="nt-hero mt-5 text-5xl font-black leading-tight">Todo lo que quieres escuchar, <span className="text-accent">en un solo lugar.</span></h1><MusicMascot /><p className="leading-relaxed text-muted">Descubre nuevos sonidos, crea playlists y lleva tus canciones contigo.</p></div>
        </div>
        <div className="flex items-center justify-center p-5 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden"><Logo /></div>
            {mode === "login" && <form onSubmit={login}>
              <p className="text-xs font-black uppercase tracking-widest text-accent">Bienvenido</p><h1 className="mt-2 text-3xl font-black">Inicia sesión</h1><p className="mt-2 text-sm text-muted">Continúa escuchando donde lo dejaste.</p>
              <label className="mt-7 block text-xs font-bold text-muted">Correo electrónico<input required type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} className="auth-input" placeholder="tu@correo.com" /></label>
              <label className="mt-4 block text-xs font-bold text-muted">Contraseña<input required type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} className="auth-input" placeholder="Tu contraseña" /></label>
              {error && <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</p>}
              <button type="button" onClick={() => switchMode("recover")} className="mt-3 text-xs font-bold text-accent">¿Olvidaste tu contraseña?</button>
              <Button type="submit" className="mt-5 w-full">Iniciar sesión</Button>
              <p className="mt-6 text-center text-xs text-muted">¿Aún no tienes cuenta? <button type="button" onClick={() => switchMode("register")} className="font-bold text-accent">Regístrate</button></p>
            </form>}
            {mode === "register" && <form onSubmit={register}>
              <button type="button" onClick={() => switchMode("login")} className="mb-5 flex items-center gap-2 text-xs font-bold text-muted"><Icon name="arrow" size={16} /> Volver</button><h1 className="text-3xl font-black">Crea tu cuenta</h1><p className="mt-2 text-sm text-muted">Comenzarás con el Plan Gratis.</p>
              <input required name="name" autoComplete="name" aria-label="Nombre completo" placeholder="Nombre completo" className="auth-input" /><input required name="email" type="email" autoComplete="email" aria-label="Correo electrónico" placeholder="Correo electrónico" className="auth-input" /><input required name="phone" inputMode="tel" autoComplete="tel" aria-label="Teléfono" placeholder="Teléfono" className="auth-input" /><input required name="birth" type="date" autoComplete="bday" aria-label="Fecha de nacimiento" className="auth-input" /><input required name="password" minLength={6} type="password" autoComplete="new-password" aria-label="Contraseña" placeholder="Contraseña" className="auth-input" /><input required name="confirm" minLength={6} type="password" autoComplete="new-password" aria-label="Confirmar contraseña" placeholder="Confirmar contraseña" className="auth-input" />
              {error && <p role="alert" className="mt-3 text-xs font-bold text-red-300">{error}</p>}{message && <p role="status" className="mt-3 rounded-xl bg-accent/10 p-3 text-xs font-bold text-accent">{message}</p>}<Button type="submit" className="mt-5 w-full">Crear cuenta</Button>
            </form>}
            {mode === "recover" && <form onSubmit={recover}>
              <button type="button" onClick={() => (recoverStep === 1 ? switchMode("login") : recoverStep === 2 ? resetRecover() : setRecoverStep(2))} className="mb-5 flex items-center gap-2 text-xs font-bold text-muted"><Icon name="arrow" size={16} /> Volver</button>
              <div className="mb-4 flex gap-2">{[1, 2, 3].map((n) => <span key={n} className={`h-1 flex-1 rounded-full ${n <= recoverStep ? "bg-accent" : "bg-line"}`} />)}</div>
              <h1 className="text-3xl font-black">{recoverTitle}</h1><p className="mt-2 text-sm text-muted">{recoverSubtitle}</p>
              {recoverStep === 1 && <input key="s1" required name="email" type="email" autoComplete="email" aria-label="Correo electrónico" placeholder="Correo electrónico" className="auth-input" />}
              {recoverStep === 2 && <>
                <input key="s2" required name="codigo" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoFocus autoComplete="one-time-code" aria-label="Código de 6 dígitos" placeholder="000000" className="auth-input text-center text-2xl font-black tracking-[.5em]" />
                <button type="button" onClick={resetRecover} className="mt-3 text-xs font-bold text-accent hover:underline">¿No te llegó? Reenviar código o cambiar correo</button>
              </>}
              {recoverStep === 3 && <>
                <input key="s3a" required name="newpass" minLength={6} type="password" autoComplete="new-password" aria-label="Nueva contraseña" autoFocus placeholder="Nueva contraseña" className="auth-input" />
                <input key="s3b" required name="confirm2" minLength={6} type="password" autoComplete="new-password" aria-label="Confirmar contraseña" placeholder="Confirmar contraseña" className="auth-input" />
              </>}
              {message && <p role="status" className="mt-3 rounded-xl bg-accent/10 p-3 text-xs font-bold text-accent">{message}</p>}{error && <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</p>}
              <Button type="submit" disabled={busy} className="mt-5 w-full">{busy ? "Procesando..." : recoverButton}</Button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileModal({ avatar, onAvatar, user, perfil, premium, expired, offline, onOffline, onPlans, onLogout, onClose, onSave, notify }: { avatar: string | null; onAvatar: (dataUrl: string) => void; user: User; perfil: Session | null; premium: boolean; expired: boolean; offline: boolean; onOffline: () => void; onPlans: () => void; onLogout: () => void; onClose: () => void; onSave: (fields: { correo: string; telefono: string; fecha_nacimiento: string }) => Promise<void>; notify: (message: string) => void }) {
  const dlg = useDialog<HTMLDivElement>(onClose);
  const photoRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ correo: user.correo, telefono: user.telefono ?? "", fecha_nacimiento: user.fecha_nacimiento ?? "" });
  const sub = perfil?.suscripcion ?? null;
  const pagos = perfil?.pagos ?? [];
  const fields: { key: "correo" | "telefono" | "fecha_nacimiento"; label: string; type: string }[] = [
    { key: "correo", label: "Correo", type: "email" }, { key: "telefono", label: "Teléfono", type: "tel" }, { key: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" },
  ];
  const toggleEdit = async () => {
    if (!editing) return setEditing(true);
    try { await onSave(form); notify("Perfil actualizado"); setEditing(false); } catch (e) { notify((e as Error).message); }
  };
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div ref={dlg} role="dialog" aria-modal="true" aria-label="Mi perfil" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-panel p-6 sm:rounded-3xl">
    <div className="flex items-center justify-between"><h2 className="text-xl font-black">Mi perfil</h2><button onClick={onClose} aria-label="Cerrar perfil" className="rounded-full bg-panel-strong p-2 text-muted"><Icon name="x" /></button></div>
    {expired && <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/10 p-4"><p className="text-sm font-bold text-accent">Tu membresía venció. Renuévala.</p><button onClick={onPlans} className="mt-2 text-xs font-bold text-white underline">Ver planes</button></div>}
    <div className="mt-5 flex items-center gap-4"><button onClick={() => photoRef.current?.click()} title="Cambiar foto" aria-label="Cambiar foto de perfil" className="group relative shrink-0"><Avatar name={user.nombre} foto={avatar} size={64} /><span className="absolute inset-0 flex items-center justify-center rounded-full on-dark bg-black/55 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">Cambiar</span><span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-black"><Icon name="plus" size={12} /></span></button><input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; if (!file.type.startsWith("image/")) { notify("Elige una imagen"); return; } try { onAvatar(await resizeImage(file)); notify("Foto actualizada"); } catch (err) { notify((err as Error).message); } }} /><div><p className="text-lg font-black">{user.nombre}</p><p className={`mt-1 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black ${premium ? "bg-accent text-black" : "bg-panel-strong text-muted"}`}>{premium && <Icon name="crown" size={11} />}{premium ? "Premium" : "Plan Gratis"}</p></div></div>
    <div className="mt-6 space-y-3">{fields.map((field) => <label key={field.key} className="block text-[10px] font-bold uppercase tracking-widest text-muted">{field.label}<input type={field.type} disabled={!editing} value={form[field.key]} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })} className="mt-1 h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-white outline-none disabled:opacity-70" /></label>)}</div>
    <Button variant="secondary" className="mt-4 w-full" onClick={toggleEdit}>{editing ? "Guardar cambios" : "Editar datos"}</Button>
    {premium && sub ? <div className="mt-6 rounded-2xl bg-canvas p-5"><div className="flex justify-between"><div><p className="text-xs font-bold text-accent">{sub.plan}</p><p className="mt-1 text-2xl font-black">${sub.precio} MXN</p></div><Icon name="crown" /></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><p className="text-muted">Inicio</p><p className="font-bold">{fmtDate(sub.fecha_inicio)}</p></div><div><p className="text-muted">Vencimiento</p><p className="font-bold">{fmtDate(sub.fecha_fin)}</p></div></div><p className="mt-3 text-xs font-bold text-accent">Vence en {sub.dias} días</p><button onClick={onOffline} aria-pressed={offline} className={`mt-4 flex w-full items-center justify-between rounded-xl p-3 text-xs font-bold ${offline ? "bg-accent text-black" : "bg-panel text-white"}`}><span className="flex items-center gap-2"><Icon name="offline" size={17} /> Modo sin conexión</span><span>{offline ? "Activo" : "Inactivo"}</span></button><Button className="mt-3 w-full" onClick={onPlans}>Renovar</Button></div> : <div className="mt-6 rounded-2xl border border-accent/20 bg-accent/10 p-5"><p className="font-black">Lleva tu música contigo</p><p className="mt-1 text-xs text-muted">Descarga canciones y escucha sin anuncios.</p><Button className="mt-4 w-full" onClick={onPlans}>Obtener Premium</Button></div>}
    <div className="mt-6"><p className="text-xs font-bold uppercase tracking-widest text-muted">Historial de pagos</p>{pagos.length ? pagos.map((pago, i) => <div key={i} className="mt-3 flex items-center justify-between rounded-xl bg-canvas p-4 text-xs"><div><p className="font-bold">{pago.plan}</p><p className="text-muted">{pago.metodo} · {fmtDate(pago.fecha)}</p></div><div className="text-right"><p className="font-bold">${pago.monto} MXN</p><p className={pago.estado === "aprobado" ? "text-emerald-400" : pago.estado === "rechazado" ? "text-red-400" : "text-accent"}>{cap(pago.estado)}</p></div></div>) : <p className="mt-3 rounded-xl border border-dashed border-line p-5 text-center text-xs text-muted">Aún no tienes pagos registrados.</p>}</div>
    <A11yLauncher variant="row" />
    <Button variant="ghost" className="mt-6 w-full" onClick={onLogout}>Cerrar sesión</Button>
  </div></div>;
}

interface PlayerControlsProps {
  playing: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
}

function PlayerControls({ playing, isShuffle, isRepeat, onTogglePlay, onNext, onPrevious, onToggleShuffle, onToggleRepeat }: PlayerControlsProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onToggleShuffle}
        aria-pressed={isShuffle}
        className={`relative p-2 transition-colors ${isShuffle ? "text-accent" : "text-muted hover:text-white"}`}
        title="Reproducción aleatoria"
        aria-label="Reproducción aleatoria"
      >
        {isShuffle && <span aria-hidden="true" className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-accent" />}
        <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.45 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
        </svg>
      </button>

      <button onClick={onPrevious} className="p-1.5 text-white transition-colors hover:text-accent" title="Canción anterior" aria-label="Canción anterior">
        <svg aria-hidden="true" className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>

      <button
        onClick={onTogglePlay}
        className="flex size-16 items-center justify-center rounded-full bg-accent text-black shadow-glow transition-transform hover:scale-105"
        title={playing ? "Pausar" : "Reproducir"}
        aria-label={playing ? "Pausar" : "Reproducir"}
      >
        {playing ? (
          <svg aria-hidden="true" className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="ml-0.5 h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <button onClick={onNext} className="p-1.5 text-white transition-colors hover:text-accent" title="Siguiente canción" aria-label="Siguiente canción">
        <svg aria-hidden="true" className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </svg>
      </button>

      <button
        onClick={onToggleRepeat}
        aria-pressed={isRepeat}
        className={`relative p-2 transition-colors ${isRepeat ? "text-accent" : "text-muted hover:text-white"}`}
        title="Repetir canción"
        aria-label="Repetir canción"
      >
        {isRepeat && <span aria-hidden="true" className="absolute bottom-0 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-accent" />}
        <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
        </svg>
      </button>
    </div>
  );
}

function FullPlayer({ song, playing, progress, onSeek, onToggle, onPrevious, onNext, onClose, notify, premium, onPremium, fav, onFav, onAddPlaylist, onShare, onOutput, onDownload, isShuffle, isRepeat, onToggleShuffle, onToggleRepeat, queue, setQueue, onAddToQueue }: { song: Song; playing: boolean; progress: number; onSeek: (value: number) => void; onToggle: () => void; onPrevious: () => void; onNext: () => void; onClose: () => void; notify: (message: string) => void; premium: boolean; onPremium: () => void; fav: boolean; onFav: () => void; onAddPlaylist: () => void; onShare: () => void; onOutput: () => void; onDownload: () => void; isShuffle: boolean; isRepeat: boolean; onToggleShuffle: () => void; onToggleRepeat: () => void; queue: Song[]; setQueue: React.Dispatch<React.SetStateAction<Song[]>>; onAddToQueue: (song: Song) => void }) {
  const dlg = useDialog<HTMLDivElement>(onClose);
  // En el teléfono la letra se ve de entrada (como en Spotify); en pantallas grandes se abre con el botón
  const [view, setView] = useState<"cover" | "lyrics" | "queue" | "info">(() => (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches ? "lyrics" : "cover"));
  const savedAlbums = useSavedAlbums();
  const [pickQueue, setPickQueue] = useState(false);
  const moveQueueItem = (position: number, direction: -1 | 1) => {
    const target = position + direction;
    if (target < 0 || target >= queue.length) return;
    setQueue((items) => {
      const next = [...items];
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
  };
  const handleDownload = () => {
    if (premium) {
      onDownload();
    } else {
      notify("Necesitas Premium para descargar");
      onClose();
      onPremium();
    }
  };

  const [lyrics, setLyrics] = useState<{ loading: boolean; synced: LyricLine[]; plain: string[] }>({ loading: true, synced: [], plain: [] });
  const lyricsBox = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const isPreview = !song.full || song.duration <= 35;

  useEffect(() => {
    let cancel = false;
    setLyrics({ loading: true, synced: [], plain: [] });
    const qs = new URLSearchParams({ titulo: song.title, artista: song.artist, duracion: String(Math.round(song.duration || 0)) });
    if (isPreview) qs.set("preview", "1");
    api<{ contenido: string; sincronizada: number }>(`/canciones/${song.id}/letra?${qs}`)
      .then((l) => {
        if (cancel) return;
        const raw = l.contenido || "";
        const synced = l.sincronizada ? parseLrc(raw) : [];
        const plain = synced.length ? [] : raw.split("\n").map((x) => x.trim()).filter(Boolean);
        setLyrics({ loading: false, synced, plain });
      })
      .catch(() => { if (!cancel) setLyrics({ loading: false, synced: [], plain: [] }); });
    return () => { cancel = true; };
  }, [song.id, Math.round(song.duration)]);

  let activeLine = -1;
  for (let i = 0; i < lyrics.synced.length; i++) { if (lyrics.synced[i].t <= progress + 0.4) activeLine = i; else break; }

  useEffect(() => {
    if (view !== "lyrics") return;
    const el = lineRefs.current[activeLine], box = lyricsBox.current;
    if (el && box) box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [activeLine, view]);

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  return (
    <div ref={dlg} role="dialog" aria-modal="true" aria-label={`Reproduciendo ${song.title}, de ${song.artist}`} className="fixed inset-0 z-[80] overflow-y-auto bg-canvas">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between"><button onClick={onClose} aria-label="Cerrar reproductor" className="rounded-full bg-panel p-3 text-muted hover:text-white"><Icon name="arrow" /></button><div className="text-center"><p className="text-[10px] font-bold uppercase tracking-[.2em] text-muted">Reproduciendo desde</p><p className="text-xs font-bold text-white">Mezcla para ti</p></div><button onClick={() => setView(view === "info" ? "cover" : "info")} aria-label="Información de la canción" aria-pressed={view === "info"} className="rounded-full p-3 text-muted"><Icon name="more" /></button></div>
        <div className="my-auto grid items-center gap-4 py-3 lg:grid-cols-[minmax(20rem,31rem)_1fr] lg:gap-16 lg:py-7">
          <div className="hidden lg:block"><Cover song={song} className="mx-auto aspect-square w-full max-w-lg rounded-[2rem] shadow-[0_30px_100px_rgba(255,106,0,.15)]" /></div>
          <div className="mx-auto w-full max-w-xl">
            <div className="flex items-center gap-3"><Cover song={song} className="size-14 shrink-0 rounded-xl lg:hidden" /><div className="min-w-0 flex-1"><h1 className="truncate text-xl font-black text-white sm:text-3xl">{song.title}</h1><p className="mt-1 truncate text-sm font-medium text-muted">{song.artist} · {song.album}</p></div><button onClick={onFav} aria-label={fav ? "Quitar de favoritas" : "Agregar a favoritas"} aria-pressed={fav} className={`shrink-0 p-2 ${fav ? "text-accent" : "text-muted"}`}><Icon name="heart" filled={fav} size={24} /></button></div>
            <div className="mt-4 lg:mt-7"><input aria-label="Progreso de reproducción" aria-valuetext={`${formatTime(progress)} de ${formatTime(song.duration)}`} type="range" min="0" max={song.duration} value={progress} onChange={(e) => onSeek(Number(e.target.value))} style={{ ["--progress" as string]: `${Math.min(100, (progress / Math.max(1, song.duration)) * 100)}%` }} className="player-range w-full" /><div className="mt-2 flex justify-between text-[11px] text-muted"><span>{formatTime(progress)}</span><span>-{formatTime(Math.max(0, song.duration - progress))}</span></div></div>
            <div className="mt-4 lg:mt-7">
              <PlayerControls
                playing={playing}
                isShuffle={isShuffle}
                isRepeat={isRepeat}
                onTogglePlay={onToggle}
                onNext={onNext}
                onPrevious={onPrevious}
                onToggleShuffle={onToggleShuffle}
                onToggleRepeat={onToggleRepeat}
              />
            </div>
            <div className="nt-actions mt-5 grid grid-cols-6 gap-2 border-t border-line pt-4 lg:mt-8 lg:pt-6">
              {[["share", "Compartir"], ["plus", "Playlist"], ["download", "Descargar"], ["device", "Salida"], ["lyrics", "Letra"], ["queue", "Cola"]].map(([icon, label]) => <button key={label} onClick={() => label === "Letra" ? setView(view === "lyrics" ? "cover" : "lyrics") : label === "Cola" ? setView(view === "queue" ? "cover" : "queue") : label === "Descargar" ? handleDownload() : label === "Playlist" ? onAddPlaylist() : label === "Compartir" ? onShare() : onOutput()} className={`flex flex-col items-center gap-2 text-[9px] font-semibold ${view === label.toLowerCase() ? "text-accent" : "text-muted hover:text-white"}`}><Icon name={icon as IconName} size={19} />{label}</button>)}
            </div>
            {view === "lyrics" && <div ref={lyricsBox} role="region" aria-label="Letra de la canción" tabIndex={0} className="relative mt-4 h-[36vh] min-h-44 overflow-y-auto rounded-2xl bg-panel p-5 lg:mt-6 lg:h-64">
              <p className="text-xs font-bold uppercase tracking-widest text-accent">Letra{lyrics.synced.length > 0 && " · sincronizada"}</p>
              <div className="mt-4 space-y-3">
                {lyrics.loading ? <p className="text-sm text-muted">Buscando letra...</p>
                  : lyrics.synced.length ? lyrics.synced.map((line, i) => (
                      <p key={i} ref={(el) => { lineRefs.current[i] = el; }}><button type="button" onClick={() => onSeek(line.t)} aria-current={i === activeLine ? "true" : undefined} className={`block w-full text-left text-lg font-bold leading-relaxed transition ${i === activeLine ? "translate-x-1 text-accent" : "text-muted hover:text-white"}`}>{line.text || "♪"}</button></p>
                    ))
                  : lyrics.plain.length ? lyrics.plain.map((line, i) => <p key={i} className="text-base font-semibold leading-relaxed text-white">{line}</p>)
                  : <p className="text-sm text-muted">No encontramos letra para esta canción.</p>}
              </div>
            </div>}
            {view === "queue" && <div className="mt-6 rounded-2xl bg-panel p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-accent">A continuación ({queue.length})</p>
                <button onClick={() => setPickQueue(!pickQueue)} className="flex items-center gap-1 text-[10px] font-bold text-muted hover:text-accent"><Icon name={pickQueue ? "x" : "plus"} size={14} /> {pickQueue ? "Cerrar" : "Agregar"}</button>
              </div>
              {pickQueue && <div className="mb-3 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-canvas p-2">
                {songs.slice(0, 50).map((s) => (
                  <button key={s.id} onClick={() => onAddToQueue(s)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-panel-strong">
                    <Cover song={s} className="size-9 rounded-md" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-white">{s.title}</span><span className="text-[10px] text-muted">{s.artist}</span></span>
                    <span className="text-accent"><Icon name="plus" size={16} /></span>
                  </button>
                ))}
              </div>}
              {queue.length ? queue.map((item, position) => (
                <div key={`${item.id}-${position}`} className="flex items-center gap-2 py-2">
                  <span className="text-muted"><Icon name="grip" size={17} /></span>
                  <Cover song={item} className="size-9 rounded-md" />
                  <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{item.title}</p><p className="text-[10px] text-muted">{item.artist}</p></div>
                  <button onClick={() => moveQueueItem(position, -1)} disabled={position === 0} aria-label={`Subir ${item.title} en la cola`} className="rotate-[-90deg] p-1.5 text-muted disabled:opacity-20"><Icon name="chevron" size={15} /></button>
                  <button onClick={() => moveQueueItem(position, 1)} disabled={position === queue.length - 1} aria-label={`Bajar ${item.title} en la cola`} className="rotate-90 p-1.5 text-muted disabled:opacity-20"><Icon name="chevron" size={15} /></button>
                  <button onClick={() => setQueue((items) => items.filter((_, i) => i !== position))} aria-label={`Quitar ${item.title} de la cola`} className="p-1.5 text-muted hover:text-white"><Icon name="x" size={16} /></button>
                </div>
              )) : <p className="py-5 text-center text-xs text-muted">No hay canciones agregadas a la cola.</p>}
            </div>}
            {view === "info" && <div className="mt-6 rounded-2xl bg-panel p-5"><p className="text-xs font-bold uppercase tracking-widest text-accent">Información de la canción</p><div className="mt-4 grid grid-cols-2 gap-4 text-xs">{[["Título", song.title], ["Artista", song.artist], ["Álbum", song.album], ["Año", String(song.year)], ["Género", song.genre], ["Duración", fmtTime(song.duration)]].map(([label, value]) => <div key={label}><p className="text-muted">{label}</p><button onClick={() => notify(`${label}: ${value}`)} className="mt-1 font-bold text-white hover:text-accent">{value}</button></div>)}</div>{norm(song.album) !== "sencillo" && <button type="button" aria-pressed={savedAlbums.isSaved(song.album, song.artist)} onClick={() => notify(savedAlbums.toggle(song) ? "Álbum guardado en tu biblioteca" : "Álbum quitado de tu biblioteca")} className={`mt-5 rounded-full px-4 py-2 text-xs font-bold ${savedAlbums.isSaved(song.album, song.artist) ? "bg-accent text-black" : "border border-line text-white hover:border-accent"}`}>{savedAlbums.isSaved(song.album, song.artist) ? "Álbum guardado ✓" : "Guardar álbum"}</button>}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPlayer({ song, playing, progress, onToggle, onOpen, onNext, fav, onFav }: { song: Song; playing: boolean; progress: number; onToggle: () => void; onOpen: () => void; onNext: () => void; fav: boolean; onFav: () => void }) {
  return (
    <div role="region" aria-label="Reproductor" className="mini-player-pos rounded-2xl border border-line bg-panel-strong/95 p-2 shadow-2xl backdrop-blur-xl">
      <div aria-hidden="true" className="absolute inset-x-3 bottom-0 h-0.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent shadow-glow" style={{ width: `${(progress / Math.max(1, song.duration)) * 100}%` }} /></div>
      <div className="flex items-center gap-3">
        <button onClick={onOpen} tabIndex={-1} aria-hidden="true"><Cover song={song} className="size-12 rounded-xl" /></button>
        <button onClick={onOpen} aria-label={`Abrir reproductor. Suena ${song.title}, de ${song.artist}`} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-bold text-white">{song.title}</p><p className="truncate text-xs text-muted">{song.artist}</p></button>
        <button onClick={onFav} aria-label={fav ? "Quitar de favoritas" : "Agregar a favoritas"} aria-pressed={fav} className={`hidden p-2 sm:block ${fav ? "text-accent" : "text-muted"}`}><Icon name="heart" size={19} filled={fav} /></button>
        <button onClick={onToggle} aria-label={playing ? "Pausar" : "Reproducir"} className="flex size-10 items-center justify-center rounded-full bg-[var(--fg)] text-[var(--color-canvas)]"><Icon name={playing ? "pause" : "play"} size={20} filled={!playing} /></button>
        <button onClick={onNext} aria-label="Siguiente canción" className="hidden p-2 text-muted sm:block"><Icon name="next" size={20} filled /></button>
      </div>
    </div>
  );
}

function PlaylistPicker({ song, playlists, onPick, onCreate, onClose }: { song: Song; playlists: PlaylistItem[]; onPick: (pl: PlaylistItem) => void; onCreate: (name: string) => void; onClose: () => void }) {
  const dlg = useDialog<HTMLDivElement>(onClose);
  const [name, setName] = useState("");
  const savedCovers = getSavedPlaylistCovers();
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dlg} role="dialog" aria-modal="true" aria-label="Agregar a playlist" className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-panel p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between"><h2 className="text-lg font-black text-white">Agregar a playlist</h2><button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-panel-strong p-2 text-muted"><Icon name="x" /></button></div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-canvas p-3"><Cover song={song} className="size-11 rounded-lg" /><div className="min-w-0"><p className="truncate text-sm font-bold text-white">{song.title}</p><p className="truncate text-xs text-muted">{song.artist}</p></div></div>
        <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) onCreate(name.trim()); }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva playlist..." aria-label="Nombre de la nueva playlist" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm text-white outline-none focus:border-accent" />
          <Button type="submit" disabled={!name.trim()}><Icon name="plus" size={17} /> Crear</Button>
        </form>
        <div className="mt-4 space-y-1">
          {playlists.length ? playlists.map((pl) => (
            <button key={pl.id} onClick={() => onPick(pl)} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-panel-strong">
              <PlaylistCover covers={pl.covers ?? []} customCover={savedCovers[String(pl.id)]} className="size-12 shrink-0 rounded-lg" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-white">{pl.name}</span><span className="text-xs text-muted">{pl.songIds.length} canciones</span></span>
              <span className="text-accent"><Icon name="plus" size={18} /></span>
            </button>
          )) : <p className="py-4 text-center text-xs text-muted">Aún no tienes playlists. Crea una arriba.</p>}
        </div>
      </div>
    </div>
  );
}

// El Toast es solo visual (aria-hidden): el aviso para lector de pantalla lo hace announce() desde App
function Toast({ message }: { message: string }) {
  return <div aria-hidden="true" className="fixed left-1/2 top-5 z-[1200] flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--fg)] px-4 py-3 text-xs font-bold text-[var(--color-canvas)] shadow-2xl"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-black"><Icon name="check" size={14} /></span><span className="min-w-0">{message}</span></div>;
}

// ───────────── ANUNCIOS (se turnan: video 11s ↔ emergente 6s) ─────────────
const AD_VIDEO_SECONDS = 11;
const AD_POPUP_SECONDS = 6;
const AD_VIDEO_SRC = "/anuncio-premium.mp4"; // pon tu video en /public

type AdKind = "video" | "popup";

// Anuncio 1: pantalla completa con video vertical, dura 11 segundos
// Texto equivalente del video (se lee con lector de pantalla). Edítalo para que coincida con tu anuncio.
const AD_VIDEO_DESCRIPTION = "Con NextTune Premium escuchas sin anuncios, descargas tu música y la disfrutas sin conexión.";

function VideoAdModal({ onDone, onPremium }: { onDone: () => void; onPremium: () => void }) {
  const [timeLeft, setTimeLeft] = useState(AD_VIDEO_SECONDS);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  // El anuncio mantiene el foco dentro de la ventana; no se cierra con Esc (dura solo unos segundos)
  const dlg = useDialog<HTMLDivElement>(() => {});

  // La cuenta regresiva se detiene si la persona pausa el anuncio (WCAG 2.2.1: tiempo ajustable)
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [paused]);

  // Al llegar a 0 el anuncio se cierra solo y la música continúa
  useEffect(() => {
    if (timeLeft === 0) doneRef.current();
  }, [timeLeft]);

  useEffect(() => {
    announce(`Anuncio de NextTune Premium. ${AD_VIDEO_DESCRIPTION} Dura ${AD_VIDEO_SECONDS} segundos y puedes pausarlo.`);
  }, []);

  // Intenta reproducir CON sonido; si el navegador lo bloquea, arranca en mute
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  }, []);

  // WCAG 1.4.2: siempre hay un control para silenciar o activar el sonido
  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted) v.volume = 1;
    setMuted(v.muted);
  };

  const togglePause = () => {
    const v = videoRef.current;
    if (paused) { v?.play().catch(() => {}); setPaused(false); }
    else { v?.pause(); setPaused(true); }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md">
      <div ref={dlg} role="dialog" aria-modal="true" aria-label="Anuncio de NextTune Premium" aria-describedby="ad-desc" className="relative flex max-h-[96vh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-accent/30 bg-panel p-4 text-center shadow-2xl">
        <p id="ad-desc" className="sr-only">{AD_VIDEO_DESCRIPTION}</p>
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-accent/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
            Anuncio NextTune
          </span>
          <span aria-hidden="true" className="text-[11px] font-bold text-muted">{timeLeft}s</span>
        </div>

        {/* Video vertical 9:16: se ve completo, sin recortar */}
        <div className="on-dark relative mx-auto min-h-0 w-full flex-1 overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "9 / 16", maxHeight: "65vh" }}>
          <video
            ref={videoRef}
            src={AD_VIDEO_SRC}
            autoPlay
            loop
            playsInline
            aria-label="Video del anuncio"
            className="h-full w-full object-contain"
          >
            {/* Subtítulos: crea /public/anuncio-premium.es.vtt con lo que dice tu video */}
            <track kind="captions" src="/anuncio-premium.es.vtt" srcLang="es" label="Español" default />
          </video>
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              data-autofocus
              onClick={togglePause}
              aria-label={paused ? "Reanudar anuncio" : "Pausar anuncio"}
              className="flex size-10 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur"
            >
              <Icon name={paused ? "play" : "pause"} size={18} filled={paused} />
            </button>
            <button
              onClick={toggleSound}
              aria-pressed={muted}
              className="rounded-full bg-black/70 px-3 py-2 text-xs font-bold text-white backdrop-blur"
            >
              {muted ? "Activar sonido" : "Silenciar"}
            </button>
          </div>
        </div>

        <div aria-hidden="true" className="mt-3 h-1 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-accent transition-all duration-1000 ease-linear"
            style={{ width: `${((AD_VIDEO_SECONDS - timeLeft) / AD_VIDEO_SECONDS) * 100}%` }}
          />
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Button variant="secondary" className="flex-1 whitespace-nowrap px-3 text-xs" onClick={onPremium}>
            Premium · {money(mainPlan().precio)} MXN
          </Button>
          <Button className="flex-1 whitespace-nowrap px-3 text-xs" disabled>
            Continúa en {timeLeft}s
          </Button>
        </div>
      </div>
    </div>
  );
}

// Anuncio 2: tarjeta emergente, dura 6 segundos (la música NO se pausa).
// Se pausa al pasar el mouse o con el foco dentro, y se puede cerrar.
function PopupAd({ onDone, onPremium }: { onDone: () => void; onPremium: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [paused, setPaused] = useState(false);
  const remaining = useRef(AD_POPUP_SECONDS * 1000);

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => doneRef.current(), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [paused]);

  useEffect(() => { announce(`Anuncio de NextTune: escucha sin comerciales con Premium por ${money(mainPlan().precio)} pesos al mes.`); }, []);

  return (
    <div
      role="region"
      aria-label="Anuncio de NextTune Premium"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false); }}
      className="fixed bottom-28 left-1/2 z-[998] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-2xl border border-accent/40 bg-panel shadow-2xl lg:left-[calc(50%+8rem)]"
    >
      <div className="flex items-center gap-4 p-4">
        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
          <Icon name="crown" size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">Anuncio NextTune</p>
          <p className="mt-0.5 text-sm font-black text-white">Escucha sin comerciales</p>
          <p className="text-xs text-muted">Premium por solo {money(mainPlan().precio)} MXN al mes.</p>
        </div>
        <Button className="min-h-9 shrink-0 px-4 text-xs" onClick={onPremium}>Ver</Button>
        <button onClick={() => doneRef.current()} aria-label="Cerrar anuncio" className="shrink-0 rounded-full p-2 text-muted hover:text-white"><Icon name="x" size={16} /></button>
      </div>
      <div aria-hidden="true" className="h-1 w-full bg-line">
        <div
          className="nt-ad-bar h-full bg-accent"
          style={{ animationDuration: `${AD_POPUP_SECONDS}s`, animationPlayState: paused ? "paused" : "running" }}
        />
      </div>
    </div>
  );
}

// ───────────── AVATAR / AMIGOS / NOTIFICACIONES ─────────────
function Avatar({ name, foto, size = 36, className = "" }: { name: string; foto?: string | null; size?: number; className?: string }) {
  return foto
    ? <img src={foto} alt={name} className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />
    : <span className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#8b3b00] font-black text-black ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}>{initials(name)}</span>;
}

// Recorta la foto a cuadrado y la reduce (256px) para que pese poco
const resizeImage = (file: File, max = 256): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => reject(new Error("Imagen no válida"));
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = max; canvas.height = max;
      canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, max, max);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
});

const timeAgo = (value?: string) => {
  if (!value) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
};

function FriendPicker({ title, friends, onPick, onClose }: { title: string; friends: Friend[]; onPick: (friend: Friend) => void; onClose: () => void }) {
  const dlg = useDialog<HTMLDivElement>(onClose);
  const list = friends.filter((f) => f.estado === "amigo");
  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div ref={dlg} role="dialog" aria-modal="true" aria-label={title} className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-line bg-panel p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-base font-black text-white">{title}</p>
          <button onClick={onClose} className="p-1 text-muted hover:text-white" aria-label="Cerrar"><Icon name="x" size={20} /></button>
        </div>
        {list.length ? list.map((f) => (
          <button key={f.id_usuario} onClick={() => onPick(f)} className="mt-2 flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-panel-strong">
            <Avatar name={f.nombre} foto={f.foto} size={40} />
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{f.nombre}</span>
            <Icon name="chevron" size={16} />
          </button>
        )) : <p className="mt-4 text-sm text-muted">Todavía no tienes amigos. Agrégalos en la pestaña Amigos.</p>}
      </div>
    </div>
  );
}

function NotificationsPanel({ notifs, onClose, onAnswer, onPlay }: { notifs: Notif[]; onClose: () => void; onAnswer: (n: Notif, accept: boolean) => void; onPlay: (n: Notif) => void }) {
  const text = (n: Notif) =>
    n.tipo === "solicitud" ? "te envió una solicitud de amistad"
    : n.tipo === "cancion" ? `compartió contigo la canción “${n.cancion?.title ?? n.titulo ?? ""}”`
    : `te invitó a su playlist “${n.titulo ?? ""}”`;
  const dlg = useDialog<HTMLDivElement>(onClose);
  return (
    <>
      <div className="fixed inset-0 z-[55]" onClick={onClose} />
      <div ref={dlg} role="dialog" aria-label="Notificaciones" className="fixed right-3 top-[4.75rem] z-[60] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl sm:right-7">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm font-black text-white">Notificaciones</p>
          <button onClick={onClose} className="text-muted hover:text-white" aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>
        <div className="max-h-[26rem] overflow-y-auto">
          {notifs.length === 0 && <p className="p-6 text-center text-xs text-muted">No tienes notificaciones por ahora.</p>}
          {notifs.map((n) => (
            <div key={n.id} className={`flex gap-3 border-b border-line/60 p-4 last:border-0 ${n.leida ? "" : "bg-accent/5"}`}>
              <Avatar name={n.de_nombre} foto={n.de_foto} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-relaxed text-white"><span className="font-black text-white">{n.de_nombre}</span> {text(n)}</p>
                <p className="mt-0.5 text-[10px] text-muted">{timeAgo(n.fecha)}{!n.leida && <span className="ml-2 rounded-full bg-accent px-1.5 py-0.5 font-black text-black">Nueva</span>}</p>
                {n.tipo === "cancion" && (
                  <Button className="mt-2 min-h-8 px-4 text-[11px]" onClick={() => onPlay(n)}><Icon name="play" size={13} filled /> Reproducir</Button>
                )}
                {n.tipo !== "cancion" && !n.resuelta && (
                  <div className="mt-2 flex gap-2">
                    <Button className="min-h-8 px-4 text-[11px]" onClick={() => onAnswer(n, true)}>{n.tipo === "playlist" ? "Unirme" : "Aceptar"}</Button>
                    <Button variant="secondary" className="min-h-8 px-4 text-[11px]" onClick={() => onAnswer(n, false)}>Rechazar</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Saca el id del amigo de un QR de NextTune (enlace con ?amigo=9, código NT-9 o solo el número)
const friendIdFromQr = (text: string): number | null => {
  const t = text.trim();
  const link = t.match(/[?&]amigo=(\d+)/i);
  if (link) return Number(link[1]);
  const code = t.match(/^NT-?(\d+)$/i);
  if (code) return Number(code[1]);
  if (/^\d+$/.test(t)) return Number(t);
  return null;
};

// Escáner de QR: abre la cámara (o lee una foto), encuentra el código de otro usuario y se lo entrega a quien lo llamó
function QrScanner({ onCode, onClose }: { onCode: (text: string) => void; onClose: () => void }) {
  const dlg = useDialog<HTMLDivElement>(onClose);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [error, setError] = useState("");

  const decode = (source: CanvasImageSource, w: number, h: number): string | null => {
    const c = canvasRef.current;
    if (!c || !w || !h) return null;
    const scale = Math.min(1, 1000 / Math.max(w, h));
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    return jsQR(img.data, img.width, img.height)?.data || null;
  };
  const deliver = (text: string) => { if (doneRef.current) return; doneRef.current = true; onCodeRef.current(text); };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        const text = decode(v, v.videoWidth, v.videoHeight);
        if (text) { deliver(text); return; }
      }
      timer = window.setTimeout(tick, 180);
    };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setError("La cámara solo funciona con https o en localhost. Puedes subir una foto del QR."); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play().catch(() => {});
        tick();
      } catch (e) {
        const name = (e as DOMException)?.name;
        setError(name === "NotAllowedError" ? "No diste permiso para usar la cámara. Actívalo en el navegador y vuelve a intentar." : name === "NotFoundError" ? "No encontramos una cámara en este dispositivo. Puedes subir una foto del QR." : "No se pudo abrir la cámara. Puedes subir una foto del QR.");
      }
    })();
    return () => { stopped = true; window.clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const fromImage = async (file?: File) => {
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      const text = decode(bmp, bmp.width, bmp.height);
      bmp.close?.();
      if (text) deliver(text); else setError("No encontramos un código QR en esa imagen.");
    } catch { setError("No se pudo leer esa imagen."); }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/80 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div ref={dlg} role="dialog" aria-modal="true" aria-label="Escanear código QR de un amigo" className="w-full max-w-sm rounded-3xl border border-line bg-panel p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-base font-black text-white">Escanear QR</p>
          <button onClick={onClose} className="p-1 text-muted hover:text-white" aria-label="Cerrar"><Icon name="x" size={20} /></button>
        </div>
        <p className="mt-1 text-xs text-muted">Apunta la cámara al código QR de tu amigo. Al leerlo, le enviamos la solicitud.</p>
        <div className="on-dark relative mt-4 aspect-square w-full overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} playsInline muted aria-label="Cámara para escanear el QR" className="h-full w-full object-cover" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-[14%] rounded-2xl border-2 border-accent/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {error && <p role="alert" className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-xs font-bold text-red-300">{error}</p>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void fromImage(f); }} />
        <Button variant="secondary" className="mt-4 w-full text-xs" onClick={() => fileRef.current?.click()}>Subir foto del QR</Button>
      </div>
    </div>
  );
}

function FriendsScreen({ friends, me, onRequestBy, onAnswer, onRemove, notify }: { friends: Friend[]; me: User; onRequestBy: (payload: { id_usuario?: number; correo?: string }) => void; onAnswer: (id: number, accept: boolean) => void; onRemove: (f: Friend) => void; notify: (message: string) => void }) {
  const [codeInput, setCodeInput] = useState("");
  const [showQr, setShowQr] = useState(false);
  const myCode = `NT-${me.id_usuario}`;
  const myLink = `${window.location.origin}/?amigo=${me.id_usuario}`;
  const addByCode = () => {
    const value = codeInput.trim();
    if (!value) return;
    if (value.includes("@")) onRequestBy({ correo: value.toLowerCase() });
    else {
      const id = parseInt(value.replace(/\D/g, ""), 10);
      if (!id) { notify("Escribe un correo completo o un código como NT-42"); return; }
      if (id === me.id_usuario) { notify("Ese es tu propio código"); return; }
      onRequestBy({ id_usuario: id });
    }
    setCodeInput("");
  };
  const [scanning, setScanning] = useState(false);
  const handleScan = (text: string) => {
    setScanning(false);
    const id = friendIdFromQr(text);
    if (!id) { notify("Ese QR no es de NextTune"); return; }
    if (id === me.id_usuario) { notify("Ese es tu propio código"); return; }
    onRequestBy({ id_usuario: id });
  };

  const amigos = friends.filter((f) => f.estado === "amigo");
  const recibidas = friends.filter((f) => f.estado === "recibida");
  const enviadas = friends.filter((f) => f.estado === "enviada");

  return (
    <div>
      {scanning && <QrScanner onCode={handleScan} onClose={() => setScanning(false)} />}
      <h1 className="text-3xl font-black text-white">Amigos</h1>
      <p className="mt-1 text-sm text-muted">Conéctate con otros usuarios, comparte canciones y arma playlists juntos.</p>

      <div className="mt-6 rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-panel p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Tu código de amigo</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-canvas px-4 py-2 text-xl font-black tracking-widest text-white">{myCode}</span>
          <Button variant="secondary" className="min-h-9 px-4 text-xs" onClick={async () => notify((await copyText(myLink)) ? "Enlace de amigo copiado" : "No se pudo copiar")}>Copiar enlace</Button>
          <Button variant="secondary" className="min-h-9 px-4 text-xs" onClick={() => setShowQr(!showQr)}>{showQr ? "Ocultar QR" : "Mostrar QR"}</Button>
          <Button className="min-h-9 px-4 text-xs" onClick={() => setScanning(true)}><Icon name="camera" size={16} /> Escanear QR</Button>
        </div>
        {showQr && (
          <div className="mt-4 inline-block rounded-2xl bg-white p-3">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=0&data=${encodeURIComponent(myLink)}`} width={180} height={180} alt="Código QR para agregarte" onError={(e) => { e.currentTarget.style.display = "none"; notify("No se pudo cargar el QR (revisa tu internet)"); }} />
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-muted">Pásale tu código o enlace a un amigo, o que escanee el QR con la cámara de su celular. Al abrirlo e iniciar sesión, te llega su solicitud. También puedes escanear tú el QR de tu amigo y la solicitud se envía al instante.</p>
      </div>

      <div className="mt-4 flex gap-2">
        <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addByCode()} placeholder="Agregar con correo completo o código (NT-42)" aria-label="Agregar amigo con correo o código" className="h-12 min-w-0 flex-1 rounded-full border border-line bg-panel px-5 text-sm text-white outline-none placeholder:text-muted focus:border-accent" />
        <Button onClick={addByCode}><Icon name="plus" size={17} /> Agregar</Button>
      </div>

      {recibidas.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-widest text-accent">Solicitudes recibidas ({recibidas.length})</p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-accent/30 bg-panel">
            {recibidas.map((f) => (
              <div key={f.id_usuario} className="flex items-center gap-3 border-b border-line/60 p-3 last:border-0">
                <Avatar name={f.nombre} foto={f.foto} size={42} />
                <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{f.nombre}</p>
                <Button className="min-h-8 px-4 text-[11px]" onClick={() => onAnswer(f.id_usuario, true)}>Aceptar</Button>
                <Button variant="secondary" className="min-h-8 px-4 text-[11px]" onClick={() => onAnswer(f.id_usuario, false)}>Rechazar</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">Mis amigos ({amigos.length})</p>
        {amigos.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-line bg-panel p-5 text-sm text-muted">Aún no tienes amigos. Agrégalos con su código, su enlace o escaneando su QR.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {amigos.map((f) => (
              <div key={f.id_usuario} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
                <Avatar name={f.nombre} foto={f.foto} size={48} />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{f.nombre}</p>{f.correo && <p className="truncate text-[11px] text-muted">{f.correo}</p>}</div>
                <button onClick={() => onRemove(f)} className="p-2 text-muted hover:text-red-400" aria-label="Eliminar amigo"><Icon name="trash" size={17} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {enviadas.length > 0 && (
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">Solicitudes enviadas</p>
          <div className="mt-3 space-y-2">
            {enviadas.map((f) => (
              <div key={f.id_usuario} className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-3">
                <Avatar name={f.nombre} foto={f.foto} size={36} />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{f.nombre}</p>
                <span className="text-[11px] font-bold text-muted">Pendiente</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────── COMPARTIR ─────────────
const songLink = (song: Song) => `${window.location.origin}/?cancion=${song.id}`;

const copyText = async (text: string) => {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
};

function ShareSheet({ song, onClose, onShared, notify, friends, onSendFriend }: { song: Song; onClose: () => void; onShared: (song: Song, via: string) => void; notify: (message: string) => void; friends: Friend[]; onSendFriend: (song: Song, friend: Friend) => void }) {
  const dlg = useDialog<HTMLDivElement>(onClose);
  const amigos = friends.filter((f) => f.estado === "amigo");
  const link = songLink(song);
  const text = `🎵 Escucha "${song.title}" de ${song.artist} en NextTune`;
  const eText = encodeURIComponent(text);
  const eLink = encodeURIComponent(link);
  const canNativeShare = typeof navigator !== "undefined" && typeof (navigator as any).share === "function";

  const open = (via: string, url: string) => { onShared(song, via); window.open(url, "_blank", "noopener,noreferrer"); onClose(); };
  const copy = async () => {
    const ok = await copyText(link);
    onShared(song, "enlace");
    notify(ok ? "Enlace copiado" : "No se pudo copiar el enlace");
    onClose();
  };
  const nativeShare = async () => {
    try { await (navigator as any).share({ title: song.title, text, url: link }); onShared(song, "sistema"); onClose(); } catch {}
  };
  // Instagram no tiene un enlace web para compartir: en celular usamos el menú del sistema (ahí aparece Instagram);
  // en computadora copiamos el enlace y abrimos Instagram para pegarlo.
  const instagram = async () => {
    if (canNativeShare) { await nativeShare(); return; }
    await copyText(link);
    onShared(song, "instagram");
    notify("Enlace copiado: pégalo en Instagram");
    window.open("https://www.instagram.com/direct/inbox/", "_blank", "noopener,noreferrer");
    onClose();
  };

  const options: { label: string; color: string; glyph: string; onClick: () => void }[] = [
    { label: "WhatsApp", color: "#25D366", glyph: "W", onClick: () => open("whatsapp", `https://wa.me/?text=${encodeURIComponent(`${text} ${link}`)}`) },
    { label: "Facebook", color: "#1877F2", glyph: "f", onClick: () => open("facebook", `https://www.facebook.com/sharer/sharer.php?u=${eLink}&quote=${eText}`) },
    { label: "Instagram", color: "#E1306C", glyph: "IG", onClick: instagram },
    { label: "Telegram", color: "#27A7E7", glyph: "T", onClick: () => open("telegram", `https://t.me/share/url?url=${eLink}&text=${eText}`) },
    { label: "X", color: "#000000", glyph: "X", onClick: () => open("x", `https://twitter.com/intent/tweet?text=${eText}&url=${eLink}`) },
    { label: "Correo", color: "#EA4335", glyph: "@", onClick: () => { onShared(song, "correo"); window.location.href = `mailto:?subject=${encodeURIComponent(`${song.title} · NextTune`)}&body=${encodeURIComponent(`${text}\n\n${link}`)}`; onClose(); } },
    { label: "Copiar enlace", color: "#ff6a00", glyph: "🔗", onClick: copy },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div ref={dlg} role="dialog" aria-modal="true" aria-label={`Compartir ${song.title}`} className="w-full max-w-md rounded-3xl border border-line bg-panel p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-accent">Compartir</p>
            <p className="mt-1 truncate text-base font-black text-white">{song.title}</p>
            <p className="truncate text-xs text-muted">{song.artist}</p>
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-white" aria-label="Cerrar"><Icon name="x" size={20} /></button>
        </div>

        <div className="mt-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Enviar a un amigo</p>
          {amigos.length ? (
            <div className="mt-3 flex gap-4 overflow-x-auto pb-1">
              {amigos.map((f) => (
                <button key={f.id_usuario} onClick={() => { onSendFriend(song, f); onClose(); }} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
                  <Avatar name={f.nombre} foto={f.foto} size={48} />
                  <span className="w-full truncate text-center text-[10px] font-semibold text-muted">{shortName(f.nombre)}</span>
                </button>
              ))}
            </div>
          ) : <p className="mt-2 text-xs text-muted">Aún no tienes amigos agregados. Ve a la pestaña <b className="text-white">Amigos</b> para agregar a alguien y poder enviarle canciones.</p>}
        </div>

        <div className="mt-5 grid grid-cols-4 gap-4">
          {options.map((o) => (
            <button key={o.label} onClick={o.onClick} className="flex flex-col items-center gap-2 text-center">
              <span className="flex size-12 items-center justify-center rounded-full text-sm font-black text-white" style={{ background: o.color }}>{o.glyph}</span>
              <span className="text-[10px] font-semibold text-muted">{o.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-2xl bg-canvas p-3">
          <p className="min-w-0 flex-1 truncate text-xs text-muted">{link}</p>
          <button onClick={copy} className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-[11px] font-black text-black">Copiar</button>
        </div>

        {canNativeShare && (
          <Button variant="secondary" className="mt-3 w-full text-xs" onClick={nativeShare}>Más opciones…</Button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  usePlans();
  useEffect(() => { void loadPlans(); }, []);
  // Service worker: guarda la app en el dispositivo para que abra aunque no haya internet
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  const [splash, setSplash] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Session | null>(null);
  const [screen, setScreen] = useState<Screen>("inicio");
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [premium, setPremium] = useState(false);
  const [expired, setExpired] = useState(false);
  const [offline, setOffline] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [favs, setFavs] = useState<Set<Id>>(new Set());
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const [downloads, setDownloads] = useState<Set<Id>>(new Set());
  const [hasAudio, setHasAudio] = useState(false);
  const [, setTick] = useState(0);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [queue, setQueue] = useState<Song[]>([]);
  const [pickerSong, setPickerSong] = useState<Song | null>(null);
  const failures = useRef(0);
  const retriedAudio = useRef(new Set<string>()); // enlaces externos que ya intentamos renovar
  // Anuncios: cada 7 u 8 canciones, alternando video (11s) y emergente (6s)
  const [activeAd, setActiveAd] = useState<AdKind | null>(null);
  const [shareTarget, setShareTarget] = useState<Song | null>(null);
  const [started, setStarted] = useState(false); // el mini reproductor solo aparece cuando el usuario reproduce algo
  const [avatar, setAvatar] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const songsSinceAd = useRef(0);
  const adEvery = useRef(7 + Math.round(Math.random())); // 7 u 8
  const nextAdKind = useRef<AdKind>("video");
  const [resetToken, setResetToken] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get("token")
  );
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string>("");
  const logged = useRef<Id>(-1);
  const shuffleRef = useRef(false);
  const repeatRef = useRef(false);
  shuffleRef.current = isShuffle;
  repeatRef.current = isRepeat;
  const downloadsRef = useRef<Set<Id>>(new Set());
  downloadsRef.current = downloads;
  const controlsRef = useRef<{ next: () => void; previous: () => void }>({ next: () => {}, previous: () => {} });
  const loopRef = useRef<Song[] | null>(null); // playlist o álbum que se está escuchando: al terminar vuelve a empezar
  const roleRef = useRef<string | null>(null);
  const adRef = useRef(false);
  const currentSong: Song | undefined = songs[current] || songs[0];
  const isOffline = offline || !online;

  // Escucha real del estado de red del navegador (Wi-Fi / Datos / DevTools Offline)
  useEffect(() => {
    const on = () => { setOnline(true); setToast("Conexión restablecida"); };
    const off = () => { setOnline(false); setToast("Sin conexión · Modo offline activo"); };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    const onShare = (e: Event) => setShareTarget((e as CustomEvent<Song>).detail);
    window.addEventListener("nexttune:share", onShare);
    return () => window.removeEventListener("nexttune:share", onShare);
  }, []);

  const getNextIndex = (from: number) => {
    if (songs.length <= 1) return 0;
    const ok = (i: number) => !isOffline || downloadsRef.current.has(songs[i].id);
    if (shuffleRef.current) {
      const pool = songs.map((_, i) => i).filter((i) => i !== from && ok(i));
      return pool.length ? pool[Math.floor(Math.random() * pool.length)] : from;
    }
    for (let step = 1; step <= songs.length; step++) {
      const i = (from + step) % songs.length;
      if (ok(i)) return i;
    }
    return from;
  };

  const restartSong = () => {
    setProgress(0);
    const audio = audioRef.current;
    if (audio && hasAudio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
    setPlaying(true);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1100);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Carga el audio desde Cache API si fue descargada (funciona 100% sin internet), o desde la red si hay conexión
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    let cancel = false;
    setHasAudio(false);

    (async () => {
      const srcUrl = audioSrc(currentSong);
      if (!srcUrl) return;

      // 1. Si es Premium y está descargada, buscamos primero en Cache Storage local del navegador
      if (premium && downloadsRef.current.has(currentSong.id) && "caches" in window) {
        try {
          const cache = await caches.open(OFFLINE_AUDIO_CACHE);
          const cached = (await cache.match(offlineKey(currentSong))) || (await cache.match(srcUrl));
          if (cached && !cancel) {
            const blob = await cached.blob();
            if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
            const objUrl = URL.createObjectURL(blob);
            blobUrlRef.current = objUrl;
            audio.src = objUrl;
            audio.load();
            return;
          }
        } catch {}
      }

      if (cancel) return;

      // 2. Si no está en caché y no hay internet, avisamos y detenemos
      if (isOffline) {
        audio.removeAttribute("src");
        audio.load();
        setPlaying(false);
        setToast("Sin conexión: esta canción no está descargada");
        return;
      }

      // 3. En línea: reproducimos normalmente
      audio.src = srcUrl;
      audio.load();
    })();

    return () => { cancel = true; };
  }, [current, role, isOffline, premium]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing && hasAudio) audio.play().catch(() => {});
    else audio.pause();
  }, [playing, hasAudio, current]);

  // Historial de reproducción (solo cuando hay internet)
  useEffect(() => {
    if (!playing || !role || !currentSong || isOffline || logged.current === currentSong.id) return;
    logged.current = currentSong.id;
    api("/historial", "POST", { ...currentSong, id_cancion: currentSong.id, duracion: currentSong.duration }).catch(() => {});
  }, [playing, current, isOffline]);

  useEffect(() => { if (playing) setStarted(true); }, [playing]);

  // Foto de perfil (se guarda en este dispositivo y se intenta subir al servidor)
  useEffect(() => {
    if (!user) { setAvatar(null); return; }
    let saved: string | null = null;
    try { saved = localStorage.getItem(`nexttune_avatar_${user.id_usuario}`); } catch {}
    setAvatar(saved ?? (user as any).foto ?? null);
  }, [user?.id_usuario]);
  const changeName = async (nombre: string) => {
    await api("/me/nombre", "PUT", { nombre });
    setUser((u) => (u ? { ...u, nombre } : u));
    setPerfil((p) => (p ? { ...p, user: { ...p.user, nombre } } : p));
  };
  const changeAvatar = (dataUrl: string) => {
    if (!user) return;
    try { localStorage.setItem(`nexttune_avatar_${user.id_usuario}`, dataUrl); } catch {}
    setAvatar(dataUrl);
    api("/me/foto", "PUT", { foto: dataUrl }).catch(() => {});
  };

  // Amigos y notificaciones (se actualizan cada 10 s)
  const loadSocial = async () => {
    const [f, n] = await Promise.all([
      api<Friend[]>("/amigos").catch(() => null),
      api<Notif[]>("/notificaciones").catch(() => null),
    ]);
    if (f) setFriends(f);
    if (n) setNotifs(n);
  };
  useEffect(() => {
    if (!role || role === "admin") return;
    loadSocial();
    const timer = window.setInterval(loadSocial, 10000);
    return () => window.clearInterval(timer);
  }, [role]);
  const unread = notifs.filter((n) => !n.leida).length;
  const pending = friends.filter((f) => f.estado === "recibida").length;
  const openNotifs = () => {
    setNotifOpen((open) => !open);
    if (unread > 0) {
      api("/notificaciones/leer", "POST").catch(() => {});
      setNotifs((prev) => prev.map((n) => ({ ...n, leida: true })));
    }
  };
  const requestFriendBy = async (payload: { id_usuario?: number; correo?: string }) => {
    try { await api("/amigos/solicitud", "POST", payload); await loadSocial(); setToast("Solicitud enviada"); } catch (e) { setToast((e as Error).message); }
  };
  const answerFriendRequest = async (id: number, accept: boolean) => {
    try { await api("/amigos/responder", "POST", { id_usuario: id, aceptar: accept }); await loadSocial(); setToast(accept ? "¡Ahora son amigos!" : "Solicitud rechazada"); } catch (e) { setToast((e as Error).message); }
  };
  const removeFriend = async (f: Friend) => {
    if (!window.confirm(`¿Eliminar a ${f.nombre} de tus amigos?`)) return;
    try { await api(`/amigos/${f.id_usuario}`, "DELETE"); await loadSocial(); setToast("Amigo eliminado"); } catch (e) { setToast((e as Error).message); }
  };
  const sendSongToFriend = async (song: Song, friend: Friend) => {
    try { await api("/compartir/cancion", "POST", { ...song, id_amigo: friend.id_usuario, id_cancion: song.id }); setToast(`Enviaste "${song.title}" a ${shortName(friend.nombre)}`); } catch (e) { setToast((e as Error).message); }
  };
  const answerNotif = async (n: Notif, accept: boolean) => {
    try {
      if (n.tipo === "solicitud") await api("/amigos/responder", "POST", { id_usuario: n.de_id, aceptar: accept });
      else await api(`/notificaciones/${n.id}/responder`, "POST", { aceptar: accept });
      if (n.tipo === "playlist" && accept) await refreshPlaylists();
      await loadSocial();
      setToast(n.tipo === "solicitud" ? (accept ? "¡Ahora son amigos!" : "Solicitud rechazada") : (accept ? "Te uniste a la playlist" : "Invitación rechazada"));
    } catch (e) { setToast((e as Error).message); }
  };
  const playSharedSong = (n: Notif) => {
    if (!n.cancion) return;
    const [song] = addSongs([n.cancion]);
    const index = songs.findIndex((s) => s.id === song.id);
    if (index >= 0) { playSong(index); setNotifOpen(false); }
  };

  // El video pausa la música; al cerrarse se reanuda
  useEffect(() => { if (activeAd === "video") setPlaying(false); }, [activeAd]);
  const closeAd = () => { if (activeAd === "video") setPlaying(true); setActiveAd(null); };
  const trackSongForAds = () => {
    if (premium || role === "premium" || role === "admin") return;
    songsSinceAd.current += 1;
    if (songsSinceAd.current >= adEvery.current) {
      songsSinceAd.current = 0;
      adEvery.current = 7 + Math.round(Math.random());
      setActiveAd(nextAdKind.current);
      nextAdKind.current = nextAdKind.current === "video" ? "popup" : "video";
    }
  };
  const goPremiumFromAd = () => { closeAd(); setPlayerOpen(false); setAccountOpen(false); navigate("pago"); };

  const playSong = (index: number) => { if (index < 0 || !songs[index]) return; loopRef.current = null; setCurrent(index); setProgress(0); setPlaying(true); setStarted(true); };
  const nextSong = () => {
    if (songs.length === 0) return;
    trackSongForAds();
    if (queue.length > 0) {
      const [nextFromQueue, ...rest] = queue;
      setQueue(rest);
      const indexInSongs = songs.findIndex((s) => s.id === nextFromQueue.id);
      if (indexInSongs !== -1) {
        setCurrent(indexInSongs); setProgress(0); setPlaying(true);
        return;
      }
    }
    // Se acabó la playlist: vuelve a empezar con las mismas canciones (no pasa a otras del catálogo)
    const loop = loopRef.current;
    if (loop && loop.length) {
      const order = shuffleRef.current ? [...loop].sort(() => Math.random() - 0.5) : loop;
      const first = songIndex(order[0]);
      if (first !== -1) {
        setQueue(order.slice(1));
        if (first === current) { restartSong(); return; }
        setCurrent(first); setProgress(0); setPlaying(true);
        return;
      }
    }
    const next = getNextIndex(current);
    if (next === current) { restartSong(); return; }
    setCurrent(next); setProgress(0); setPlaying(true);
  };
  const previousSong = () => {
    if (songs.length === 0) return;
    if (progress > 3) { restartSong(); return; }
    let prev = (current - 1 + songs.length) % songs.length;
    for (let step = 0; step < songs.length && isOffline && !downloadsRef.current.has(songs[prev].id); step++) prev = (prev - 1 + songs.length) % songs.length;
    setCurrent(prev);
    setProgress(0); setPlaying(true);
  };
  const handleEnded = () => {
    if (repeatRef.current) restartSong();
    else nextSong();
  };
  const addToQueue = (song: Song) => {
    setQueue((prev) => [...prev, song]);
    setToast(`"${song.title}" agregada a la cola`);
  };
  const toggleShuffle = () => {
    setToast(!isShuffle ? "Reproducción aleatoria activada" : "Reproducción aleatoria desactivada");
    setIsShuffle(!isShuffle);
  };
  const toggleRepeat = () => {
    setToast(!isRepeat ? "Repetir canción activado" : "Repetir canción desactivado");
    setIsRepeat(!isRepeat);
  };
  const navigate = (next: Screen) => { setScreen(next); window.scrollTo({ top: 0, behavior: "smooth" }); };

  controlsRef.current = { next: nextSong, previous: previousSong };

  useEffect(() => {
    if (!currentSong || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || "NextTune",
      artwork: currentSong.artwork ? [{ src: currentSong.artwork, sizes: "512x512" }] : [],
    });
  }, [currentSong?.id]);
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("play", () => setPlaying(true));
    navigator.mediaSession.setActionHandler("pause", () => setPlaying(false));
    navigator.mediaSession.setActionHandler("previoustrack", () => controlsRef.current.previous());
    navigator.mediaSession.setActionHandler("nexttrack", () => controlsRef.current.next());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    };
  }, []);

  const refreshMe = async () => {
    const me = await api<Session>("/me");
    setPerfil(me); setUser(me.user); setPremium(me.premium); setExpired(me.expired);
    return me;
  };

  const access = async (session: Session, fallback?: OfflineCache | null) => {
    setToken(session.token);

    const [localRows, externalRows, f, pl, d] = await Promise.all([
      api<any[]>("/canciones").catch(() => [] as any[]),
      api<any[]>("/external/canciones").catch(() => [] as any[]),
      api<Id[]>("/favoritos").catch(() => fallback?.favs ?? ([] as Id[])),
      api<PlaylistItem[]>("/playlists").catch(() => fallback?.playlists ?? ([] as PlaylistItem[])),
      api<Id[]>("/descargas").catch(() => fallback?.downloads ?? ([] as Id[])),
    ]);

    const cancionesLocales = localRows.map((item) => ({ ...item, full: true }));
    const vistos = new Set<Id>();
    const todas = [...cancionesLocales, ...externalRows, ...(fallback?.catalog ?? [])].filter((item) => {
      if (vistos.has(item.id)) return false;
      vistos.add(item.id);
      return true;
    });

    songs = todas.map(toSong);

    // Guardamos respaldo local para que funcione aunque recargues o apagues el Wi-Fi
    saveOfflineCache({
      session,
      favs: f,
      playlists: pl,
      downloads: d,
      catalog: [...songs.filter((x) => d.includes(x.id)), ...songs.filter((x) => !d.includes(x.id)).slice(0, 150)],
    });

    setFavs(new Set(f)); setPlaylists(pl); setDownloads(new Set(d));
    albumsOwner = session.user.id_usuario;
    setUser(session.user); setPerfil(session); setPremium(session.premium); setExpired(session.expired);
    const sharedId = new URLSearchParams(window.location.search).get("cancion");
    const friendParam = new URLSearchParams(window.location.search).get("amigo");
    const sharedIdx = sharedId ? songs.findIndex((song) => String(song.id) === sharedId) : -1;
    setCurrent(sharedIdx >= 0 ? sharedIdx : 0); setProgress(0); logged.current = -1;
    setStarted(sharedIdx >= 0);
    if (sharedId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      if (sharedIdx >= 0) setPlayerOpen(true);
    }
    if (friendParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const friendId = Number(friendParam);
      if (friendId && friendId !== session.user.id_usuario) {
        api("/amigos/solicitud", "POST", { id_usuario: friendId }).then(() => setToast("Solicitud de amistad enviada")).catch((e) => setToast((e as Error).message));
      }
    }
    setQueue([]);
    setRole(session.role);
    setScreen(!navigator.onLine && d.length > 0 ? "descargas" : "inicio");
  };

  // Restaurar sesión automáticamente si se recarga la página (incluso sin internet)
  useEffect(() => {
    const cached = loadOfflineCache();
    if (!cached) return;
    setToken(cached.session.token);
    if (!navigator.onLine) {
      access(cached.session, cached).catch(() => {});
    } else {
      api<Session>("/me")
        .then((fresh) => access({ ...fresh, token: cached.session.token }, cached))
        .catch(() => access(cached.session, cached));
    }
  }, []);

  const logout = () => {
    clearOfflineCache();
    setToken("");
    setRole(null); setUser(null); setPerfil(null);
    setPlaying(false); setPlayerOpen(false); setAccountOpen(false); setOffline(false);
    setFavs(new Set()); setPlaylists([]); setDownloads(new Set());
    setFriends([]); setNotifs([]); setNotifOpen(false); setStarted(false);
    setQueue([]);
    loopRef.current = null;
    logged.current = -1;
  };

  const toggleFav = async (song: Song) => {
    try {
      const r = await api<{ favorito: boolean }>(`/favoritos/${song.id}`, "POST", song);
      setFavs((items) => { const next = new Set(items); if (r.favorito) next.add(song.id); else next.delete(song.id); return next; });
      setToast(r.favorito ? "Agregada a favoritas ❤️" : "Quitada de favoritas");
    } catch (e) { setToast((e as Error).message); }
  };

  const refreshPlaylists = async () => {
    const pl = await api<PlaylistItem[]>("/playlists");
    setPlaylists(pl);
    const cached = loadOfflineCache();
    if (cached) saveOfflineCache({ ...cached, playlists: pl });
    return pl;
  };

  const playList = (list: Song[], loop?: Song[]) => {
    if (!list.length) return;
    const first = songIndex(list[0]);
    if (first === -1) return;
    setQueue(list.slice(1));
    playSong(first);
    loopRef.current = loop ?? list;
  };

  const addSongToPlaylist = async (pl: PlaylistItem, song: Song) => {
    try { await api(`/playlists/${pl.id}/canciones`, "POST", song); await refreshPlaylists(); setToast(`Agregada a ${pl.name}`); setPickerSong(null); }
    catch (e) { setToast((e as Error).message); }
  };

  const createPlaylistWith = async (name: string, song: Song) => {
    try { await api("/playlists", "POST", { nombre: name, canciones: [song] }); await refreshPlaylists(); setToast(`Playlist “${name}” creada`); setPickerSong(null); }
    catch (e) { setToast((e as Error).message); }
  };

  // Descarga real: guarda el archivo de audio en Cache Storage del navegador para reproducción 100% offline
  const downloadSong = async (song: Song, silent = false) => {
    try {
      const srcUrl = audioSrc(song);
      if (!srcUrl) throw new Error("Esta canción no tiene audio para descargar");
      if (!("caches" in window)) throw new Error("Este navegador no puede guardar música sin conexión aquí (necesita https o localhost)");
      if (isOffline) throw new Error("Necesitas internet para descargar");
      const res = await fetch(srcUrl);
      if (!res.ok) throw new Error("No se pudo descargar el audio de esta canción");
      const blob = await res.blob();
      if (!blob.size) throw new Error("El audio llegó vacío, intenta de nuevo");
      const cache = await caches.open(OFFLINE_AUDIO_CACHE);
      await cache.put(offlineKey(song), new Response(blob, { headers: { "Content-Type": blob.type || res.headers.get("content-type") || "audio/mpeg" } }));
      await api("/descargas", "POST", { ...song, id_cancion: song.id });
      setDownloads((items) => {
        const next = new Set(items).add(song.id);
        const cached = loadOfflineCache();
        if (cached) saveOfflineCache({ ...cached, downloads: [...next], catalog: [...new Map([...cached.catalog, song].map((x) => [x.id, x])).values()] });
        return next;
      });
      if (!silent) setToast("Descargada · Disponible sin conexión");
      return true;
    } catch (e) {
      if (!silent) setToast((e as Error).message || "No se pudo descargar");
      return false;
    }
  };

  const downloadList = async (list: Song[]) => {
    if (!premium) { navigate("membresia"); return; }
    setToast(`Descargando ${list.length} canciones...`);
    let ok = 0;
    for (const s of list) {
      if (await downloadSong(s, true)) ok++;
    }
    setToast(ok === list.length ? `Playlist descargada (${ok} canciones)` : `Se descargaron ${ok} de ${list.length} canciones`);
  };

  // Quitar descargas: borra el audio guardado en el dispositivo y el registro en el servidor
  const saveDownloadsLocal = (next: Set<Id>) => {
    const cached = loadOfflineCache();
    if (cached) saveOfflineCache({ ...cached, downloads: [...next] });
  };
  const removeDownload = async (song: Song) => {
    if (isOffline) { setToast("Necesitas internet para eliminar descargas"); return; }
    try {
      await api("/descargas/eliminar", "POST", { ...song, id_cancion: song.id });
      if ("caches" in window) {
        const cache = await caches.open(OFFLINE_AUDIO_CACHE);
        await cache.delete(offlineKey(song));
        await cache.delete(audioSrc(song));
      }
      setDownloads((items) => { const next = new Set(items); next.delete(song.id); saveDownloadsLocal(next); return next; });
      setToast(`Descarga eliminada: ${song.title}`);
    } catch (e) { setToast((e as Error).message || "No se pudo eliminar la descarga"); }
  };
  const removeAllDownloads = async () => {
    if (isOffline) { setToast("Necesitas internet para eliminar descargas"); return; }
    if (!window.confirm("¿Eliminar todas tus descargas? Tendrás que descargarlas otra vez para escucharlas sin conexión.")) return;
    try {
      await api("/descargas", "DELETE");
      if ("caches" in window) await caches.delete(OFFLINE_AUDIO_CACHE);
      const empty = new Set<Id>();
      saveDownloadsLocal(empty);
      setDownloads(empty);
      setToast("Todas las descargas fueron eliminadas");
    } catch (e) { setToast((e as Error).message || "No se pudo eliminar las descargas"); }
  };

  // Registra en el backend que se compartió (el compartir real lo hace <ShareSheet />)
  const registerShare = (song: Song, _via: string) => {
    api("/compartidos", "POST", { ...song, id_cancion: song.id }).catch(() => {});
  };

  // Salida de audio real: elegir bocina/audífonos (incluye Bluetooth ya emparejado con el dispositivo)
  const chooseOutput = async () => {
    const audio = audioRef.current as any;
    if (!audio) return;
    try {
      const md: any = navigator.mediaDevices;
      if (md?.selectAudioOutput && audio.setSinkId) {
        const dev = await md.selectAudioOutput();
        await audio.setSinkId(dev.deviceId);
        setToast(`Sonando en: ${dev.label || "dispositivo elegido"}`);
        return;
      }
      if (audio.webkitShowPlaybackTargetPicker) { audio.webkitShowPlaybackTargetPicker(); return; } // Safari / AirPlay
      if (audio.remote?.prompt) { await audio.remote.prompt(); return; } // Chrome / Cast
      setToast("Conecta tu Bluetooth en los ajustes del dispositivo y el audio saldrá por ahí");
    } catch (e) {
      const name = (e as DOMException)?.name;
      setToast(name === "NotAllowedError" || name === "AbortError" ? "No elegiste ningún dispositivo" : "No se pudo cambiar la salida de audio");
    }
  };

  // ── Accesibilidad: avisos para lector de pantalla y atajos de teclado ──
  roleRef.current = role;
  adRef.current = activeAd === "video"; // el anuncio de video no se puede saltar con atajos
  useEffect(() => { if (toast) announce(toast); }, [toast]);
  useEffect(() => {
    const s = songs[current];
    if (started && playing && s) announce(`Reproduciendo ${s.title}, de ${s.artist}`);
  }, [current, playing, started]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || !e.shiftKey || e.ctrlKey || e.metaKey) return; // atajos con modificadores (WCAG 2.1.4)
      const c = e.code; // por posición de tecla: funciona con cualquier idioma de teclado
      // Algunos navegadores se quedan con ciertas combinaciones (Chrome usa Alt+Shift+A y +B), por eso hay dos opciones
      if (c === "KeyU" || c === "KeyA") { e.preventDefault(); window.dispatchEvent(new Event("nexttune:a11y")); return; }
      if (!roleRef.current || roleRef.current === "admin" || adRef.current) return; // solo con la app de usuario y sin anuncio en pantalla
      if (c === "KeyP") { e.preventDefault(); setPlaying((p) => !p); }
      else if (c === "ArrowRight" || c === "KeyN") { e.preventDefault(); controlsRef.current.next(); }
      else if (c === "ArrowLeft" || c === "KeyB") { e.preventDefault(); controlsRef.current.previous(); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  if (resetToken) {
    return (
      <>
        <ResetPasswordScreen
          token={resetToken}
          onBack={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setResetToken(null);
          }}
        />
        <A11yLauncher variant="floating" />
      </>
    );
  }

  if (splash) return <div className="flex min-h-screen items-center justify-center bg-ink"><div className="animate-splash"><Logo /><div className="mx-auto mt-5 h-0.5 w-16 overflow-hidden rounded-full bg-line"><div className="h-full animate-load bg-accent" /></div></div></div>;
  if (!role || !user) return <><AccessFlow onAccess={access} /><A11yLauncher variant="floating" /></>;
  if (role === "admin") return <AdminDashboard user={user} avatar={avatar} onAvatar={changeAvatar} onRename={changeName} onLogout={logout} notify={setToast} />;
  if (!currentSong) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas p-6 text-center text-sm text-muted">No hay canciones disponibles. Revisa que los endpoints <code className="text-accent">/canciones</code> y <code className="text-accent">/external/canciones</code> estén respondiendo.<Button onClick={logout}>Salir</Button></div>;

  return (
    <div className="min-h-screen bg-canvas text-white">
      <SkipLink />
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedData={() => { failures.current = 0; setHasAudio(true); }}
        onError={(e) => {
          const a = e.currentTarget;
          const failedSrc = a.getAttribute("src");
          if (!failedSrc) return;
          setHasAudio(false);

          const giveUp = () => {
            failures.current += 1;
            if (playing && failures.current <= 3) { setToast("Esa canción no está disponible, pasando a la siguiente"); controlsRef.current.next(); }
            else {
              setPlaying(false);
              setToast(isOffline ? "Sin conexión: no se pudo cargar el audio de esta canción" : "No se pudo cargar el audio. El enlace pudo caducar; intenta de nuevo en unos segundos");
            }
          };

          // Los enlaces externos (Deezer, iTunes…) CADUCAN: antes de rendirnos pedimos uno nuevo al servidor
          const song = songs[current];
          const retryKey = song ? `${song.id}|${song.file}` : "";
          if (song && /^https?:\/\//i.test(song.file) && !isOffline && !retriedAudio.current.has(retryKey)) {
            retriedAudio.current.add(retryKey);
            api<{ file: string }>(`/external/resolver?${new URLSearchParams({ titulo: song.title, artista: song.artist })}`)
              .then((r) => {
                if (a.getAttribute("src") !== failedSrc) return; // ya cambió de canción mientras tanto
                song.file = r.file;
                a.src = audioSrc(song);
                a.load();
                if (playing) a.play().catch(() => {});
              })
              .catch(() => { if (a.getAttribute("src") === failedSrc) giveUp(); });
            return;
          }
          giveUp();
        }}
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0 && songs[current]) { songs[current].duration = Math.round(d); setTick((t) => t + 1); } }}
        onTimeUpdate={(e) => setProgress(Math.floor(e.currentTarget.currentTime))}
        onEnded={handleEnded}
      />
      <Navigation screen={screen} onNavigate={navigate} friends={friends} pending={pending} />
      <div className="lg:pl-64">
        <Header onAccount={() => setAccountOpen(true)} premium={premium} user={user} avatar={avatar} unread={unread} onBell={openNotifs} />
        {isOffline && <div role="status" className="sticky top-20 z-20 flex items-center justify-center gap-2 border-b border-accent/20 bg-accent px-4 py-2 text-center text-xs font-black text-black"><Icon name="offline" size={16} /> Modo sin conexión: reproduciendo canciones descargadas.</div>}
        {expired && <div role="status" className="flex items-center justify-center gap-3 border-b border-accent/20 bg-accent/10 px-4 py-3 text-center text-xs font-bold text-accent">Tu membresía venció. Renuévala. <button onClick={() => navigate("membresia")} className="underline">Ver planes</button></div>}
        <main id="contenido" tabIndex={-1} className="mx-auto max-w-[90rem] px-4 pb-52 pt-6 sm:px-7 lg:px-10 lg:pb-32">
          {screen === "inicio" && <Home onPlay={playSong} favs={favs} />}
          {screen === "busqueda" && <SearchScreen onPlay={playSong} onQueue={addToQueue} />}
          {screen === "biblioteca" && (
            <Library
              onPlay={playSong}
              onQueue={addToQueue}
              onPremium={() => navigate("membresia")}
              premium={premium}
              favs={favs}
              onToggleFav={toggleFav}
              playlists={playlists}
              downloads={downloads}
              onPlayList={playList}
              onPlaylistsChanged={refreshPlaylists}
              friends={friends}
              onAddToPlaylist={(song) => setPickerSong(song)}
              onDownloadList={downloadList}
              onRemoveDownload={removeDownload}
              onRemoveAllDownloads={removeAllDownloads}
              notify={setToast}
            />
          )}
          {screen === "crear" && (
            <CreatePlaylist
              notify={setToast}
              onSave={async (name, list, coverDataUrl) => {
                const beforeIds = new Set(playlists.map((p) => p.id));
                const created: any = await api("/playlists", "POST", { nombre: name, canciones: list });
                const updated = await refreshPlaylists();
                const newId = created?.id ?? created?.id_playlist ?? updated.find((p) => !beforeIds.has(p.id))?.id;
                if (coverDataUrl && newId != null) {
                  savePlaylistCover(newId, coverDataUrl);
                  setPlaylists((prev) => [...prev]);
                }
                navigate("biblioteca");
              }}
            />
          )}
          {screen === "membresia" && <Membership onPay={() => navigate("pago")} premium={premium} />}
          {screen === "pago" && <Payment onBack={() => navigate("membresia")} onPay={(metodo, tarjeta, id_plan) => api("/pagos", "POST", { metodo, tarjeta, id_plan })} onSuccess={async () => { await refreshMe(); setRole("premium"); setToast("Compra exitosa · Premium activado"); navigate("inicio"); }} />}
          {screen === "descargas" && (
            <Library
              onPlay={playSong}
              onQueue={addToQueue}
              onPremium={() => navigate("membresia")}
              premium={premium}
              favs={favs}
              onToggleFav={toggleFav}
              playlists={playlists}
              downloads={downloads}
              initialTab="Descargas"
              onPlayList={playList}
              onPlaylistsChanged={refreshPlaylists}
              friends={friends}
              onAddToPlaylist={(song) => setPickerSong(song)}
              onDownloadList={downloadList}
              onRemoveDownload={removeDownload}
              onRemoveAllDownloads={removeAllDownloads}
              notify={setToast}
            />
          )}
          {screen === "cuenta" && <Home onPlay={playSong} favs={favs} />}
          {screen === "amigos" && <FriendsScreen friends={friends} me={user} onRequestBy={requestFriendBy} onAnswer={answerFriendRequest} onRemove={removeFriend} notify={setToast} />}
        </main>
      </div>
      {started && <MiniPlayer song={currentSong} playing={playing} progress={progress} onToggle={() => setPlaying(!playing)} onOpen={() => setPlayerOpen(true)} onNext={() => nextSong()} fav={favs.has(currentSong.id)} onFav={() => toggleFav(currentSong)} />}
      {playerOpen && <FullPlayer song={currentSong} playing={playing} progress={progress} onSeek={(value) => { setProgress(value); if (audioRef.current && hasAudio) audioRef.current.currentTime = value; }} onToggle={() => setPlaying(!playing)} onPrevious={() => previousSong()} onNext={() => nextSong()} onClose={() => setPlayerOpen(false)} notify={setToast} premium={premium} onPremium={() => navigate("membresia")} fav={favs.has(currentSong.id)} onFav={() => toggleFav(currentSong)} onAddPlaylist={() => setPickerSong(currentSong)} onShare={() => setShareTarget(currentSong)} onOutput={chooseOutput} onDownload={() => downloadSong(currentSong)} isShuffle={isShuffle} isRepeat={isRepeat} onToggleShuffle={toggleShuffle} onToggleRepeat={toggleRepeat} queue={queue} setQueue={setQueue} onAddToQueue={addToQueue} />}
      {accountOpen && <ProfileModal avatar={avatar} onAvatar={changeAvatar} user={user} perfil={perfil} premium={premium} expired={expired} offline={offline} onOffline={() => { if (premium) setOffline((value) => !value); }} onPlans={() => { setAccountOpen(false); navigate("membresia"); }} onLogout={logout} onClose={() => setAccountOpen(false)} onSave={async (fields) => { await api("/me", "PUT", fields); await refreshMe(); }} notify={setToast} />}
      {pickerSong && <PlaylistPicker song={pickerSong} playlists={playlists} onPick={(pl) => addSongToPlaylist(pl, pickerSong)} onCreate={(n) => createPlaylistWith(n, pickerSong)} onClose={() => setPickerSong(null)} />}
      {activeAd === "video" && <VideoAdModal onDone={closeAd} onPremium={goPremiumFromAd} />}
      {activeAd === "popup" && <PopupAd onDone={closeAd} onPremium={goPremiumFromAd} />}
      {shareTarget && <ShareSheet song={shareTarget} onClose={() => setShareTarget(null)} onShared={registerShare} notify={setToast} friends={friends} onSendFriend={sendSongToFriend} />}
      {notifOpen && <NotificationsPanel notifs={notifs} onClose={() => setNotifOpen(false)} onAnswer={answerNotif} onPlay={playSharedSong} />}
      {toast && <Toast message={toast} />}
      <div className="fixed bottom-28 right-4 z-[45] hidden flex-col gap-2 lg:flex">
        <button
          onClick={() => navigate("membresia")}
          className="rounded-full bg-panel p-3 text-accent shadow-xl"
          aria-label="Membresía Premium"
          title="Membresía Premium"
        >
          <Icon name="crown" />
        </button>
      </div>
    </div>
  );
}