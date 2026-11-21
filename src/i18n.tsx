import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

/* ============================================================
   Textos de NextTune (en español)
   Uso:
     const { t, money, fmtDate } = useI18n();
     <button>{t("common.save")}</button>
     t("premium.expiresIn", { days: 12 })  ->  "Vence en 12 días"
   ============================================================ */

export type Lang = "es";
const STORAGE_KEY = "nexttune.lang";

/* Moneda: los precios se guardan en MXN. Solo cambia el formato, no se convierte el valor. */
const LOCALE: Record<Lang, string> = { es: "es-MX" };

type Dict = Record<string, string>;

const esMore: Dict = {
  "nav.create": "Crear",
  "nav.friends": "Amigos",
  "nav.main": "Navegación principal",
  "nav.pendingRequests": " solicitudes pendientes",
  "nav.pendingShort": "Solicitudes pendientes",
  "nav.noFriends": "Aún no tienes amigos. Búscalos en la pestaña Amigos.",
  "nav.unlimited": "Música sin límites",
  "nav.unlimitedDesc": "Descarga tus canciones y escucha sin conexión.",
  "nav.knowPremium": "Conocer Premium",
  "header.tagline": "Tu música, a tu ritmo.",
  "header.notifications": "Notificaciones",
  "header.notificationsUnread": "Notificaciones, {n} sin leer",
  "header.account": "Mi cuenta: {name}, {plan}",
  "header.freePlan": "Plan Gratis",
  "header.freePlanShort": "Plan gratis",
  "player.region": "Reproductor",
  "player.shuffleLabel": "Reproducción aleatoria",
  "player.repeatLabel": "Repetir canción",
  "player.open": "Abrir reproductor. Suena {title}, de {artist}",
  "player.addFav": "Agregar a favoritas",
  "player.removeFav": "Quitar de favoritas",
  "membership.headline": "Escucha sin límites.",
  "membership.sub": "Lleva tu música contigo, incluso cuando no tengas conexión.",
  "membership.free": "GRATIS",
  "membership.forever": "para siempre",
  "membership.freeListen": "Escucha en línea",
  "membership.freePlaylists": "Playlists y favoritas",
  "membership.freeAds": "Anuncios entre canciones",
  "membership.badgeCurrent": "PLAN ACTUAL",
  "membership.badgeRecommended": "RECOMENDADO",
  "membership.badgeSave": "AHORRA MÁS",
  "membership.badgeOffer": "OFERTA",
  "membership.periodMonth": "mes",
  "membership.periodYear": "año",
  "membership.periodDays": "{d} días",
  "membership.priceLine": "MXN / {period}",
  "profile.offlineMode": "Modo sin conexión",
  "profile.bringMusic": "Lleva tu música contigo",
  "profile.bringMusicDesc": "Descarga canciones y escucha sin anuncios.",
  "profile.getPremium": "Obtener Premium",
  "a11y.close": "Cerrar",
  "a11y.closeLabel": "Cerrar panel de accesibilidad",
  "a11y.theme": "Tema",
  "a11y.textSize": "Tamaño del texto",
  "a11y.readingMotion": "Lectura y movimiento",
  "a11y.themeAuto": "Automático",
  "a11y.themeAutoHint": "Sigue tu dispositivo (ahora: {now})",
  "a11y.nowLight": "claro",
  "a11y.nowContrast": "alto contraste",
  "a11y.nowDark": "oscuro",
  "a11y.themeDark": "Oscuro",
  "a11y.themeDarkHint": "Fondo negro y naranja (el original)",
  "a11y.themeLight": "Claro",
  "a11y.themeLightHint": "Fondo claro, ideal con mucha luz",
  "a11y.themeContrast": "Alto contraste",
  "a11y.themeContrastHint": "Blanco y negro, bordes marcados",
  "a11y.sizeNormal": "Normal",
  "a11y.sizeNormalHint": "Tamaño estándar",
  "a11y.sizeLarge": "Grande",
  "a11y.sizeLargeHint": "12 % más grande",
  "a11y.sizeXLarge": "Muy grande",
  "a11y.sizeXLargeHint": "25 % más grande",
  "a11y.reduceMotion": "Reducir movimiento",
  "a11y.reduceMotionHint": "Quita animaciones y detiene el carrusel automático.",
  "a11y.spacing": "Más espacio en el texto",
  "a11y.spacingHint": "Separa letras, palabras y líneas. Ayuda con dislexia y baja visión.",
  "a11y.resetDone": "Se restableció el diseño original",
  "a11y.reset": "Restablecer valores originales",
  "a11y.intro": "Los cambios se aplican al instante y se guardan en este dispositivo.",
  "a11y.sample": "Así se verá el texto de NextTune en tu pantalla.",
  "a11y.shortcuts": "Atajos de teclado",
  "a11y.keyPlay": "Reproducir o pausar",
  "a11y.keyPanel": "Abrir este panel",
  "a11y.keyEsc": "Cerrar ventana abierta",
  "a11y.keyTab": "Moverte entre botones",
  "a11y.launcherLabel": "Accesibilidad: tema, tamaño de texto y movimiento",
  "a11y.launcherRow": "Accesibilidad: tema, texto y movimiento",
};

const es: Dict = {
  ...esMore,
  "common.save": "Guardar",
  "common.cancel": "Cancelar",
  "common.close": "Cerrar",
  "common.done": "Listo",
  "common.delete": "Eliminar",
  "common.edit": "Editar",
  "common.search": "Buscar",
  "common.loading": "Cargando…",
  "common.retry": "Reintentar",
  "common.active": "Activo",
  "common.inactive": "Inactivo",
  "common.new": "Nueva",

  "nav.home": "Inicio",
  "nav.search": "Búsqueda",
  "nav.library": "Biblioteca",
  "nav.membership": "Membresía",
  "nav.profile": "Perfil",

  "player.play": "Reproducir",
  "player.pause": "Pausar",
  "player.next": "Siguiente canción",
  "player.previous": "Canción anterior",
  "player.shuffle": "Aleatorio",
  "player.repeat": "Repetir",
  "player.lyrics": "Letra",
  "player.lyricsUnavailable": "Letra no disponible",
  "player.progress": "{current} de {total}",

  "premium.title": "Premium",
  "premium.perMonth": "{price} MXN / mes",
  "premium.cancelAnytime": "Cancela cuando quieras",
  "premium.noAds": "Sin anuncios",
  "premium.unlimitedDownloads": "Descargas ilimitadas",
  "premium.offline": "Reproducción sin conexión",
  "premium.hq": "Audio de alta calidad",
  "premium.get": "Obtener {plan}",
  "premium.active": "Premium activo",
  "premium.renew": "Renovar",
  "premium.expiresIn": "Vence en {days} días",
  "premium.start": "Inicio",
  "premium.end": "Vencimiento",
  "premium.paymentHistory": "Historial de pagos",
  "premium.noPayments": "Aún no tienes pagos registrados.",

  "downloads.done": "Descarga completa",
  "downloads.failed": "No se pudo descargar. Revisa tu conexión e inténtalo de nuevo.",
  "downloads.needPremium": "Las descargas son para usuarios Premium.",
  "downloads.needConnection": "Necesitas conexión a Internet para escuchar esta canción.",

  "error.server": "No se pudo conectar con el servidor. Revisa tu conexión a Internet e inténtalo de nuevo.",
  "error.generic": "Algo salió mal. Inténtalo de nuevo en unos segundos.",
  "error.required": "Este campo es obligatorio.",

  "a11y.title": "Accesibilidad",

  "welcome.title": "Bienvenido a NextTune",
  "welcome.next": "Siguiente",
  "welcome.skip": "Omitir",
};

const DICTS: Record<Lang, Dict> = { es };

let currentLang: Lang = "es";
export const getLang = (): Lang => currentLang;

/* Helpers fuera de componentes (usan el idioma actual). */
export const formatMoney = (n: number) => `$${Number(n).toLocaleString(LOCALE[currentLang])}`;
export function formatDateStr(value?: string | null): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}
/* Traductor fuera de componentes (usa el idioma actual al momento de llamarse). */
export function tr(key: string, vars?: Record<string, string | number>): string {
  let text = DICTS[currentLang][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}
export const localeOf = (): string => LOCALE[currentLang];

type I18nValue = {
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
  money: (n: number) => string;
  fmtDate: (d: string | number | Date) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  /* <html lang> en español: los lectores de pantalla usan la voz correcta. */
  useEffect(() => {
    document.documentElement.lang = "es";
    /* Borra la preferencia de idioma que se guardó cuando existía el inglés. */
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin acceso a localStorage */ }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const locale = LOCALE.es;
    const t = (key: string, vars?: Record<string, string | number>) => {
      /* Si falta un texto, muestra la clave para no dejar un hueco vacío. */
      let text = es[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
      return text;
    };
    const money = (n: number) => `$${Number(n).toLocaleString(locale)}`;
    const fmtDate = (d: string | number | Date) => {
      const date = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(date.getTime())) return "–";
      return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
    };
    return { lang: "es", t, money, fmtDate };
  }, []);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}