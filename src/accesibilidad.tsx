// =====================================================================
// NextTune · Accesibilidad
//   - Preferencias del usuario (tema, tamaño de texto, movimiento, espaciado)
//   - announce(): avisos para lectores de pantalla (aria-live)
//   - useDialog(): foco atrapado, Escape y retorno del foco en ventanas modales
//   - <A11yLauncher/>: botón + panel "Accesibilidad"
// Las preferencias se guardan en este dispositivo (localStorage) y se aplican
// al <html> ANTES de que React pinte, para evitar parpadeos.
// =====================================================================
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { LanguageSelector, useI18n } from "./i18n";

// ───────────── PREFERENCIAS ─────────────
export type ThemePref = "auto" | "dark" | "light" | "contrast";
export type ResolvedTheme = "dark" | "light" | "contrast";
export type TextSize = "normal" | "large" | "xlarge";
export type Prefs = { theme: ThemePref; textSize: TextSize; reduceMotion: boolean; spacing: boolean };

const KEY = "nt_a11y_v1";
const DEFAULTS: Prefs = { theme: "dark", textSize: "normal", reduceMotion: false, spacing: false };
const THEMES: ThemePref[] = ["auto", "dark", "light", "contrast"];
const SIZES: TextSize[] = ["normal", "large", "xlarge"];

const media = (query: string): MediaQueryList | null =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query) : null;

function load(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return {
        theme: THEMES.includes(p.theme as ThemePref) ? (p.theme as ThemePref) : DEFAULTS.theme,
        textSize: SIZES.includes(p.textSize as TextSize) ? (p.textSize as TextSize) : DEFAULTS.textSize,
        reduceMotion: p.reduceMotion === true,
        spacing: p.spacing === true,
      };
    }
  } catch { /* sin almacenamiento: se usan los valores por defecto */ }
  return { ...DEFAULTS };
}

let prefs: Prefs = load();
const listeners = new Set<() => void>();

export function resolveTheme(p: Prefs = prefs): ResolvedTheme {
  if (p.theme !== "auto") return p.theme;
  if (media("(prefers-contrast: more)")?.matches) return "contrast";
  return media("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}

export function applyPrefs() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(prefs);
  root.dataset.text = prefs.textSize;
  root.dataset.spacing = prefs.spacing ? "on" : "off";
  root.dataset.motion = prefs.reduceMotion || media("(prefers-reduced-motion: reduce)")?.matches ? "reduce" : "";
}

applyPrefs();
["(prefers-color-scheme: light)", "(prefers-contrast: more)", "(prefers-reduced-motion: reduce)"].forEach((q) =>
  media(q)?.addEventListener?.("change", applyPrefs)
);

export function setPrefs(patch: Partial<Prefs>) {
  prefs = { ...prefs, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* ignorar */ }
  applyPrefs();
  listeners.forEach((l) => l());
}
export const resetPrefs = () => setPrefs({ ...DEFAULTS });

const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };
export const usePrefs = (): Prefs => useSyncExternalStore(subscribe, () => prefs, () => prefs);

// true si el usuario pidió menos movimiento (en el panel o en su sistema)
export function useReducedMotion(): boolean {
  const p = usePrefs();
  const [system, setSystem] = useState(() => media("(prefers-reduced-motion: reduce)")?.matches ?? false);
  useEffect(() => {
    const m = media("(prefers-reduced-motion: reduce)");
    if (!m) return;
    const on = () => setSystem(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return p.reduceMotion || system;
}

// ───────────── AVISOS PARA LECTORES DE PANTALLA ─────────────
let politeRegion: HTMLElement | null = null;
let assertiveRegion: HTMLElement | null = null;

function region(kind: "polite" | "assertive"): HTMLElement {
  const existing = kind === "polite" ? politeRegion : assertiveRegion;
  if (existing && document.body.contains(existing)) return existing;
  const el = document.createElement("div");
  el.className = "sr-only";
  el.setAttribute("aria-live", kind);
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("role", kind === "polite" ? "status" : "alert");
  document.body.appendChild(el);
  if (kind === "polite") politeRegion = el; else assertiveRegion = el;
  return el;
}

// La región existe desde el inicio (los lectores ignoran regiones que aparecen junto con su texto)
if (typeof document !== "undefined") {
  const prepare = () => { region("polite"); region("assertive"); };
  if (document.body) prepare(); else window.addEventListener("DOMContentLoaded", prepare, { once: true });
}

export function announce(message: string, kind: "polite" | "assertive" = "polite") {
  if (!message || typeof document === "undefined") return;
  const el = region(kind);
  el.textContent = "";
  window.setTimeout(() => { el.textContent = message; }, 60);
}

// ───────────── VENTANAS MODALES: foco, Escape y retorno del foco ─────────────
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const dialogStack: symbol[] = [];

export function useDialog<T extends HTMLElement = HTMLDivElement>(onClose: () => void, enabled = true) {
  const ref = useRef<T | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node) return;
    const id = Symbol("dialog");
    dialogStack.push(id);
    const previous = document.activeElement as HTMLElement | null;
    const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.getClientRects().length > 0);

    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
    const first = node.querySelector<HTMLElement>("[data-autofocus]") ?? items()[0] ?? node;
    first.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (dialogStack[dialogStack.length - 1] !== id) return; // solo la ventana de arriba responde
      if (e.key === "Escape") { e.stopPropagation(); closeRef.current(); return; }
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) { e.preventDefault(); node.focus(); return; }
      const a = list[0], z = list[list.length - 1], active = document.activeElement;
      if (!node.contains(active)) { e.preventDefault(); a.focus(); }
      else if (e.shiftKey && (active === a || active === node)) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && active === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      const at = dialogStack.indexOf(id);
      if (at >= 0) dialogStack.splice(at, 1);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [enabled]);

  return ref;
}

// Contenedor de ventana modal ya listo (para diálogos declarados dentro de otros componentes)
export function DialogBox({ onClose, label, className = "", children }: { onClose: () => void; label: string; className?: string; children: React.ReactNode }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return <div ref={ref} role="dialog" aria-modal="true" aria-label={label} className={className}>{children}</div>;
}

// ───────────── SALTAR AL CONTENIDO ─────────────
export function SkipLink() {
  return (
    <a
      href="#contenido"
      className="skip-link"
      onClick={(e) => {
        e.preventDefault();
        const target = document.getElementById("contenido");
        target?.focus();
        target?.scrollIntoView();
      }}
    >
      Saltar al contenido
    </a>
  );
}

// ───────────── PANEL DE ACCESIBILIDAD ─────────────
function AccessIcon({ size = 20 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M9 21l3-6.5 3 6.5" />
    </svg>
  );
}

function RadioCard({ name, value, checked, onChange, title, hint, swatch }: { name: string; value: string; checked: boolean; onChange: () => void; title: string; hint?: string; swatch?: string }) {
  return (
    <label className="nt-opt relative block cursor-pointer">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className="nt-opt-card flex items-center gap-3 rounded-xl border border-line bg-canvas p-3 transition peer-checked:border-accent peer-checked:bg-accent-soft">
        {swatch && <span aria-hidden="true" className="size-8 shrink-0 rounded-lg border border-line" style={{ background: swatch }} />}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">{title}</span>
          {hint && <span className="block text-xs text-muted">{hint}</span>}
        </span>
        <span aria-hidden="true" className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-black ${checked ? "border-accent bg-accent text-black" : "border-line text-transparent"}`}>✓</span>
      </span>
    </label>
  );
}

function SwitchRow({ checked, onChange, title, hint }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint: string }) {
  return (
    <label className="nt-opt block cursor-pointer">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="nt-opt-card flex items-center gap-3 rounded-xl border border-line bg-canvas p-3">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">{title}</span>
          <span className="block text-xs text-muted">{hint}</span>
        </span>
        <span className="shrink-0 text-xs font-bold text-muted">{checked ? "Activado" : "Desactivado"}</span>
        <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full border border-line transition ${checked ? "bg-accent" : "bg-panel-strong"}`}>
          <span className={`absolute top-0.5 size-4 rounded-full transition-all ${checked ? "left-[1.35rem] bg-black" : "left-0.5 bg-muted"}`} />
        </span>
      </span>
    </label>
  );
}

const SHORTCUTS: [string, string][] = [
  ["Alt + Shift + P", "a11y.keyPlay"],
  ["Alt + Shift + →", "player.next"],
  ["Alt + Shift + ←", "player.previous"],
  ["Alt + Shift + U", "a11y.keyPanel"],
  ["Esc", "a11y.keyEsc"],
  ["Tab / Shift + Tab", "a11y.keyTab"],
];

export function AccessibilityPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const p = usePrefs();
  const dlg = useDialog<HTMLDivElement>(onClose);
  const resolved = resolveTheme(p);
  const themes: { value: ThemePref; title: string; hint: string; swatch: string }[] = [
    { value: "auto", title: t("a11y.themeAuto"), hint: t("a11y.themeAutoHint", { now: resolved === "light" ? t("a11y.nowLight") : resolved === "contrast" ? t("a11y.nowContrast") : t("a11y.nowDark") }), swatch: "linear-gradient(90deg,#121212 50%,#f4f2ef 50%)" },
    { value: "dark", title: t("a11y.themeDark"), hint: t("a11y.themeDarkHint"), swatch: "#121212" },
    { value: "light", title: t("a11y.themeLight"), hint: t("a11y.themeLightHint"), swatch: "#f4f2ef" },
    { value: "contrast", title: t("a11y.themeContrast"), hint: t("a11y.themeContrastHint"), swatch: "linear-gradient(90deg,#000 50%,#fff 50%)" },
  ];
  const sizes: { value: TextSize; title: string; hint: string }[] = [
    { value: "normal", title: t("a11y.sizeNormal"), hint: t("a11y.sizeNormalHint") },
    { value: "large", title: t("a11y.sizeLarge"), hint: t("a11y.sizeLargeHint") },
    { value: "xlarge", title: t("a11y.sizeXLarge"), hint: t("a11y.sizeXLargeHint") },
  ];

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dlg} role="dialog" aria-modal="true" aria-labelledby="a11y-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-panel p-6 sm:rounded-3xl">
        <div className="sticky top-0 z-10 -mx-6 -mt-6 mb-0 flex items-center justify-between gap-3 border-b border-line bg-panel px-6 py-4">
          <h2 id="a11y-title" className="flex items-center gap-2 text-xl font-black text-white"><span className="text-accent"><AccessIcon size={22} /></span> {t("a11y.title")}</h2>
          <button onClick={onClose} aria-label={t("a11y.closeLabel")} className="rounded-full bg-accent px-5 py-2 text-sm font-black text-black">{t("a11y.close")}</button>
        </div>
        <p className="mt-4 text-sm text-muted">{t("a11y.intro")}</p>

        <fieldset className="mt-6">
          <legend className="text-xs font-bold uppercase tracking-widest text-muted">{t("a11y.theme")}</legend>
          <div className="mt-3 space-y-2">
            {themes.map((th) => <RadioCard key={th.value} name="a11y-theme" value={th.value} checked={p.theme === th.value} onChange={() => setPrefs({ theme: th.value })} title={th.title} hint={th.hint} swatch={th.swatch} />)}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-xs font-bold uppercase tracking-widest text-muted">{t("a11y.textSize")}</legend>
          <div className="mt-3 space-y-2">
            {sizes.map((s) => <RadioCard key={s.value} name="a11y-size" value={s.value} checked={p.textSize === s.value} onChange={() => setPrefs({ textSize: s.value })} title={s.title} hint={s.hint} />)}
          </div>
          <p className="mt-3 rounded-xl bg-canvas p-3 text-sm text-white">{t("a11y.sample")}</p>
        </fieldset>

        <LanguageSelector />

        <fieldset className="mt-6">
          <legend className="text-xs font-bold uppercase tracking-widest text-muted">{t("a11y.readingMotion")}</legend>
          <div className="mt-3 space-y-2">
            <SwitchRow checked={p.reduceMotion} onChange={(v) => setPrefs({ reduceMotion: v })} title={t("a11y.reduceMotion")} hint={t("a11y.reduceMotionHint")} />
            <SwitchRow checked={p.spacing} onChange={(v) => setPrefs({ spacing: v })} title={t("a11y.spacing")} hint={t("a11y.spacingHint")} />
          </div>
        </fieldset>

        <section className="mt-6" aria-labelledby="a11y-keys">
          <h3 id="a11y-keys" className="text-xs font-bold uppercase tracking-widest text-muted">{t("a11y.shortcuts")}</h3>
          <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
            {SHORTCUTS.map(([keys, what]) => (
              <li key={keys} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-white">{t(what)}</span>
                <kbd className="rounded-md border border-line bg-canvas px-2 py-1 text-xs font-bold text-white">{keys}</kbd>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-6 flex gap-3">
          <button onClick={() => { resetPrefs(); announce(t("a11y.resetDone")); }} className="flex-1 rounded-full border border-line bg-panel-strong px-5 py-3 text-sm font-bold text-white">{t("a11y.reset")}</button>
          <button onClick={onClose} className="flex-1 rounded-full bg-accent px-5 py-3 text-sm font-black text-black">{t("common.done")}</button>
        </div>
      </div>
    </div>
  );
}

// Botón que abre el panel. También responde al atajo Alt+Shift+A (evento "nexttune:a11y").
export function A11yLauncher({ variant = "header" }: { variant?: "header" | "floating" | "row" }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("nexttune:a11y", on);
    return () => window.removeEventListener("nexttune:a11y", on);
  }, []);
  const cls = variant === "header"
    ? "relative rounded-full bg-panel p-3 text-muted transition hover:text-white"
    : variant === "row"
      ? "mt-4 flex w-full items-center gap-3 rounded-xl bg-canvas p-3 text-left text-sm font-bold text-white"
      : "fixed right-4 top-4 z-[60] flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 text-sm font-bold text-white shadow-lg";
  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t("a11y.launcherLabel")} aria-haspopup="dialog" title={t("a11y.title")} className={cls}>
        <AccessIcon size={19} />
        {variant === "floating" && <span>{t("a11y.title")}</span>}
        {variant === "row" && <span className="flex-1">{t("a11y.launcherRow")}</span>}
      </button>
      {/* Portal al <body>: el encabezado tiene "backdrop-blur", que atrapa a los elementos fixed y los descuadra */}
      {open && createPortal(<AccessibilityPanel onClose={close} />, document.body)}
    </>
  );
}