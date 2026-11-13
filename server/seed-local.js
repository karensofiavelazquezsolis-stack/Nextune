import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { pool, q } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.join(__dirname, '..', 'public', 'audio');

// Helper para dejar los nombres limpios sin .mp3, (Official Video), [ID_Youtube], etc.
function limpiarTexto(cadena) {
  return cadena
    .replace(/\.[^/.]+$/, "")                     // Quita la extensión (.mp3)
    .replace(/\[.*?\]/g, "")                      // Quita corchetes [ej. C6gvQA60LmM]
    .replace(/\(.*?\)/g, "")                      // Quita paréntesis (ej. Official Video, Audio, etc.)
    .replace(/official\s*(video|audio|lyric\s*video|visualizer)?/gi, "") // Quita la palabra Official
    .replace(/video\s*oficial/gi, "")            // Quita Video Oficial
    .replace(/letra\s*oficial/gi, "")            // Quita Letra Oficial
    .replace(/\s+/g, " ")                         // Quita espacios dobles
    .trim();                                      // Limpia espacios sobrantes
}

// ---------- GÉNEROS (opcional) ----------
// Para que las canciones locales aparezcan en los chips de género (Pop, Rock, Hip Hop...),
// crea el archivo public/audio/generos.json y asigna el género por ARTISTA o por ARCHIVO:
//
//   {
//     "Bad Bunny": "Reggaetón",
//     "Caifanes": "Rock",
//     "Artista - Canción.mp3": "Pop"
//   }
//
// Si una canción no aparece en el archivo, conserva el género que ya tenga (o el #1 si es nueva).
const generosPath = path.join(audioDir, 'generos.json');
let mapaGeneros = {};
if (fs.existsSync(generosPath)) {
  try {
    mapaGeneros = JSON.parse(fs.readFileSync(generosPath, 'utf8'));
    console.log(`🎼 generos.json cargado (${Object.keys(mapaGeneros).length} entradas)`);
  } catch (e) {
    console.warn('⚠️ generos.json tiene un error de formato y se ignorará:', e.message);
  }
}
const mapaNormalizado = new Map(
  Object.entries(mapaGeneros).map(([clave, genero]) => [clave.trim().toLowerCase(), String(genero).trim()])
);

// Busca primero por nombre de archivo y luego por artista (sin importar mayúsculas)
function generoPara(file, artist) {
  return mapaNormalizado.get(file.trim().toLowerCase()) || mapaNormalizado.get(artist.trim().toLowerCase()) || null;
}

async function obtenerGenero(nombre) {
  const [g] = await q('SELECT id_genero FROM Genero WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [nombre]);
  if (g) return g.id_genero;
  const res = await q('INSERT INTO Genero (nombre) VALUES (?)', [nombre]);
  return res.insertId;
}

async function registrarCancionesLocales() {
  try {
    if (!fs.existsSync(audioDir)) {
      console.error('❌ No se encontró la carpeta public/audio');
      process.exit(1);
    }

    const files = fs.readdirSync(audioDir).filter(f => f.toLowerCase().endsWith('.mp3'));
    console.log(`🎵 Procesando ${files.length} archivos MP3 locales...`);

    for (const file of files) {
      let artist = 'Artista Desconocido';
      let title = file;

      // Si el archivo tiene la estructura "Artista - Canción"
      if (file.includes(' - ')) {
        const parts = file.split(' - ');
        artist = limpiarTexto(parts[0]);
        title = limpiarTexto(parts.slice(1).join(' - '));
      } else {
        title = limpiarTexto(file);
      }

      if (!title) title = 'Sin título';

      // 1. Obtener o crear Artista
      let [art] = await q('SELECT id_artista FROM Artista WHERE LOWER(nombre) = LOWER(?)', [artist]);
      let idArtista;
      if (art) {
        idArtista = art.id_artista;
      } else {
        const resArt = await q('INSERT INTO Artista (nombre) VALUES (?)', [artist]);
        idArtista = resArt.insertId;
      }

      // 2. Obtener o crear Álbum
      let [alb] = await q('SELECT id_album FROM Album WHERE titulo = ? AND id_artista = ?', ['Sencillos Locales', idArtista]);
      let idAlbum;
      if (alb) {
        idAlbum = alb.id_album;
      } else {
        const resAlb = await q('INSERT INTO Album (titulo, anio, id_artista) VALUES (?, 2026, ?)', ['Sencillos Locales', idArtista]);
        idAlbum = resAlb.insertId;
      }

      // 3. Género (solo si está definido en generos.json)
      const nombreGenero = generoPara(file, artist);
      const idGenero = nombreGenero ? await obtenerGenero(nombreGenero) : null;

      // 4. Actualizar o Insertar la canción con el nombre totalmente limpio
      const [cancionExiste] = await q('SELECT id_cancion FROM Cancion WHERE archivo_audio = ?', [file]);
      if (cancionExiste) {
        if (idGenero) {
          await q(
            'UPDATE Cancion SET titulo = ?, id_artista = ?, id_album = ?, id_genero = ? WHERE id_cancion = ?',
            [title, idArtista, idAlbum, idGenero, cancionExiste.id_cancion]
          );
        } else {
          await q(
            'UPDATE Cancion SET titulo = ?, id_artista = ?, id_album = ? WHERE id_cancion = ?',
            [title, idArtista, idAlbum, cancionExiste.id_cancion]
          );
        }
        console.log(`✨ Nombre limpiado: [${artist}] -> ${title}${nombreGenero ? ` (${nombreGenero})` : ''}`);
      } else {
        // La duración 210 es un valor temporal: el reproductor la corrige con la duración real
        // del mp3 apenas carga el audio.
        await q(
          `INSERT INTO Cancion (titulo, duracion, archivo_audio, id_genero, id_album, id_artista) 
           VALUES (?, 210, ?, ?, ?, ?)`,
          [title, file, idGenero ?? 1, idAlbum, idArtista]
        );
        console.log(`✅ Registrada: [${artist}] -> ${title}${nombreGenero ? ` (${nombreGenero})` : ''}`);
      }
    }

    console.log('🎉 ¡Todas las canciones fueron actualizadas con nombres limpios!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al procesar las canciones:', error);
    process.exit(1);
  }
}

registrarCancionesLocales();