// Registra en la base de datos las canciones que metas en public/audio
// Uso:  node importar-musica.js
import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { pool, q } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');
const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm']);
const IMG_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// music-metadata es opcional: si está instalado, lee título, artista, álbum, género, duración y portada
let mm = null;
try { mm = await import('music-metadata'); } catch { console.log('(Tip: npm i music-metadata  para leer duración, artista y portada de los mp3)\n'); }

async function idGenero(nombre) {
  nombre = String(nombre || '').trim();
  if (!nombre) { const [g] = await q('SELECT id_genero FROM Genero ORDER BY id_genero LIMIT 1'); return g?.id_genero ?? 1; }
  const [g] = await q('SELECT id_genero FROM Genero WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [nombre]);
  return g ? g.id_genero : (await q('INSERT INTO Genero (nombre) VALUES (?)', [nombre])).insertId;
}
async function idArtista(nombre) {
  const [a] = await q('SELECT id_artista FROM Artista WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [nombre]);
  return a ? a.id_artista : (await q('INSERT INTO Artista (nombre) VALUES (?)', [nombre])).insertId;
}
async function idAlbum(titulo, artistaId, portada) {
  titulo = String(titulo || '').trim() || 'Sencillo';
  if (titulo.toLowerCase() !== 'sencillo') {
    const [a] = await q('SELECT id_album FROM Album WHERE LOWER(titulo) = LOWER(?) AND id_artista = ? LIMIT 1', [titulo, artistaId]);
    if (a) { if (portada) await q('UPDATE Album SET portada = ? WHERE id_album = ?', [portada, a.id_album]); return a.id_album; }
  }
  return (await q('INSERT INTO Album (titulo, anio, portada, id_artista) VALUES (?, ?, ?, ?)', [titulo, new Date().getFullYear(), portada || null, artistaId])).insertId;
}

// Busca portada: imagen con el mismo nombre en public/covers, o la que traiga incrustada el mp3
function portadaPara(base, picture) {
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  for (const e of IMG_EXT) if (fs.existsSync(path.join(COVERS_DIR, base + e))) return '/covers/' + base + e;
  if (picture?.data) {
    const ext = /png/i.test(picture.format) ? '.png' : /webp/i.test(picture.format) ? '.webp' : '.jpg';
    const slug = base.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'portada';
    const nombre = `${slug}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(COVERS_DIR, nombre), picture.data);
    return '/covers/' + nombre;
  }
  return null;
}

fs.mkdirSync(AUDIO_DIR, { recursive: true });
const archivos = fs.readdirSync(AUDIO_DIR).filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()));
const yaRegistrados = new Set((await q('SELECT archivo_audio FROM Cancion')).map((r) => path.basename(String(r.archivo_audio || ''))));
const nuevos = archivos.filter((f) => !yaRegistrados.has(f));

console.log(`Carpeta: ${AUDIO_DIR}`);
console.log(`Archivos de audio: ${archivos.length} · Nuevos por registrar: ${nuevos.length}\n`);

let agregadas = 0;
for (const archivo of nuevos) {
  try {
    const base = path.parse(archivo).name;
    let titulo = base, artista = '', album = '', genero = '', duracion = 30, picture = null;

    // 1) metadatos del mp3 (si hay)
    if (mm) {
      try {
        const { common, format } = await mm.parseFile(path.join(AUDIO_DIR, archivo));
        titulo = common.title || titulo; artista = common.artist || ''; album = common.album || '';
        genero = (common.genre && common.genre[0]) || ''; duracion = Math.round(format.duration || 30); picture = common.picture?.[0] || null;
      } catch {}
    }
    // 2) si el archivo se llama "Artista - Título.mp3" y no había metadatos, se usa el nombre
    const m = /^(.+?)\s+-\s+(.+)$/.exec(base);
    if (m) { if (!artista) artista = m[1].trim(); if (titulo === base) titulo = m[2].trim(); }
    if (!artista) artista = 'Desconocido';

    const [dup] = await q('SELECT c.id_cancion FROM Cancion c JOIN Artista a ON a.id_artista = c.id_artista WHERE LOWER(c.titulo) = LOWER(?) AND LOWER(a.nombre) = LOWER(?) LIMIT 1', [titulo, artista]);
    if (dup) { console.log(`  = Omitida (ya existe): ${artista} - ${titulo}`); continue; }

    const portada = portadaPara(base, picture);
    const aId = await idArtista(artista);
    const alId = await idAlbum(album, aId, portada);
    await q('INSERT INTO Cancion (titulo, duracion, archivo_audio, id_genero, id_album, id_artista) VALUES (?, ?, ?, ?, ?, ?)',
      [titulo, Math.max(1, duracion), archivo, await idGenero(genero), alId, aId]);
    agregadas++;
    console.log(`  + ${artista} - ${titulo}${portada ? '  (con portada)' : ''}`);
  } catch (e) {
    console.log(`  ! Error con "${archivo}": ${e.message}`);
  }
}

console.log(`\nListo: ${agregadas} canción(es) agregada(s).`);
try { await pool.end(); } catch {}
process.exit(0);