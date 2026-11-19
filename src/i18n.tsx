import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ============================================================
   Internacionalización de NextTune (español / inglés)
   Uso:
     const { t, lang, setLang, money, fmtDate } = useI18n();
     <button>{t("common.save")}</button>
     t("premium.expiresIn", { days: 12 })  ->  "Vence en 12 días"
   ============================================================ */

export type Lang = "es" | "en";
const STORAGE_KEY = "nexttune.lang";

/* Moneda: los precios se guardan en MXN. Solo cambia el formato, no se convierte el valor. */
const LOCALE: Record<Lang, string> = { es: "es-MX", en: "en-US" };

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
  "a11y.language": "Idioma",
  "a11y.languageHelp": "Cambia el idioma de la interfaz.",

  "welcome.title": "Bienvenido a NextTune",
  "welcome.next": "Siguiente",
  "welcome.skip": "Omitir",
};

const enMore: Dict = {
  "nav.create": "Create",
  "nav.friends": "Friends",
  "nav.main": "Main navigation",
  "nav.pendingRequests": " pending requests",
  "nav.pendingShort": "Pending requests",
  "nav.noFriends": "You have no friends yet. Find them in the Friends tab.",
  "nav.unlimited": "Unlimited music",
  "nav.unlimitedDesc": "Download your songs and listen offline.",
  "nav.knowPremium": "Discover Premium",
  "header.tagline": "Your music, at your pace.",
  "header.notifications": "Notifications",
  "header.notificationsUnread": "Notifications, {n} unread",
  "header.account": "My account: {name}, {plan}",
  "header.freePlan": "Free plan",
  "header.freePlanShort": "Free plan",
  "player.region": "Player",
  "player.shuffleLabel": "Shuffle",
  "player.repeatLabel": "Repeat song",
  "player.open": "Open player. Now playing {title}, by {artist}",
  "player.addFav": "Add to favorites",
  "player.removeFav": "Remove from favorites",
  "membership.headline": "Listen without limits.",
  "membership.sub": "Take your music with you, even when you have no connection.",
  "membership.free": "FREE",
  "membership.forever": "forever",
  "membership.freeListen": "Listen online",
  "membership.freePlaylists": "Playlists and favorites",
  "membership.freeAds": "Ads between songs",
  "membership.badgeCurrent": "CURRENT PLAN",
  "membership.badgeRecommended": "RECOMMENDED",
  "membership.badgeSave": "SAVE MORE",
  "membership.badgeOffer": "SPECIAL OFFER",
  "membership.periodMonth": "month",
  "membership.periodYear": "year",
  "membership.periodDays": "{d} days",
  "membership.priceLine": "MXN / {period}",
  "profile.offlineMode": "Offline mode",
  "profile.bringMusic": "Take your music with you",
  "profile.bringMusicDesc": "Download songs and listen without ads.",
  "profile.getPremium": "Get Premium",
  "a11y.close": "Close",
  "a11y.closeLabel": "Close accessibility panel",
  "a11y.theme": "Theme",
  "a11y.textSize": "Text size",
  "a11y.readingMotion": "Reading and motion",
  "a11y.themeAuto": "Automatic",
  "a11y.themeAutoHint": "Follows your device (now: {now})",
  "a11y.nowLight": "light",
  "a11y.nowContrast": "high contrast",
  "a11y.nowDark": "dark",
  "a11y.themeDark": "Dark",
  "a11y.themeDarkHint": "Black and orange background (the original)",
  "a11y.themeLight": "Light",
  "a11y.themeLightHint": "Light background, ideal in bright light",
  "a11y.themeContrast": "High contrast",
  "a11y.themeContrastHint": "Black and white, strong borders",
  "a11y.sizeNormal": "Normal",
  "a11y.sizeNormalHint": "Standard size",
  "a11y.sizeLarge": "Large",
  "a11y.sizeLargeHint": "12% larger",
  "a11y.sizeXLarge": "Extra large",
  "a11y.sizeXLargeHint": "25% larger",
  "a11y.reduceMotion": "Reduce motion",
  "a11y.reduceMotionHint": "Removes animations and stops the automatic carousel.",
  "a11y.spacing": "More text spacing",
  "a11y.spacingHint": "Spaces out letters, words and lines. Helps with dyslexia and low vision.",
  "a11y.resetDone": "Original design restored",
  "a11y.reset": "Restore original values",
  "a11y.intro": "Changes apply instantly and are saved on this device.",
  "a11y.sample": "This is how NextTune text will look on your screen.",
  "a11y.shortcuts": "Keyboard shortcuts",
  "a11y.keyPlay": "Play or pause",
  "a11y.keyPanel": "Open this panel",
  "a11y.keyEsc": "Close the open window",
  "a11y.keyTab": "Move between buttons",
  "a11y.launcherLabel": "Accessibility: theme, text size and motion",
  "a11y.launcherRow": "Accessibility: theme, text and motion",
};

/* Textos de la interfaz: la clave es el texto original en español. */
const enTexts: Dict = {
  "Abrir menú de administración": "Open admin menu",
  "Aceptar": "Accept",
  "Administración": "Administration",
  "Administrador": "Administrator",
  "Agregar": "Add",
  "Agregar a la cola": "Add to queue",
  "Agregar a playlist": "Add to playlist",
  "Agregar amigo con correo o código": "Add a friend by email or code",
  "Agregar canción": "Add song",
  "Agregar con correo completo o código (NT-42)": "Add with full email or code (NT-42)",
  "Agregar portada": "Add cover",
  "Aleatorio": "Shuffle",
  "Amigos": "Friends",
  "Anuncio NextTune": "NextTune ad",
  "Anuncio de NextTune Premium": "NextTune Premium ad",
  "Artista": "Artist",
  "Artistas": "Artists",
  "Aún no has agregado canciones a tus favoritas. ¡Toca el corazón de cualquier canción para guardarla aquí!": "You haven't added any songs to your favorites yet. Tap the heart on any song to save it here!",
  "Aún no tienes amigos agregados. Ve a la pestaña": "You have no friends added yet. Go to the",
  "para agregar a alguien y poder enviarle canciones.": "tab to add someone and be able to send them songs.",
  "Aún no tienes amigos. Usa el buscador de arriba para encontrarlos.": "You have no friends yet. Use the search box above to find them.",
  "Aún no tienes playlists. Crea una arriba.": "You have no playlists yet. Create one above.",
  "Basadas en tus reproducciones recientes": "Based on your recent plays",
  "Bienvenido": "Welcome",
  "Borrar búsqueda": "Clear search",
  "Busca por canción o artista para agregar...": "Search by song or artist to add...",
  "Buscando en catálogo...": "Searching the catalog...",
  "Buscando letra...": "Looking for lyrics...",
  "Buscando más resultados...": "Looking for more results...",
  "Buscando...": "Searching...",
  "Buscar canciones para agregar a la playlist": "Search songs to add to the playlist",
  "Buscar canciones, artistas y álbumes": "Search songs, artists and albums",
  "Buscar canción o artista": "Search song or artist",
  "Buscar canción o artista...": "Search song or artist...",
  "Buscar usuarios por nombre": "Search users by name",
  "Buscar usuarios...": "Search users...",
  "Búsqueda": "Search",
  "Cambiar": "Change",
  "Cambiar foto": "Change photo",
  "Cambiar foto de perfil": "Change profile photo",
  "Cambiar nombre": "Change name",
  "Cambiar portada": "Change cover",
  "Cancelar": "Cancel",
  "Canciones": "Songs",
  "Canciones agregadas": "Songs added",
  "Canción eliminada": "Song deleted",
  "Canción quitada": "Song removed",
  "Cargando...": "Loading...",
  "Cerrar": "Close",
  "Cerrar anuncio": "Close ad",
  "Cerrar menú": "Close menu",
  "Cerrar perfil": "Close profile",
  "Cerrar reproductor": "Close player",
  "Cerrar sesión": "Log out",
  "Comenzarás con el Plan Gratis.": "You will start with the Free Plan.",
  "Compartir": "Share",
  "Compartir / enviar a un amigo": "Share / send to a friend",
  "Comprobante": "Receipt",
  "Confirmar contraseña": "Confirm password",
  "Confirmar eliminación de usuario": "Confirm user deletion",
  "Continúa escuchando donde lo dejaste.": "Keep listening where you left off.",
  "Continúa justo donde lo dejaste": "Pick up right where you left off",
  "Contraseña": "Password",
  "Conéctate con otros usuarios, comparte canciones y arma playlists juntos.": "Connect with other users, share songs and build playlists together.",
  "Copiar": "Copy",
  "Copiar enlace": "Copy link",
  "Correo electrónico": "Email",
  "Crea tu cuenta": "Create your account",
  "Crea una nueva contraseña": "Create a new password",
  "Crear": "Create",
  "Crear cuenta": "Create account",
  "Crear playlist": "Create playlist",
  "Crear usuario": "Create user",
  "Código QR para agregarte": "QR code to add you",
  "Código de 6 dígitos": "6-digit code",
  "Código verificado. Ahora crea tu nueva contraseña.": "Code verified. Now create your new password.",
  "Dale forma a una selección que suene a ti.": "Shape a selection that sounds like you.",
  "Descubre nuevos sonidos, crea playlists y lleva tus canciones contigo.": "Discover new sounds, create playlists and take your songs with you.",
  "Destacados de NextTune": "NextTune highlights",
  "Disponible sin conexión": "Available offline",
  "Distribución de usuarios": "User distribution",
  "Duración (días)": "Duration (days)",
  "Editar": "Edit",
  "Editar plan": "Edit plan",
  "El audio pesa más de 25 MB": "The audio file is larger than 25 MB",
  "Elige una imagen": "Choose an image",
  "Eliminar": "Delete",
  "Eliminar amigo": "Remove friend",
  "Eliminar canción": "Delete song",
  "Eliminar usuario": "Delete user",
  "Encuentra canciones, artistas y álbumes.": "Find songs, artists and albums.",
  "Enlace copiado": "Link copied",
  "Enlace copiado: pégalo en Instagram": "Link copied: paste it into Instagram",
  "Enviar a un amigo": "Send to a friend",
  "Escribe un correo completo o un código como NT-42": "Enter a full email or a code like NT-42",
  "Escribe un nombre para la playlist": "Enter a name for the playlist",
  "Escribe un nombre válido": "Enter a valid name",
  "Escucha donde quieras": "Listen anywhere",
  "Escucha sin comerciales": "Listen without ads",
  "Escuchado regularmente": "Listened to regularly",
  "Ese es tu propio código": "That is your own code",
  "Esta playlist está vacía. Usa el botón “Agregar canciones” de arriba para empezar.": "This playlist is empty. Use the “Add songs” button above to get started.",
  "Este plan no se edita.": "This plan cannot be edited.",
  "Explora por género": "Explore by genre",
  "Falta el nombre o el artista": "The name or the artist is missing",
  "Fecha de nacimiento": "Date of birth",
  "Finalizar compra": "Complete purchase",
  "Foto actualizada": "Photo updated",
  "Guardar": "Save",
  "Géneros": "Genres",
  "Imagen de portada cargada": "Cover image loaded",
  "Información de la canción": "Song information",
  "Inicia sesión": "Log in",
  "Iniciar sesión": "Log in",
  "Invitar a la playlist": "Invite to the playlist",
  "Invitar amigo": "Invite friend",
  "Ir al login": "Go to login",
  "JPG o PNG": "JPG or PNG",
  "La contraseña debe tener al menos 6 caracteres": "The password must be at least 6 characters long",
  "La portada pesa más de 4 MB": "The cover is larger than 4 MB",
  "Las contraseñas no coinciden": "The passwords do not match",
  "Las descargas y la reproducción sin conexión están disponibles con Premium.": "Downloads and offline playback are available with Premium.",
  "Letra de la canción": "Song lyrics",
  "Limpiar búsqueda": "Clear search",
  "Los cambios se aplican en Membresía, pago y anuncios.": "Changes apply to Membership, payment and ads.",
  "Membresía Premium": "Premium membership",
  "Menú de administración": "Admin menu",
  "Mezcla para ti": "Mix for you",
  "Mi perfil": "My profile",
  "Modo sin conexión: reproduciendo canciones descargadas.": "Offline mode: playing downloaded songs.",
  "Más opciones…": "More options…",
  "Método": "Method",
  "Música sin límites": "Unlimited music",
  "Necesitas Premium para descargar": "You need Premium to download",
  "Necesitas Premium para descargar playlists completas": "You need Premium to download full playlists",
  "NextTune · Prototipo web responsivo": "NextTune · Responsive web prototype",
  "No encontramos canciones de este género.": "We couldn't find songs in this genre.",
  "No encontramos letra para esta canción.": "We couldn't find lyrics for this song.",
  "No encontramos usuarios con esa búsqueda.": "We couldn't find users for that search.",
  "No hay canciones agregadas a la cola.": "There are no songs in the queue.",
  "No hay canciones disponibles. Revisa que los endpoints": "No songs available. Check that the endpoints",
  "estén respondiendo.": "are responding.",
  "y": "and",
  "No se pudo cargar el QR (revisa tu internet)": "The QR could not be loaded (check your Internet)",
  "No tienes notificaciones por ahora.": "You have no notifications for now.",
  "Nombre": "Name",
  "Nombre actualizado": "Name updated",
  "Nombre completo": "Full name",
  "Nombre de la nueva playlist": "New playlist name",
  "Nombre de la playlist": "Playlist name",
  "Nombre en la tarjeta": "Name on card",
  "Notificaciones": "Notifications",
  "Nueva": "New",
  "Nueva contraseña": "New password",
  "Nueva playlist...": "New playlist...",
  "Nuevas membresías": "New memberships",
  "Nuevo nombre": "New name",
  "Número de tarjeta": "Card number",
  "Obtener Premium": "Get Premium",
  "Pago simulado · no se realizará ningún cargo. Usa una tarjeta terminada en 0 para probar un rechazo.": "Simulated payment · no charge will be made. Use a card ending in 0 to test a rejection.",
  "Panel de control": "Dashboard",
  "Pendiente": "Pending",
  "Perfil actualizado": "Profile updated",
  "Plan actualizado en toda la app": "Plan updated across the app",
  "Playlist eliminada": "Playlist deleted",
  "Playlist guardada": "Playlist saved",
  "Por favor selecciona una imagen JPG o PNG": "Please select a JPG or PNG image",
  "Portada": "Cover",
  "Portada de playlist actualizada": "Playlist cover updated",
  "Precio (MXN)": "Price (MXN)",
  "Progreso de reproducción": "Playback progress",
  "Prueba con otro título, artista o álbum.": "Try another title, artist or album.",
  "Pásale tu código o enlace a un amigo, o que escanee el QR con la cámara de su celular. Al abrirlo e iniciar sesión, te llega su solicitud.": "Share your code or link with a friend, or have them scan the QR with their phone camera. When they open it and log in, you receive their request.",
  "Quitar de favoritas": "Remove from favorites",
  "Quitar de la playlist": "Remove from playlist",
  "Rechazar": "Decline",
  "Recomendaciones para ti": "Recommendations for you",
  "Registro exitoso. Tu cuenta se creó con el Plan Gratis.": "Registration successful. Your account was created with the Free Plan.",
  "Regístrate": "Sign up",
  "Reproduciendo desde": "Playing from",
  "Reproducir": "Play",
  "Revisa nombre, precio y días": "Check name, price and days",
  "Rol actualizado": "Role updated",
  "Salir": "Exit",
  "Selecciona una imagen JPG o PNG": "Select a JPG or PNG image",
  "Si el correo está registrado, te enviamos un código de 6 dígitos. Revisa tu bandeja y el spam.": "If the email is registered, we sent you a 6-digit code. Check your inbox and spam folder.",
  "Sin resultados": "No results",
  "Solicitudes enviadas": "Requests sent",
  "Sube el archivo de audio": "Upload the audio file",
  "Subir portada": "Upload cover",
  "Sí, eliminar": "Yes, delete",
  "Teléfono": "Phone",
  "Todavía no tienes amigos. Agrégalos en la pestaña Amigos.": "You have no friends yet. Add them in the Friends tab.",
  "Todo lo que quieres escuchar": "Everything you want to listen to",
  "en un solo lugar.": "in one place.",
  "Tu biblioteca": "Your library",
  "Tu contraseña": "Your password",
  "Tu código de amigo": "Your friend code",
  "Tu membresía venció. Renuévala.": "Your membership expired. Renew it.",
  "Tu playlist está vacía. Agrega canciones para comenzar.": "Your playlist is empty. Add songs to get started.",
  "Tus descargas": "Your downloads",
  "Tus favoritas": "Your favorites",
  "Usa al menos 6 caracteres.": "Use at least 6 characters.",
  "Usuario Premium": "Premium user",
  "Usuario creado (contraseña demo123)": "User created (password demo123)",
  "Usuario eliminado": "User deleted",
  "Usuario normal": "Regular user",
  "Vas a eliminar al usuario": "You are about to delete the user",
  "Vencimiento": "Expiration",
  "Ver": "View",
  "Ver como usuario": "View as user",
  "Ver planes": "See plans",
  "Ver todo": "See all",
  "Video del anuncio": "Ad video",
  "Volver": "Back",
  "Ya puedes iniciar sesión con tu nueva contraseña.": "You can now log in with your new password.",
  "¡Contraseña actualizada con éxito!": "Password updated successfully!",
  "¡Contraseña actualizada! Te llevamos al inicio de sesión.": "Password updated! Taking you to the login.",
  "¿Aún no tienes cuenta?": "Don't have an account yet?",
  "¿Estás seguro?": "Are you sure?",
  "¿No te llegó? Reenviar código o cambiar correo": "Didn't get it? Resend code or change email",
  "¿Olvidaste tu contraseña?": "Forgot your password?",
  "¿Qué quieres escuchar?": "What do you want to listen to?",
  "Álbumes": "Albums",
  "Últimos 6 meses": "Last 6 months",
  "SELECCIÓN NEXTTUNE": "NEXTTUNE PICKS",
  "Tu mundo suena": "Your world sounds",
  "mejor sin pausas.": "better without pauses.",
  "Una mezcla creada para acompañar tu tarde con nuevos sonidos y tus favoritos de siempre.": "A mix made to go with your afternoon, with new sounds and your all-time favorites.",
  "LO MÁS NUEVO": "WHAT'S NEW",
  "Descubre los": "Discover today's",
  "estrenos del día.": "new releases.",
  "Actualiza tu biblioteca con los sencillos más sonados y artistas en tendencia.": "Update your library with the biggest singles and trending artists.",
  "EXCLUSIVO": "EXCLUSIVE",
  "Tus vibras,": "Your vibes,",
  "tu propio ritmo.": "your own rhythm.",
  "Explora listas personalizadas que se adaptan exactamente à lo que quieres escuchar ahora.": "Explore personalized lists that adapt exactly to what you want to hear right now.",
};

const enTexts2: Dict = {
  "¿Eliminar esta playlist?": "Delete this playlist?",
  "¿Eliminar \"{title}\" del catálogo?": "Delete \"{title}\" from the catalog?",
  "¿Eliminar a {name} de tus amigos?": "Remove {name} from your friends?",
  "Ir a diapositiva {n}": "Go to slide {n}",
  "\"{title}\" agregada a la playlist": "\"{title}\" added to the playlist",
  "Invitaste a {name} a \"{playlist}\"": "You invited {name} to \"{playlist}\"",
  "Enviamos un código a {email}.": "We sent a code to {email}.",
  "Anuncio de NextTune Premium. {desc} Dura {s} segundos y puedes pausarlo.": "NextTune Premium ad. {desc} It lasts {s} seconds and you can pause it.",
  "Anuncio de NextTune: escucha sin comerciales con Premium por {price} pesos al mes.": "NextTune ad: listen without ads with Premium for {price} pesos a month.",
  "compartió contigo la canción “{title}”": "shared the song “{title}” with you",
  "te invitó a su playlist “{title}”": "invited you to their playlist “{title}”",
  "🎵 Escucha \"{title}\" de {artist} en NextTune": "🎵 Listen to \"{title}\" by {artist} on NextTune",
  "Enviaste \"{title}\" a {name}": "You sent \"{title}\" to {name}",
  "\"{title}\" agregada a la cola": "\"{title}\" added to the queue",
  "Agregada a {name}": "Added to {name}",
  "Descargando {n} canciones...": "Downloading {n} songs...",
  "Reproduciendo {title}, de {artist}": "Now playing {title}, by {artist}",
  "Activar sonido": "Turn sound on",
  "Agregar a favoritas": "Add to favorites",
  "Agregada a favoritas ❤️": "Added to favorites ❤️",
  "Quitada de favoritas": "Removed from favorites",
  "Aún no has descargado canciones. Usa el botón Descargar en el reproductor.": "You haven't downloaded any songs yet. Use the Download button in the player.",
  "Aún no hay canciones.": "There are no songs yet.",
  "Aún no tienes playlists. Crea la primera en la sección Crear.": "You have no playlists yet. Create the first one in the Create section.",
  "Buscando canciones...": "Searching songs...",
  "Buscar por canción, artista, álbum o género...": "Search by song, artist, album or genre...",
  "Canción actualizada": "Song updated",
  "Canción agregada al catálogo": "Song added to the catalog",
  "Cerrar buscador": "Close search",
  "Compra exitosa": "Purchase successful",
  "Con NextTune Premium escuchas sin anuncios, descargas tu música y la disfrutas sin conexión.": "With NextTune Premium you listen without ads, download your music and enjoy it offline.",
  "Confirmar compra": "Confirm purchase",
  "Descargar": "Download",
  "Descargas": "Downloads",
  "Editar canción": "Edit song",
  "Editar datos": "Edit details",
  "Enlace de amigo copiado": "Friend link copied",
  "Enviar código": "Send code",
  "Error al guardar la playlist": "Error saving the playlist",
  "Escribe tu código": "Enter your code",
  "Escuchar, buscar, favoritas, playlists": "Listen, search, favorites, playlists",
  "Gestionar usuarios, pagos, roles y catálogo": "Manage users, payments, roles and catalog",
  "Guardando...": "Saving...",
  "Guardar cambios": "Save changes",
  "Guardar contraseña": "Save password",
  "Guardar playlist": "Save playlist",
  "Imagen no válida": "Invalid image",
  "Intentar de nuevo": "Try again",
  "Invitación rechazada": "Invitation declined",
  "Ir a escuchar música": "Go listen to music",
  "Letra": "Lyrics",
  "Mostrar QR": "Show QR",
  "Ocultar QR": "Hide QR",
  "Modo administrador": "Admin mode",
  "No elegiste ningún dispositivo": "You didn't choose a device",
  "No hay más canciones con ese nombre o ya están en tu playlist.": "There are no more songs with that name, or they're already in your playlist.",
  "No pudimos procesar el pago": "We couldn't process the payment",
  "No se pudo cambiar la salida de audio": "Couldn't change the audio output",
  "No se pudo copiar": "Couldn't copy",
  "No se pudo copiar el enlace": "Couldn't copy the link",
  "No se pudo descargar": "Couldn't download",
  "No se pudo guardar el nombre": "Couldn't save the name",
  "No se pudo leer el archivo": "Couldn't read the file",
  "No se pudo leer la imagen": "Couldn't read the image",
  "Nombre de la canción": "Song name",
  "Pago aprobado": "Payment approved",
  "Pago rechazado": "Payment declined",
  "Pausar anuncio": "Pause ad",
  "Reanudar anuncio": "Resume ad",
  "Pausar el cambio automático de diapositivas": "Pause automatic slide changes",
  "Reanudar el cambio automático de diapositivas": "Resume automatic slide changes",
  "Plan base · sin vencimiento": "Base plan · no expiration",
  "Procesando...": "Processing...",
  "Recupera tu contraseña": "Recover your password",
  "Repetir canción activado": "Repeat song on",
  "Repetir canción desactivado": "Repeat song off",
  "Reproducción aleatoria activada": "Shuffle on",
  "Reproducción aleatoria desactivada": "Shuffle off",
  "Silenciar": "Mute",
  "Sin resultados para tu búsqueda.": "No results for your search.",
  "Solicitud rechazada": "Request declined",
  "Te enviaremos un código de 6 dígitos a tu correo.": "We'll send a 6-digit code to your email.",
  "Te uniste a la playlist": "You joined the playlist",
  "Todavía no tienes favoritas. Toca el corazón en el reproductor para guardar una canción.": "You have no favorites yet. Tap the heart in the player to save a song.",
  "Todo lo anterior, descargas y modo sin conexión": "Everything above, plus downloads and offline mode",
  "Tu membresía Premium está lista para activarse.": "Your Premium membership is ready to activate.",
  "Verifica los datos o intenta con otro método.": "Check your details or try another method.",
  "Verificar código": "Verify code",
  "Unirme": "Join",
  "Agregar canciones": "Add songs",
  "Género (opcional)": "Genre (optional)",
  "Álbum (opcional)": "Album (optional)",
  "Correo": "Email",
};

const en: Dict = {
  ...enTexts,
  ...enTexts2,
  ...enMore,
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.done": "Done",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.search": "Search",
  "common.loading": "Loading…",
  "common.retry": "Try again",
  "common.active": "On",
  "common.inactive": "Off",
  "common.new": "New",

  "nav.home": "Home",
  "nav.search": "Search",
  "nav.library": "Library",
  "nav.membership": "Membership",
  "nav.profile": "Profile",

  "player.play": "Play",
  "player.pause": "Pause",
  "player.next": "Next song",
  "player.previous": "Previous song",
  "player.shuffle": "Shuffle",
  "player.repeat": "Repeat",
  "player.lyrics": "Lyrics",
  "player.lyricsUnavailable": "Lyrics not available",
  "player.progress": "{current} of {total}",

  "premium.title": "Premium",
  "premium.perMonth": "{price} MXN / month",
  "premium.cancelAnytime": "Cancel anytime",
  "premium.noAds": "No ads",
  "premium.unlimitedDownloads": "Unlimited downloads",
  "premium.offline": "Offline playback",
  "premium.hq": "High quality audio",
  "premium.get": "Get {plan}",
  "premium.active": "Premium active",
  "premium.renew": "Renew",
  "premium.expiresIn": "Expires in {days} days",
  "premium.start": "Start",
  "premium.end": "Expiration",
  "premium.paymentHistory": "Payment history",
  "premium.noPayments": "You have no payments yet.",

  "downloads.done": "Download complete",
  "downloads.failed": "Download failed. Check your connection and try again.",
  "downloads.needPremium": "Downloads are for Premium users.",
  "downloads.needConnection": "You need an Internet connection to play this song.",

  "error.server": "Could not reach the server. Check your Internet connection and try again.",
  "error.generic": "Something went wrong. Please try again in a few seconds.",
  "error.required": "This field is required.",

  "a11y.title": "Accessibility",
  "a11y.language": "Language",
  "a11y.languageHelp": "Change the interface language.",

  "welcome.title": "Welcome to NextTune",
  "welcome.next": "Next",
  "welcome.skip": "Skip",
};

const DICTS: Record<Lang, Dict> = { es, en };

let currentLang: Lang = "es";
export const getLang = (): Lang => currentLang;

/* Helpers fuera de componentes (usan el idioma actual). */
export const formatMoney = (n: number) => `$${Number(n).toLocaleString(LOCALE[currentLang])}`;
export function formatDateStr(value?: string | null): string {
  if (!value) return "";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return "";
  return currentLang === "en" ? `${m}/${d}/${y}` : `${d}/${m}/${y}`;
}
/* Traductor fuera de componentes (usa el idioma actual al momento de llamarse). */
export function tr(key: string, vars?: Record<string, string | number>): string {
  let text = DICTS[currentLang][key] ?? es[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  return text;
}
export const localeOf = (): string => LOCALE[currentLang];

function readInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch { /* sin acceso a localStorage */ }
  /* Primera vez: español (idioma original). */
  return "es";
}

type I18nValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  money: (n: number) => string;
  fmtDate: (d: string | number | Date) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => { const l = readInitialLang(); currentLang = l; return l; });
  currentLang = lang;

  /* Mantiene <html lang> sincronizado: los lectores de pantalla cambian de voz según este atributo. */
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignorar */ }
  }, []);

  const value = useMemo<I18nValue>(() => {
    const locale = LOCALE[lang];
    const t = (key: string, vars?: Record<string, string | number>) => {
      /* Si falta una traducción, cae al español y luego a la clave, para no mostrar un texto vacío. */
      let text = DICTS[lang][key] ?? es[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
      return text;
    };
    const money = (n: number) => `$${Number(n).toLocaleString(locale)}`;
    const fmtDate = (d: string | number | Date) => {
      const date = d instanceof Date ? d : new Date(d);
      if (Number.isNaN(date.getTime())) return "–";
      return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
    };
    return { lang, setLang, t, money, fmtDate };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n debe usarse dentro de <I18nProvider>");
  return ctx;
}

/* Selector de idioma. Se puede poner dentro del panel de Accesibilidad. */
export function LanguageSelector() {
  const { lang, setLang, t } = useI18n();
  return (
    <fieldset className="mt-4">
      <legend className="text-xs font-bold uppercase tracking-widest text-muted">{t("a11y.language")}</legend>
      <p className="mt-1 text-xs text-muted">{t("a11y.languageHelp")}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {([["es", "Español"], ["en", "English"]] as const).map(([code, label]) => (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={lang === code}
            onClick={() => setLang(code)}
            className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${lang === code ? "border-accent bg-accent text-black" : "border-line bg-panel text-white"}`}
          >
            {label}{lang === code ? " ✓" : ""}
          </button>
        ))}
      </div>
    </fieldset>
  );
}