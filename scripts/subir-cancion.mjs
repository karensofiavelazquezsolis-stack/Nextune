// Sube canciones al catálogo de NextTune desde la terminal.
//
// Una canción:
//   node scripts/subir-cancion.mjs "C:\musica\cancion.mp3" "Título" "Artista" --album "Álbum" --genero "Pop" --portada "C:\img\portada.jpg"
//
// Una carpeta completa (los archivos deben llamarse "Título - Artista.mp3"):
//   node scripts/subir-cancion.mjs --carpeta "C:\musica\yair" --genero "Cumbia"
//   Agrega --prueba para solo ver qué se subiría, sin subir nada.
//
// Para subir al servidor en línea agrega:  --url https://tu-app.up.railway.app
// El correo y la contraseña de administrador se piden al ejecutarlo (o usa ADMIN_EMAIL y ADMIN_PASS).
// Opcional, para que cada canción guarde su duración real:  npm i music-metadata --save-dev
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

const args = process.argv.slice(2);
const flags = {};
const pos = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--prueba') flags.prueba = true;
  else if (args[i].startsWith('--')) { flags[args[i].slice(2)] = args[i + 1]; i++; }
  else pos.push(args[i]);
}

const AUDIO = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];
const MIME = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.flac': 'audio/flac', '.webm': 'audio/webm',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };
const dataUrl = (ruta) => {
  const mime = MIME[path.extname(ruta).toLowerCase()];
  if (!mime) throw new Error(`Formato no permitido: ${path.extname(ruta)}`);
  if (!fs.existsSync(ruta)) throw new Error(`No existe el archivo: ${ruta}`);
  return `data:${mime};base64,${fs.readFileSync(ruta).toString('base64')}`;
};

// "Título - Artista.mp3" → { titulo, artista } (se corta en el ÚLTIMO " - ")
function deNombre(archivo) {
  const base = path.parse(archivo).name.replace(/\s+/g, ' ').trim();
  const i = base.lastIndexOf(' - ');
  if (i > 0) return { titulo: base.slice(0, i).trim(), artista: base.slice(i + 3).trim() };
  return { titulo: base, artista: flags.artista || 'Desconocido' };
}

// Lista de trabajo: una carpeta completa o una sola canción
let trabajos = [];
if (flags.carpeta) {
  if (!fs.existsSync(flags.carpeta)) { console.error(`❌ No existe la carpeta: ${flags.carpeta}`); process.exit(1); }
  trabajos = fs.readdirSync(flags.carpeta)
    .filter((f) => AUDIO.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((f) => ({ ruta: path.join(flags.carpeta, f), ...deNombre(f) }));
  if (!trabajos.length) { console.error('❌ No hay archivos de audio en esa carpeta'); process.exit(1); }
} else {
  const [archivo, titulo, artista] = pos;
  if (!archivo || !titulo || !artista) {
    console.error('Uso: node scripts/subir-cancion.mjs "<archivo.mp3>" "<Título>" "<Artista>" [--album X] [--genero X] [--portada img] [--duracion seg] [--url https://...]\n  o:  node scripts/subir-cancion.mjs --carpeta "<carpeta>" [--genero X] [--album X] [--prueba]');
    process.exit(1);
  }
  trabajos = [{ ruta: archivo, titulo, artista }];
}

if (flags.prueba) {
  console.log(`Se subirían ${trabajos.length} canciones:`);
  trabajos.forEach((t, n) => console.log(`${String(n + 1).padStart(3)}. ${t.titulo}  —  ${t.artista}`));
  process.exit(0);
}

const base = (flags.url || process.env.API_URL || 'http://localhost:3000').replace(/\/$/, '');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const correo = process.env.ADMIN_EMAIL || (await rl.question('Correo de administrador: '));
const contrasena = process.env.ADMIN_PASS || (await rl.question('Contraseña: '));
rl.close();

const post = async (ruta, cuerpo, token) => {
  const r = await fetch(base + ruta, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(cuerpo) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(data.error || `Error ${r.status}`); e.status = r.status; throw e; }
  return data;
};

// Duración real si está instalado music-metadata; si no, el servidor usa 30 s
let leerDuracion = async () => undefined;
try {
  const mm = await import('music-metadata');
  leerDuracion = async (ruta) => { try { const m = await mm.parseFile(ruta, { duration: true }); return m.format.duration ? Math.round(m.format.duration) : undefined; } catch { return undefined; } };
} catch { if (trabajos.length > 1) console.log('(Tip: npm i music-metadata --save-dev para guardar la duración real de cada canción)'); }

let token;
try {
  const sesion = await post('/api/login', { correo, contrasena });
  if (sesion.role !== 'admin') throw new Error('Esa cuenta no es de administrador');
  token = sesion.token;
} catch (e) { console.error('❌', e.message); process.exit(1); }

let ok = 0, repetidas = 0, errores = 0;
for (const [n, t] of trabajos.entries()) {
  const etiqueta = `[${n + 1}/${trabajos.length}] ${t.titulo} — ${t.artista}`;
  try {
    if (fs.statSync(t.ruta).size > 27 * 1024 * 1024) throw new Error('pesa más de 27 MB');
    await post('/api/admin/canciones', {
      title: t.titulo, artist: t.artista, album: flags.album || 'Sencillo', genre: flags.genero || 'Sin género',
      audio: dataUrl(t.ruta), audioName: path.basename(t.ruta),
      artwork: flags.portada ? dataUrl(flags.portada) : undefined,
      duration: flags.duracion ? Number(flags.duracion) : await leerDuracion(t.ruta),
    }, token);
    ok++; console.log(`✅ ${etiqueta}`);
  } catch (e) {
    if (e.status === 409) { repetidas++; console.log(`↪️  ${etiqueta} (ya existía)`); }
    else { errores++; console.log(`❌ ${etiqueta}: ${e.message}`); }
  }
}
console.log(`\nListo: ${ok} subidas, ${repetidas} repetidas, ${errores} con error.`);
process.exit(errores ? 1 : 0);