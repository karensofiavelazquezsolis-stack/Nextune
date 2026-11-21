import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import nodemailer from 'nodemailer';
import 'dotenv/config';
import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');
import { pool, q } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use('/api/admin/canciones', express.json({ limit: '40mb' })); // audio + portada en base64
app.use(express.json({ limit: '1mb' }));

const sessions = new Map(); // token -> id_usuario (en memoria)
const fail = (res, code, msg) => res.status(code).json({ error: msg });
const h = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) => {
    console.error(e);
    fail(res, 500, 'Error del servidor');
  });

// Aviso de Jamendo: se muestra una sola vez al arrancar
if (!process.env.JAMENDO_CLIENT_ID) {
  console.warn('⚠️ Falta JAMENDO_CLIENT_ID en .env: solo se usarán Deezer e iTunes');
}

// ---------- CONFIGURACIÓN DE NODEMAILER ----------
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error('❌ Error en la configuración de correo (Nodemailer):', error.message);
  } else {
    console.log('📧 Servidor listo para enviar correos de recuperación');
  }
});

// ---------- HELPERS Y ESTADO DE SESIÓN ----------
const pub = (u) => ({
  id_usuario: u.id_usuario, nombre: u.nombre, correo: u.correo,
  telefono: u.telefono, fecha_nacimiento: u.fecha_nacimiento, id_rol: u.id_rol,
});

async function estado(uid) {
  const [activa] = await q(
    `SELECT m.nombre AS plan, m.precio, s.fecha_inicio, s.fecha_fin,
            DATEDIFF(s.fecha_fin, CURDATE()) AS dias
       FROM Suscripcion s JOIN Membresia m ON m.id_membresia = s.id_membresia
      WHERE s.id_usuario = ? AND s.estado = 'activa' AND s.fecha_fin >= CURDATE()
      ORDER BY s.fecha_fin DESC LIMIT 1`, [uid]);
  const [venc] = await q(
    `SELECT 1 AS x FROM Suscripcion
      WHERE id_usuario = ? AND estado IN ('activa','vencida') AND fecha_fin < CURDATE() LIMIT 1`, [uid]);
  return { premium: !!activa, expired: !activa && !!venc, suscripcion: activa || null };
}

async function pagosDe(uid) {
  const rows = await q(
    `SELECT monto, fecha_pago AS fecha, metodo_pago AS metodo, estado
       FROM Pago WHERE id_usuario = ? ORDER BY id_pago DESC LIMIT 20`, [uid]);
  return rows.map((p) => ({ ...p, plan: p.monto >= 800 ? 'Premium anual' : 'Premium mensual' }));
}

async function sesion(u) {
  const st = await estado(u.id_usuario);
  const role = u.id_rol === 1 ? 'admin' : st.premium ? 'premium' : 'normal';
  return { user: { ...pub(u), foto: await fotoDe(u.id_usuario) }, role, ...st };
}

const auth = h(async (req, res, next) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const id = sessions.get(token);
  if (!id) return fail(res, 401, 'Sesión inválida. Vuelve a iniciar sesión.');
  const [u] = await q('SELECT * FROM Usuario WHERE id_usuario = ?', [id]);
  if (!u) { sessions.delete(token); return fail(res, 401, 'Sesión inválida.'); }
  req.user = u;
  next();
});

const adminOnly = (req, res, next) => (req.user.id_rol === 1 ? next() : fail(res, 403, 'Solo administradores'));

// El plan de pago NUNCA es "Gratis": se usa el id pedido o, por defecto, el Premium más corto
async function planPremium(id) {
  if (id) { const [p] = await q(`SELECT * FROM Membresia WHERE id_membresia = ? AND LOWER(nombre) NOT LIKE '%grat%'`, [Number(id)]); if (p) return p; }
  const [p] = await q(`SELECT * FROM Membresia WHERE LOWER(nombre) NOT LIKE '%grat%' ORDER BY duracion_dias ASC, id_membresia ASC LIMIT 1`);
  return p;
}

async function activarPremium(uid, idPlan) {
  const plan = await planPremium(idPlan);
  const [vigente] = await q(
    `SELECT fecha_fin FROM Suscripcion
      WHERE id_usuario = ? AND estado = 'activa' AND fecha_fin >= CURDATE()
      ORDER BY fecha_fin DESC LIMIT 1`, [uid]);
  await q(`UPDATE Suscripcion SET estado = 'reemplazada' WHERE id_usuario = ? AND estado = 'activa'`, [uid]);
  await q(
    `INSERT INTO Suscripcion (fecha_inicio, fecha_fin, estado, id_usuario, id_membresia)
     VALUES (CURDATE(), DATE_ADD(GREATEST(CURDATE(), COALESCE(?, CURDATE())), INTERVAL ? DAY), 'activa', ?, ?)`,
    [vigente?.fecha_fin || null, plan.duracion_dias, uid, plan.id_membresia]);
  return plan;
}

// ---------- HELPER DE SINCRONIZACIÓN AUTO-INSERT MYSQL (PROTEGIDO) ----------
async function asegurarCancionBaseDatos(datosCancion) {
  const { id_cancion, id, title, artist, album, genre, year, duration, file, artwork } = datosCancion || {};

  const targetId = id_cancion || id;

  if (targetId && !isNaN(Number(targetId))) {
    const [ex] = await q('SELECT id_cancion FROM Cancion WHERE id_cancion = ?', [Number(targetId)]);
    if (ex) return ex.id_cancion;
  }

  if (!file) return null;

  const [cancionExistente] = await q(
    `SELECT c.id_cancion FROM Cancion c 
       JOIN Artista a ON a.id_artista = c.id_artista 
      WHERE c.archivo_audio = ? OR (LOWER(c.titulo) = LOWER(?) AND LOWER(a.nombre) = LOWER(?))
      LIMIT 1`,
    [file, title || 'Desconocido', artist || 'Desconocido']
  );
  if (cancionExistente) return cancionExistente.id_cancion;

  let idGenero = 1; 
  if (genre) {
    const [g] = await q('SELECT id_genero FROM Genero WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [genre]);
    if (g) {
      idGenero = g.id_genero;
    } else {
      const resG = await q('INSERT INTO Genero (nombre) VALUES (?)', [genre]);
      idGenero = resG.insertId;
    }
  }

  let idArtista;
  const [art] = await q('SELECT id_artista FROM Artista WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [artist || 'Artista desconocido']);
  if (art) {
    idArtista = art.id_artista;
  } else {
    const resArt = await q('INSERT INTO Artista (nombre, imagen) VALUES (?, ?)', [artist || 'Artista desconocido', artwork || null]);
    idArtista = resArt.insertId;
  }

  let idAlbum;
  const [alb] = await q('SELECT id_album FROM Album WHERE LOWER(titulo) = LOWER(?) AND id_artista = ? LIMIT 1', [album || 'Sencillo', idArtista]);
  if (alb) {
    idAlbum = alb.id_album;
  } else {
    const resAlb = await q(
      'INSERT INTO Album (titulo, anio, portada, id_artista) VALUES (?, ?, ?, ?)',
      [album || 'Sencillo', year || new Date().getFullYear(), artwork || null, idArtista]
    );
    idAlbum = resAlb.insertId;
  }

  const resCancion = await q(
    `INSERT INTO Cancion (titulo, duracion, archivo_audio, id_genero, id_album, id_artista)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [title || 'Sin título', duration || 30, file, idGenero, idAlbum, idArtista]
  );

  return resCancion.insertId;
}

// ---------- AUTENTICACIÓN ----------
app.post('/api/registro', h(async (req, res) => {
  const { nombre, correo, telefono, fecha_nacimiento, contrasena } = req.body;
  if (!nombre || !correo || !contrasena || contrasena.length < 6) return fail(res, 400, 'Completa todos los datos (contraseña de 6+ caracteres)');
  if ((await q('SELECT 1 FROM Usuario WHERE correo = ?', [correo])).length) return fail(res, 409, 'Ese correo ya está registrado');
  const hash = await bcrypt.hash(contrasena, 10);
  await q('INSERT INTO Usuario (nombre, correo, telefono, fecha_nacimiento, contrasena_hash, id_rol) VALUES (?,?,?,?,?,2)',
    [nombre, correo, telefono || null, fecha_nacimiento || null, hash]);
  res.json({ ok: true });
}));

app.post('/api/login', h(async (req, res) => {
  const { correo, contrasena } = req.body;
  const [u] = await q('SELECT * FROM Usuario WHERE correo = ?', [correo]);
  if (!u || !u.contrasena_hash || !(await bcrypt.compare(contrasena || '', u.contrasena_hash)))
    return fail(res, 401, 'Correo o contraseña incorrectos');
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, u.id_usuario);
  res.json({ token, ...(await sesion(u)) });
}));

app.post('/api/auth/google', h(async (req, res) => {
  const { token: googleToken } = req.body;
  if (!googleToken) return fail(res, 400, 'Token de Google requerido');

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${googleToken}`);
  if (!response.ok) return fail(res, 401, 'Token de Google inválido');

  const data = await response.json();
  const { email, name } = data;
  if (!email) return fail(res, 401, 'No se pudo obtener el correo de Google');

  let [u] = await q('SELECT * FROM Usuario WHERE correo = ?', [email]);
  if (!u) {
    const randomHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const r = await q(
      'INSERT INTO Usuario (nombre, correo, contrasena_hash, id_rol) VALUES (?, ?, ?, 2)',
      [name || 'Usuario Google', email, randomHash]
    );
    [u] = await q('SELECT * FROM Usuario WHERE id_usuario = ?', [r.insertId]);
  }

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, u.id_usuario);
  res.json({ token, ...(await sesion(u)) });
}));

// ---------- RECUPERACIÓN DE CONTRASEÑA ----------
const hashCodigo = (codigo) => crypto.createHash('sha256').update(codigo).digest('hex');

async function comprobarCodigo(correo, codigo) {
  const [r] = await q(
    `SELECT r.id_recuperacion, r.token, r.intentos, r.id_usuario
       FROM RecuperacionContrasena r
       JOIN Usuario u ON u.id_usuario = r.id_usuario
      WHERE LOWER(u.correo) = ? AND r.estado = 'pendiente' AND r.fecha_expiracion >= NOW()
      ORDER BY r.id_recuperacion DESC LIMIT 1`,
    [correo]
  );
  if (!r) return { error: [400, 'Código inválido o vencido'] };

  if (r.intentos >= 5) {
    await q("UPDATE RecuperacionContrasena SET estado = 'cancelado' WHERE id_recuperacion = ?", [r.id_recuperacion]);
    return { error: [429, 'Demasiados intentos. Solicita un código nuevo.'] };
  }

  const enviado = Buffer.from(hashCodigo(codigo));
  const guardado = Buffer.from(String(r.token));
  const ok = enviado.length === guardado.length && crypto.timingSafeEqual(enviado, guardado);
  if (!ok) {
    await q('UPDATE RecuperacionContrasena SET intentos = intentos + 1 WHERE id_recuperacion = ?', [r.id_recuperacion]);
    return { error: [400, 'Código incorrecto'] };
  }
  return { r };
}

app.post('/api/recuperar', h(async (req, res) => {
  const correo = String(req.body.correo || '').trim().toLowerCase();
  const [u] = await q('SELECT id_usuario, nombre FROM Usuario WHERE LOWER(correo) = ?', [correo]);

  if (u) {
    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await q("UPDATE RecuperacionContrasena SET estado = 'cancelado' WHERE id_usuario = ? AND estado = 'pendiente'", [u.id_usuario]);
    await q(
      `INSERT INTO RecuperacionContrasena (fecha_solicitud, fecha_expiracion, estado, token, id_usuario, intentos)
       VALUES (NOW(), DATE_ADD(NOW(), INTERVAL 15 MINUTE), 'pendiente', ?, ?, 0)`,
      [hashCodigo(codigo), u.id_usuario]
    );

    try {
      await transporter.sendMail({
        from: `"NextTune Soporte" <${process.env.EMAIL_USER}>`,
        to: correo,
        subject: 'Tu código de recuperación - NextTune',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 420px; margin: auto; padding: 24px; color: #333;">
            <h2>Hola ${u.nombre}</h2>
            <p>Usa este código para restablecer tu contraseña en NextTune:</p>
            <p style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #ff6a00; margin: 20px 0;">${codigo}</p>
            <p style="font-size: 12px; color: #777;">El código vence en 15 minutos. Si tú no lo solicitaste, ignora este mensaje.</p>
          </div>
        `,
      });
    } catch (mailError) {
      console.error('❌ Error al enviar correo con Nodemailer:', mailError);
      return fail(res, 500, 'No se pudo enviar el correo. Intenta de nuevo.');
    }
  }

  res.json({ ok: true, message: 'Si el correo está registrado, recibirás un código.' });
}));

app.post('/api/recuperar/verificar', h(async (req, res) => {
  const correo = String(req.body.correo || '').trim().toLowerCase();
  const codigo = String(req.body.codigo || '').trim();
  if (!correo || !codigo) return fail(res, 400, 'Escribe el código recibido');

  const { error } = await comprobarCodigo(correo, codigo);
  if (error) return fail(res, error[0], error[1]);
  res.json({ ok: true });
}));

app.post('/api/recuperar/validar', h(async (req, res) => {
  const correo = String(req.body.correo || '').trim().toLowerCase();
  const codigo = String(req.body.codigo || '').trim();
  const contrasena = String(req.body.contrasena || '');

  if (contrasena.length < 6) return fail(res, 400, 'La contraseña debe tener al menos 6 caracteres');
  if (!correo || !codigo) return fail(res, 400, 'Solicitud incompleta');

  const { r, error } = await comprobarCodigo(correo, codigo);
  if (error) return fail(res, error[0], error[1]);

  await q('UPDATE Usuario SET contrasena_hash = ? WHERE id_usuario = ?', [await bcrypt.hash(contrasena, 10), r.id_usuario]);
  await q("UPDATE RecuperacionContrasena SET estado = 'usado' WHERE id_recuperacion = ?", [r.id_recuperacion]);
  res.json({ ok: true });
}));

// ---------- CATÁLOGO INTERNO ----------
const CANCIONES_SQL = `
  SELECT c.id_cancion AS id, c.titulo AS title, a.nombre AS artist, al.titulo AS album,
         g.nombre AS genre, al.anio AS year, c.duracion AS duration, c.archivo_audio AS file,
         al.portada AS artwork, c.id_artista, c.id_genero
    FROM Cancion c
    JOIN Artista a ON a.id_artista = c.id_artista
    LEFT JOIN Album al ON al.id_album = c.id_album
    LEFT JOIN Genero g ON g.id_genero = c.id_genero`;
const sinIds = ({ id_artista, id_genero, ...resto }) => resto;

app.get('/api/canciones', h(async (_req, res) => {
  const audioDir = path.join(__dirname, '..', 'public', 'audio');
  const rows = await q(`${CANCIONES_SQL} ORDER BY c.id_cancion`);
  const ok = rows.filter((r) => {
    const f = String(r.file || '');
    if (/^https?:\/\//i.test(f)) return true;
    return fs.existsSync(path.join(audioDir, path.basename(f.replace(/\\/g, '/'))));
  });
  res.json(ok.map(sinIds));
}));

// ---------- RECOMENDACIONES PARA EL USUARIO ----------
app.get('/api/recomendaciones', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const escuchadas = await q(
    `SELECT x.id_cancion FROM (
        SELECT id_cancion FROM HistorialReproduccion WHERE id_usuario = ?
        UNION ALL
        SELECT id_cancion FROM Favorito WHERE id_usuario = ?
     ) x`, [uid, uid]);
  if (!escuchadas.length) return res.json([]);

  const peso = new Map();
  escuchadas.forEach((r) => peso.set(r.id_cancion, (peso.get(r.id_cancion) || 0) + 1));

  const todas = await q(`${CANCIONES_SQL} ORDER BY c.id_cancion`);
  const artistas = new Map();
  const generos = new Map();
  for (const c of todas) {
    const n = peso.get(c.id);
    if (!n) continue;
    artistas.set(c.id_artista, (artistas.get(c.id_artista) || 0) + n);
    generos.set(c.id_genero, (generos.get(c.id_genero) || 0) + n);
  }

  const lista = todas
    .filter((c) => !peso.has(c.id))
    .map((c) => ({
      c,
      score: (artistas.get(c.id_artista) || 0) * 3 + (generos.get(c.id_genero) || 0) * 2 + Math.random(),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ c }) => sinIds(c));

  res.json(lista);
}));

// ---------- LETRAS ----------
const LRCLIB_HEADERS = { 'User-Agent': 'NextTune/1.0 (proyecto escolar UPVT)' };
const cacheLetras = new Map();
const audioDirLetras = path.join(__dirname, '..', 'public', 'audio');
const TIENE_TIEMPOS = /\[\d+:\d+(?:\.\d+)?\]/;

const quitarTiempos = (lrc = '') => lrc.replace(/\[[^\]]*\]\s*/g, '').trim();
const limpiarTitulo = (t = '') =>
  String(t)
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\s[-–]\s.*(remaster|live|en vivo|version|versión|edit|mix).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
const normTxt = (s = '') => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Letra propia: public/audio/<mismo nombre que el mp3>.lrc (tiene prioridad sobre internet)
function leerLrcLocal(archivo) {
  try {
    const base = path.basename(String(archivo || '').replace(/\\/g, '/')).replace(/\.[^/.]+$/, '');
    for (const ext of ['.lrc', '.txt']) {
      const p = path.join(audioDirLetras, base + ext);
      if (fs.existsSync(p)) {
        const texto = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
        if (texto.trim()) return { contenido: texto, sincronizada: TIENE_TIEMPOS.test(texto) ? 1 : 0 };
      }
    }
  } catch { /* sin archivo .lrc */ }
  return null;
}

async function buscarLrclib({ titulo, artista, duracion }) {
  const track = limpiarTitulo(titulo);
  const limpio = limpiarTitulo(artista);
  const artist = /desconocid/i.test(limpio) ? '' : limpio;
  if (!track) return null;

  const getJson = (url) =>
    fetch(url, { headers: LRCLIB_HEADERS, signal: AbortSignal.timeout(6000) })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

  const conDuracion = duracion > 60;
  let resultados = [];

  if (conDuracion && artist) {
    const exacta = await getJson(
      `https://lrclib.net/api/get?${new URLSearchParams({ track_name: track, artist_name: artist, duration: String(Math.round(duracion)) })}`
    );
    if (exacta) resultados.push(exacta);
  }

  const intentos = [];
  if (artist) intentos.push({ track_name: track, artist_name: artist });
  intentos.push({ q: `${track} ${artist}`.trim() });
  if (artist) intentos.push({ q: track });

  for (const params of intentos) {
    if (resultados.some((r) => r && r.syncedLyrics)) break;
    const lista = await getJson(`https://lrclib.net/api/search?${new URLSearchParams(params)}`);
    if (Array.isArray(lista)) resultados = resultados.concat(lista);
  }

  // Solo letras que correspondan de verdad a la canción (evita letras de otra canción)
  const nt = normTxt(track), na = normTxt(artist);
  resultados = resultados.filter((r) => {
    if (!r || r.instrumental) return false;
    const rt = normTxt(r.trackName), ra = normTxt(r.artistName);
    const tituloOk = rt && nt && (rt.includes(nt) || nt.includes(rt));
    const artistaOk = !na || (ra && (ra.includes(na) || na.includes(ra)));
    return tituloOk && artistaOk;
  });
  if (!resultados.length) return null;

  const diferencia = (r) => (conDuracion ? Math.abs((r.duration || 0) - duracion) : 0);
  const conTiempo = resultados.filter((r) => r.syncedLyrics).sort((a, b) => diferencia(a) - diferencia(b));
  const mejor = conTiempo[0];

  if (mejor && (!conDuracion || diferencia(mejor) <= 12)) {
    return { contenido: mejor.syncedLyrics, sincronizada: 1 };
  }
  const plana = resultados.find((r) => r.plainLyrics);
  if (plana) return { contenido: plana.plainLyrics, sincronizada: 0 };
  if (mejor) return { contenido: quitarTiempos(mejor.syncedLyrics), sincronizada: 0 };
  return null;
}

async function guardarLetra(idCancion, { contenido, sincronizada }) {
  try {
    const [ex] = await q('SELECT contenido FROM Letra WHERE id_cancion = ?', [idCancion]);
    if (!ex) {
      await q('INSERT INTO Letra (contenido, sincronizada, id_cancion) VALUES (?, ?, ?)', [contenido, sincronizada, idCancion]);
    } else if (sincronizada || !String(ex.contenido || '').trim()) {
      await q('UPDATE Letra SET contenido = ?, sincronizada = ? WHERE id_cancion = ?', [contenido, sincronizada, idCancion]);
    }
  } catch (e) {
    console.warn('No se pudo guardar la letra en MySQL:', e.message);
  }
}

app.get('/api/canciones/:id/letra', h(async (req, res) => {
  const id = String(req.params.id);
  const esLocal = /^\d+$/.test(id);
  const preview = req.query.preview === '1';
  let titulo = String(req.query.titulo || '');
  let artista = String(req.query.artista || '');
  const duracion = Number(req.query.duracion) || 0;

  let guardada = null;
  if (esLocal) {
    // 1) ¿Hay un .lrc junto al mp3?  (public/audio/<nombre>.lrc)
    const [fila] = await q('SELECT archivo_audio FROM Cancion WHERE id_cancion = ?', [Number(id)]);
    const propia = fila ? leerLrcLocal(fila.archivo_audio) : null;
    if (propia) {
      return res.json(preview && propia.sincronizada
        ? { contenido: quitarTiempos(propia.contenido), sincronizada: 0 }
        : propia);
    }

    // 2) ¿Ya se guardó una letra sincronizada en MySQL?
    [guardada] = await q('SELECT contenido, sincronizada FROM Letra WHERE id_cancion = ?', [Number(id)]);
    const tiene = guardada && String(guardada.contenido || '').trim();
    if (tiene && guardada.sincronizada) {
      return res.json(preview
        ? { contenido: quitarTiempos(guardada.contenido), sincronizada: 0 }
        : { contenido: guardada.contenido, sincronizada: 1 });
    }
    if (!titulo) {
      const [c] = await q(
        'SELECT c.titulo, a.nombre AS artista FROM Cancion c JOIN Artista a ON a.id_artista = c.id_artista WHERE c.id_cancion = ?',
        [Number(id)]);
      if (c) { titulo = c.titulo; artista = c.artista; }
    }
  }

  const claveCache = `${id}|${preview ? 1 : 0}|${Math.round(duracion)}`;
  if (cacheLetras.has(claveCache)) return res.json(cacheLetras.get(claveCache));

  const hallada = titulo ? await buscarLrclib({ titulo, artista, duracion: preview ? 0 : duracion }) : null;

  let respuesta = hallada
    || (guardada && String(guardada.contenido || '').trim() ? { contenido: guardada.contenido, sincronizada: guardada.sincronizada ? 1 : 0 } : { contenido: '', sincronizada: 0 });
  if (preview && respuesta.sincronizada) respuesta = { contenido: quitarTiempos(respuesta.contenido), sincronizada: 0 };

  if (hallada) {
    cacheLetras.set(claveCache, respuesta);
    if (esLocal && !preview) await guardarLetra(Number(id), hallada);
  }
  res.json(respuesta);
}));

// ---------- PERFIL ----------
app.get('/api/me', auth, h(async (req, res) => {
  res.json({ ...(await sesion(req.user)), pagos: await pagosDe(req.user.id_usuario) });
}));

app.put('/api/me', auth, h(async (req, res) => {
  const { correo, telefono, fecha_nacimiento } = req.body;
  if (!correo) return fail(res, 400, 'El correo es obligatorio');
  const dup = await q('SELECT 1 FROM Usuario WHERE correo = ? AND id_usuario <> ?', [correo, req.user.id_usuario]);
  if (dup.length) return fail(res, 409, 'Ese correo ya está en uso');
  await q('UPDATE Usuario SET correo = ?, telefono = ?, fecha_nacimiento = ? WHERE id_usuario = ?',
    [correo, telefono || null, fecha_nacimiento || null, req.user.id_usuario]);
  res.json({ ok: true });
}));

app.put('/api/me/nombre', auth, h(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim().slice(0, 60);
  if (nombre.length < 2) return fail(res, 400, 'Escribe un nombre válido');
  await q('UPDATE Usuario SET nombre = ? WHERE id_usuario = ?', [nombre, req.user.id_usuario]);
  res.json({ ok: true, nombre });
}));

// ---------- FAVORITOS ----------
app.get('/api/favoritos', auth, h(async (req, res) => {
  res.json((await q('SELECT id_cancion FROM Favorito WHERE id_usuario = ?', [req.user.id_usuario])).map((r) => r.id_cancion));
}));

app.post('/api/favoritos/:id', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const realId = await asegurarCancionBaseDatos({ id_cancion: req.params.id, ...req.body });
  if (!realId) return fail(res, 400, 'No se pudo identificar la canción');

  const ex = await q('SELECT 1 FROM Favorito WHERE id_usuario = ? AND id_cancion = ?', [uid, realId]);
  if (ex.length) { 
    await q('DELETE FROM Favorito WHERE id_usuario = ? AND id_cancion = ?', [uid, realId]); 
    return res.json({ favorito: false, realId }); 
  }
  await q('INSERT INTO Favorito (id_usuario, id_cancion) VALUES (?, ?)', [uid, realId]);
  res.json({ favorito: true, realId });
}));

// ---------- PLAYLISTS ----------
async function listarPlaylists(uid) {
  const pls = await q(
    `SELECT p.id_playlist AS id, p.nombre AS name FROM Playlist p
      WHERE p.id_usuario = ? OR p.id_playlist IN (SELECT id_playlist FROM PlaylistMiembro WHERE id_usuario = ?)
      ORDER BY p.id_playlist DESC`, [uid, uid]);
  if (!pls.length) return [];
  const rows = await q(
    `SELECT pc.id_playlist, pc.id_cancion, al.portada AS artwork 
       FROM PlaylistCancion pc 
       JOIN Cancion c ON c.id_cancion = pc.id_cancion 
       LEFT JOIN Album al ON al.id_album = c.id_album 
      WHERE pc.id_playlist IN (?) ORDER BY pc.orden`, [pls.map((p) => p.id)]);
  return pls.map((p) => {
    const mias = rows.filter((r) => r.id_playlist === p.id);
    return { ...p, songIds: mias.map((r) => r.id_cancion), covers: mias.map((r) => r.artwork).filter(Boolean).slice(0, 4) };
  });
}

app.get('/api/playlists', auth, h(async (req, res) => res.json(await listarPlaylists(req.user.id_usuario))));

app.post('/api/playlists/rapida', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const realId = await asegurarCancionBaseDatos({ id_cancion: req.body.id_cancion, ...req.body });
  if (!realId) return fail(res, 400, 'No se pudo identificar la canción');

  let [p] = await q('SELECT id_playlist, nombre FROM Playlist WHERE id_usuario = ? ORDER BY id_playlist DESC LIMIT 1', [uid]);
  if (!p) {
    const r = await q("INSERT INTO Playlist (nombre, id_usuario) VALUES ('Mi playlist', ?)", [uid]);
    p = { id_playlist: r.insertId, nombre: 'Mi playlist' };
  }
  const [m] = await q('SELECT COALESCE(MAX(orden), 0) + 1 AS o FROM PlaylistCancion WHERE id_playlist = ?', [p.id_playlist]);
  await q('INSERT IGNORE INTO PlaylistCancion (id_playlist, id_cancion, orden) VALUES (?, ?, ?)', [p.id_playlist, realId, m.o]);
  res.json({ nombre: p.nombre });
}));

app.post('/api/playlists', auth, h(async (req, res) => {
  const { nombre, canciones = [] } = req.body;
  if (!nombre) return fail(res, 400, 'Escribe un nombre');
  const r = await q('INSERT INTO Playlist (nombre, id_usuario) VALUES (?, ?)', [nombre, req.user.id_usuario]);
  
  let orden = 0;
  for (const item of canciones) {
    const cancionObj = typeof item === 'object' ? item : { id_cancion: item };
    const realId = await asegurarCancionBaseDatos(cancionObj);
    if (!realId) continue;
    orden += 1;
    await q('INSERT IGNORE INTO PlaylistCancion (id_playlist, id_cancion, orden) VALUES (?, ?, ?)', [r.insertId, realId, orden]);
  }
  res.json({ id: r.insertId });
}));

// Dueño o miembro invitado de la playlist
const miPlaylist = async (uid, id) => (await q(
  `SELECT p.* FROM Playlist p
    WHERE p.id_playlist = ?
      AND (p.id_usuario = ? OR EXISTS (SELECT 1 FROM PlaylistMiembro pm WHERE pm.id_playlist = p.id_playlist AND pm.id_usuario = ?))`,
  [Number(id), uid, uid]))[0];

app.get('/api/playlists/:id', auth, h(async (req, res) => {
  const p = await miPlaylist(req.user.id_usuario, req.params.id);
  if (!p) return fail(res, 404, 'Playlist no encontrada');
  const rows = await q(
    `${CANCIONES_SQL} JOIN PlaylistCancion pc ON pc.id_cancion = c.id_cancion 
      WHERE pc.id_playlist = ? ORDER BY pc.orden`, [p.id_playlist]);
  res.json({ id: p.id_playlist, name: p.nombre, songs: rows.map(sinIds) });
}));

app.put('/api/playlists/:id', auth, h(async (req, res) => {
  const p = await miPlaylist(req.user.id_usuario, req.params.id);
  if (!p) return fail(res, 404, 'Playlist no encontrada');
  if (p.id_usuario !== req.user.id_usuario) return fail(res, 403, 'Solo el creador puede cambiar el nombre');
  const nombre = String(req.body.nombre || '').trim();
  if (!nombre) return fail(res, 400, 'Escribe un nombre');
  await q('UPDATE Playlist SET nombre = ? WHERE id_playlist = ?', [nombre, p.id_playlist]);
  res.json({ ok: true });
}));

app.delete('/api/playlists/:id', auth, h(async (req, res) => {
  const p = await miPlaylist(req.user.id_usuario, req.params.id);
  if (!p) return fail(res, 404, 'Playlist no encontrada');
  if (p.id_usuario !== req.user.id_usuario) { // un miembro solo sale de la playlist
    await q('DELETE FROM PlaylistMiembro WHERE id_playlist = ? AND id_usuario = ?', [p.id_playlist, req.user.id_usuario]);
    return res.json({ ok: true });
  }
  await q('DELETE FROM PlaylistMiembro WHERE id_playlist = ?', [p.id_playlist]);
  await q("DELETE FROM Notificacion WHERE tipo = 'playlist' AND id_playlist = ?", [p.id_playlist]);
  await q('DELETE FROM PlaylistCancion WHERE id_playlist = ?', [p.id_playlist]);
  await q('DELETE FROM Playlist WHERE id_playlist = ?', [p.id_playlist]);
  res.json({ ok: true });
}));

app.post('/api/playlists/:id/canciones', auth, h(async (req, res) => {
  const p = await miPlaylist(req.user.id_usuario, req.params.id);
  if (!p) return fail(res, 404, 'Playlist no encontrada');
  const realId = await asegurarCancionBaseDatos({ ...req.body, id_cancion: req.body.id_cancion ?? req.body.id });
  if (!realId) return fail(res, 400, 'No se pudo identificar la canción');
  const [m] = await q('SELECT COALESCE(MAX(orden), 0) + 1 AS o FROM PlaylistCancion WHERE id_playlist = ?', [p.id_playlist]);
  await q('INSERT IGNORE INTO PlaylistCancion (id_playlist, id_cancion, orden) VALUES (?, ?, ?)', [p.id_playlist, realId, m.o]);
  res.json({ ok: true });
}));

app.delete('/api/playlists/:id/canciones/:cid', auth, h(async (req, res) => {
  const p = await miPlaylist(req.user.id_usuario, req.params.id);
  if (!p) return fail(res, 404, 'Playlist no encontrada');
  await q('DELETE FROM PlaylistCancion WHERE id_playlist = ? AND id_cancion = ?', [p.id_playlist, Number(req.params.cid)]);
  res.json({ ok: true });
}));

// ---------- HISTORIAL / DESCARGAS / COMPARTIDOS ----------
app.post('/api/historial', auth, h(async (req, res) => {
  const realId = await asegurarCancionBaseDatos({ id_cancion: req.body.id_cancion, ...req.body });
  if (realId) {
    await q('INSERT INTO HistorialReproduccion (duracion, modo, id_usuario, id_cancion) VALUES (?, ?, ?, ?)',
      [req.body.duracion || 0, 'normal', req.user.id_usuario, realId]);
  }
  res.json({ ok: true });
}));

// ---------- DESCARGAS (solo Premium) ----------
const requierePremium = h(async (req, res, next) => {
  const st = await estado(req.user.id_usuario);
  if (!st.premium) return fail(res, 403, 'Necesitas una membresía Premium activa para descargar música');
  next();
});

const HOSTS_AUDIO = ['dzcdn.net', 'deezer.com', 'mzstatic.com', 'apple.com', 'jamendo.com'];
const hostPermitido = (u) => {
  try {
    const { protocol, hostname } = new URL(u);
    return /^https?:$/.test(protocol) && HOSTS_AUDIO.some((d) => hostname === d || hostname.endsWith('.' + d));
  } catch { return false; }
};

// Ids que el servidor tiene registrados como descargados (la app guarda el archivo en su almacenamiento interno)
app.get('/api/descargas', auth, h(async (req, res) => {
  res.json((await q("SELECT DISTINCT id_cancion FROM Descarga WHERE id_usuario = ? AND estado = 'completada'", [req.user.id_usuario])).map((r) => r.id_cancion));
}));

// Entrega el audio a la app SOLO si la membresía está activa (validación en backend)
app.get('/api/descargas/archivo', auth, requierePremium, h(async (req, res) => {
  const file = String(req.query.file || '');
  if (!file) return fail(res, 400, 'Falta el archivo');

  if (!/^https?:\/\//i.test(file)) {
    const local = path.join(audioDirLetras, path.basename(file.replace(/\\/g, '/')));
    if (!fs.existsSync(local)) return fail(res, 404, 'El archivo de audio no existe');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fs.statSync(local).size);
    return fs.createReadStream(local).pipe(res);
  }

  if (!hostPermitido(file)) return fail(res, 400, 'Origen de audio no permitido');
  const ctrl = new AbortController();
  res.on('close', () => { if (!res.writableFinished) ctrl.abort(); });
  const r = await fetch(file, { signal: ctrl.signal }).catch(() => null);
  if (!r || !r.ok || !r.body) return fail(res, 502, 'La fuente de audio no respondió');

  res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/mpeg');
  const len = r.headers.get('content-length');
  if (len && !r.headers.get('content-encoding')) res.setHeader('Content-Length', len);
  Readable.fromWeb(r.body).pipe(res);
}));

// La app lo llama DESPUÉS de verificar que el archivo quedó guardado completo
app.post('/api/descargas', auth, requierePremium, h(async (req, res) => {
  const realId = await asegurarCancionBaseDatos({ id_cancion: req.body.id_cancion, ...req.body });
  if (!realId) return fail(res, 400, 'No se pudo identificar la canción');
  const ex = await q("SELECT 1 FROM Descarga WHERE id_usuario = ? AND id_cancion = ? AND estado = 'completada'", [req.user.id_usuario, realId]);
  if (!ex.length) await q("INSERT INTO Descarga (modo, estado, id_usuario, id_cancion) VALUES ('offline', 'completada', ?, ?)", [req.user.id_usuario, realId]);
  res.json({ ok: true });
}));

// Eliminar (se permite aunque la membresía haya vencido, para liberar espacio)
app.post('/api/descargas/eliminar', auth, h(async (req, res) => {
  const realId = await asegurarCancionBaseDatos({ id_cancion: req.body.id_cancion, ...req.body });
  if (realId) await q('DELETE FROM Descarga WHERE id_usuario = ? AND id_cancion = ?', [req.user.id_usuario, realId]);
  res.json({ ok: true });
}));

app.delete('/api/descargas', auth, h(async (req, res) => {
  await q('DELETE FROM Descarga WHERE id_usuario = ?', [req.user.id_usuario]);
  res.json({ ok: true });
}));

app.post('/api/compartidos', auth, h(async (req, res) => {
  const realId = await asegurarCancionBaseDatos({ id_cancion: req.body.id_cancion, ...req.body });
  if (!realId) return fail(res, 400, 'No se pudo identificar la canción');
  await q("INSERT INTO Compartido (tipo, id_usuario, id_cancion) VALUES ('cancion', ?, ?)", [req.user.id_usuario, realId]);
  res.json({ ok: true });
}));

// ---------- AMIGOS, NOTIFICACIONES Y FOTO DE PERFIL ----------
// Las tablas se crean solas al arrancar el servidor (no tienes que correr SQL a mano).
async function crearTablasSociales() {
  await q(`CREATE TABLE IF NOT EXISTS Amistad (
    id_amistad INT AUTO_INCREMENT PRIMARY KEY,
    id_solicitante INT NOT NULL,
    id_destinatario INT NOT NULL,
    estado VARCHAR(10) NOT NULL DEFAULT 'pendiente',
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_amistad (id_solicitante, id_destinatario),
    KEY idx_destinatario (id_destinatario)
  )`);
  await q(`CREATE TABLE IF NOT EXISTS Notificacion (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_origen INT NOT NULL,
    tipo VARCHAR(12) NOT NULL,
    id_cancion INT NULL,
    id_playlist INT NULL,
    leida TINYINT(1) NOT NULL DEFAULT 0,
    resuelta TINYINT(1) NOT NULL DEFAULT 0,
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_notif_usuario (id_usuario, id_notificacion)
  )`);
  await q(`CREATE TABLE IF NOT EXISTS PlaylistMiembro (
    id_playlist INT NOT NULL,
    id_usuario INT NOT NULL,
    PRIMARY KEY (id_playlist, id_usuario)
  )`);
  await q(`CREATE TABLE IF NOT EXISTS UsuarioFoto (
    id_usuario INT NOT NULL PRIMARY KEY,
    foto MEDIUMTEXT NOT NULL,
    actualizada TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`);
}

async function limpiarDatosSociales(uid) {
  await q('DELETE FROM Amistad WHERE id_solicitante = ? OR id_destinatario = ?', [uid, uid]);
  await q('DELETE FROM Notificacion WHERE id_usuario = ? OR id_origen = ?', [uid, uid]);
  await q('DELETE FROM PlaylistMiembro WHERE id_usuario = ?', [uid]);
  await q('DELETE FROM UsuarioFoto WHERE id_usuario = ?', [uid]);
}

const fotoUrl = (id, v) => (v ? `/api/foto/${id}?v=${v}` : null);
async function fotoDe(uid) {
  try {
    const [f] = await q('SELECT UNIX_TIMESTAMP(actualizada) AS v FROM UsuarioFoto WHERE id_usuario = ?', [uid]);
    return fotoUrl(uid, f?.v);
  } catch { return null; }
}

const relacion = async (a, b) => (await q(
  'SELECT * FROM Amistad WHERE (id_solicitante = ? AND id_destinatario = ?) OR (id_solicitante = ? AND id_destinatario = ?) LIMIT 1',
  [a, b, b, a]))[0];
const sonAmigos = async (a, b) => (await relacion(a, b))?.estado === 'aceptada';

// Máximo 20 solicitudes cada 10 minutos por usuario (evita spam)
const solicitudesRecientes = new Map();
const puedeSolicitar = (uid) => {
  const ahora = Date.now();
  const lista = (solicitudesRecientes.get(uid) || []).filter((t) => ahora - t < 10 * 60 * 1000);
  if (lista.length >= 20) return false;
  lista.push(ahora);
  solicitudesRecientes.set(uid, lista);
  return true;
};

// ----- Foto de perfil -----
app.put('/api/me/foto', auth, h(async (req, res) => {
  const foto = String(req.body.foto || '');
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(foto)) return fail(res, 400, 'Imagen no válida');
  if (foto.length > 400000) return fail(res, 413, 'La imagen es demasiado grande');
  await q(
    'INSERT INTO UsuarioFoto (id_usuario, foto) VALUES (?, ?) ON DUPLICATE KEY UPDATE foto = VALUES(foto)',
    [req.user.id_usuario, foto]);
  res.json({ ok: true, foto: await fotoDe(req.user.id_usuario) });
}));

// La foto se sirve como imagen normal para que el navegador la guarde en caché
app.get('/api/foto/:id', h(async (req, res) => {
  const [f] = await q('SELECT foto FROM UsuarioFoto WHERE id_usuario = ?', [Number(req.params.id)]);
  const m = f && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(f.foto);
  if (!m) return res.status(404).end();
  res.set('Content-Type', m[1]);
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(Buffer.from(m[2], 'base64'));
}));

// ----- Buscar usuarios (solo registrados, por nombre) -----
app.get('/api/usuarios/buscar', auth, h(async (req, res) => {
  const texto = String(req.query.q || '').trim().slice(0, 60);
  if (texto.length < 2) return res.json([]);
  const patron = `%${texto.replace(/[\\%_]/g, '\\$&')}%`;
  const rows = await q(
    `SELECT u.id_usuario, u.nombre, UNIX_TIMESTAMP(f.actualizada) AS foto_v
       FROM Usuario u
       LEFT JOIN UsuarioFoto f ON f.id_usuario = u.id_usuario
      WHERE u.nombre LIKE ? AND u.id_usuario <> ? AND u.id_rol <> 1
      ORDER BY u.nombre LIMIT 15`, [patron, req.user.id_usuario]);
  res.json(rows.map((r) => ({ id_usuario: r.id_usuario, nombre: r.nombre, foto: fotoUrl(r.id_usuario, r.foto_v) })));
}));

// ----- Amigos -----
app.get('/api/amigos', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const rows = await q(
    `SELECT a.id_solicitante, a.estado, u.id_usuario, u.nombre, u.correo, UNIX_TIMESTAMP(f.actualizada) AS foto_v
       FROM Amistad a
       JOIN Usuario u ON u.id_usuario = IF(a.id_solicitante = ?, a.id_destinatario, a.id_solicitante)
       LEFT JOIN UsuarioFoto f ON f.id_usuario = u.id_usuario
      WHERE a.id_solicitante = ? OR a.id_destinatario = ?
      ORDER BY u.nombre`, [uid, uid, uid]);
  res.json(rows.map((r) => ({
    id_usuario: r.id_usuario,
    nombre: r.nombre,
    correo: r.estado === 'aceptada' ? r.correo : undefined, // el correo solo lo ven los amigos
    foto: fotoUrl(r.id_usuario, r.foto_v),
    estado: r.estado === 'aceptada' ? 'amigo' : r.id_solicitante === uid ? 'enviada' : 'recibida',
  })));
}));

app.post('/api/amigos/solicitud', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  if (!puedeSolicitar(uid)) return fail(res, 429, 'Demasiadas solicitudes. Intenta en unos minutos.');

  let objetivo;
  if (req.body.correo) {
    [objetivo] = await q('SELECT id_usuario, id_rol FROM Usuario WHERE LOWER(correo) = ?', [String(req.body.correo).trim().toLowerCase()]);
  } else if (req.body.id_usuario) {
    [objetivo] = await q('SELECT id_usuario, id_rol FROM Usuario WHERE id_usuario = ?', [Number(req.body.id_usuario)]);
  }
  if (!objetivo || objetivo.id_rol === 1) return fail(res, 404, 'No encontramos a ese usuario');
  if (objetivo.id_usuario === uid) return fail(res, 400, 'No puedes agregarte a ti mismo');

  const rel = await relacion(uid, objetivo.id_usuario);
  if (rel) {
    if (rel.estado === 'aceptada') return fail(res, 409, 'Ya son amigos');
    if (rel.id_solicitante === uid) return fail(res, 409, 'Ya le enviaste una solicitud');
    // Esa persona ya te había enviado una: se aceptan mutuamente
    await q("UPDATE Amistad SET estado = 'aceptada' WHERE id_amistad = ?", [rel.id_amistad]);
    await q("UPDATE Notificacion SET resuelta = 1, leida = 1 WHERE tipo = 'solicitud' AND id_usuario = ? AND id_origen = ?", [uid, objetivo.id_usuario]);
    return res.json({ ok: true, aceptada: true });
  }
  await q("INSERT INTO Amistad (id_solicitante, id_destinatario, estado) VALUES (?, ?, 'pendiente')", [uid, objetivo.id_usuario]);
  await q("INSERT INTO Notificacion (id_usuario, id_origen, tipo) VALUES (?, ?, 'solicitud')", [objetivo.id_usuario, uid]);
  res.json({ ok: true });
}));

app.post('/api/amigos/responder', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const otro = Number(req.body.id_usuario);
  const [sol] = await q(
    "SELECT id_amistad FROM Amistad WHERE id_solicitante = ? AND id_destinatario = ? AND estado = 'pendiente'", [otro, uid]);
  if (!sol) return fail(res, 404, 'Solicitud no encontrada');
  if (req.body.aceptar) await q("UPDATE Amistad SET estado = 'aceptada' WHERE id_amistad = ?", [sol.id_amistad]);
  else await q('DELETE FROM Amistad WHERE id_amistad = ?', [sol.id_amistad]);
  await q("UPDATE Notificacion SET resuelta = 1, leida = 1 WHERE tipo = 'solicitud' AND id_usuario = ? AND id_origen = ?", [uid, otro]);
  res.json({ ok: true });
}));

app.delete('/api/amigos/:id', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const otro = Number(req.params.id);
  await q('DELETE FROM Amistad WHERE (id_solicitante = ? AND id_destinatario = ?) OR (id_solicitante = ? AND id_destinatario = ?)', [uid, otro, otro, uid]);
  await q("DELETE FROM Notificacion WHERE tipo = 'solicitud' AND resuelta = 0 AND ((id_usuario = ? AND id_origen = ?) OR (id_usuario = ? AND id_origen = ?))", [uid, otro, otro, uid]);
  res.json({ ok: true });
}));

// ----- Compartir con amigos -----
app.post('/api/compartir/cancion', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const amigo = Number(req.body.id_amigo);
  if (!(await sonAmigos(uid, amigo))) return fail(res, 403, 'Solo puedes compartir con tus amigos');
  const realId = await asegurarCancionBaseDatos({ id_cancion: req.body.id_cancion, ...req.body });
  if (!realId) return fail(res, 400, 'No se pudo identificar la canción');
  await q("INSERT INTO Notificacion (id_usuario, id_origen, tipo, id_cancion) VALUES (?, ?, 'cancion', ?)", [amigo, uid, realId]);
  await q("INSERT INTO Compartido (tipo, id_usuario, id_cancion) VALUES ('cancion', ?, ?)", [uid, realId]);
  res.json({ ok: true });
}));

app.post('/api/compartir/playlist', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const amigo = Number(req.body.id_amigo);
  if (!(await sonAmigos(uid, amigo))) return fail(res, 403, 'Solo puedes invitar a tus amigos');
  const p = await miPlaylist(uid, req.body.id_playlist);
  if (!p) return fail(res, 404, 'Playlist no encontrada');
  if (p.id_usuario !== uid) return fail(res, 403, 'Solo el creador puede invitar');
  const [yaEsta] = await q('SELECT 1 AS x FROM PlaylistMiembro WHERE id_playlist = ? AND id_usuario = ?', [p.id_playlist, amigo]);
  if (yaEsta) return fail(res, 409, 'Esa persona ya está en la playlist');
  const [pendiente] = await q(
    "SELECT 1 AS x FROM Notificacion WHERE tipo = 'playlist' AND id_playlist = ? AND id_usuario = ? AND resuelta = 0", [p.id_playlist, amigo]);
  if (pendiente) return fail(res, 409, 'Ya le enviaste una invitación a esta playlist');
  await q("INSERT INTO Notificacion (id_usuario, id_origen, tipo, id_playlist) VALUES (?, ?, 'playlist', ?)", [amigo, uid, p.id_playlist]);
  res.json({ ok: true });
}));

// ----- Notificaciones (la campanita) -----
app.get('/api/notificaciones', auth, h(async (req, res) => {
  const rows = await q(
    `SELECT n.id_notificacion AS id, n.tipo, n.id_origen AS de_id, u.nombre AS de_nombre,
            n.id_cancion, n.leida, n.resuelta, n.fecha,
            p.nombre AS titulo_playlist, UNIX_TIMESTAMP(f.actualizada) AS foto_v
       FROM Notificacion n
       JOIN Usuario u ON u.id_usuario = n.id_origen
       LEFT JOIN Playlist p ON p.id_playlist = n.id_playlist
       LEFT JOIN UsuarioFoto f ON f.id_usuario = n.id_origen
      WHERE n.id_usuario = ?
      ORDER BY n.id_notificacion DESC LIMIT 50`, [req.user.id_usuario]);
  const ids = [...new Set(rows.map((r) => r.id_cancion).filter(Boolean))];
  const canciones = ids.length ? await q(`${CANCIONES_SQL} WHERE c.id_cancion IN (?)`, [ids]) : [];
  const porId = new Map(canciones.map((c) => [c.id, sinIds(c)]));
  res.json(rows.map((r) => {
    const cancion = r.id_cancion ? porId.get(r.id_cancion) || null : null;
    return {
      id: r.id, tipo: r.tipo, de_id: r.de_id, de_nombre: r.de_nombre, de_foto: fotoUrl(r.de_id, r.foto_v),
      titulo: r.tipo === 'playlist' ? r.titulo_playlist || 'una playlist' : cancion?.title,
      cancion, leida: !!r.leida, resuelta: !!r.resuelta, fecha: r.fecha,
    };
  }));
}));

app.post('/api/notificaciones/leer', auth, h(async (req, res) => {
  await q('UPDATE Notificacion SET leida = 1 WHERE id_usuario = ?', [req.user.id_usuario]);
  res.json({ ok: true });
}));

app.post('/api/notificaciones/:id/responder', auth, h(async (req, res) => {
  const uid = req.user.id_usuario;
  const [n] = await q(
    "SELECT * FROM Notificacion WHERE id_notificacion = ? AND id_usuario = ? AND tipo = 'playlist' AND resuelta = 0", [Number(req.params.id), uid]);
  if (!n) return fail(res, 404, 'Invitación no encontrada');
  if (req.body.aceptar) {
    const [pl] = await q('SELECT id_playlist FROM Playlist WHERE id_playlist = ?', [n.id_playlist]);
    if (!pl) {
      await q('UPDATE Notificacion SET resuelta = 1, leida = 1 WHERE id_notificacion = ?', [n.id_notificacion]);
      return fail(res, 404, 'Esa playlist ya no existe');
    }
    await q('INSERT IGNORE INTO PlaylistMiembro (id_playlist, id_usuario) VALUES (?, ?)', [n.id_playlist, uid]);
  }
  await q('UPDATE Notificacion SET resuelta = 1, leida = 1 WHERE id_notificacion = ?', [n.id_notificacion]);
  res.json({ ok: true });
}));

// ---------- PAGOS ----------
app.post('/api/pagos', auth, h(async (req, res) => {
  const { metodo, tarjeta, id_plan } = req.body;
  const uid = req.user.id_usuario;
  const plan = await planPremium(id_plan);
  if (!plan) return fail(res, 404, 'No hay un plan Premium configurado');
  const aprobado = !String(tarjeta || '').replace(/\s/g, '').endsWith('0');
  const r = await q('INSERT INTO Pago (monto, fecha_pago, metodo_pago, estado, id_usuario) VALUES (?, CURDATE(), ?, ?, ?)',
    [plan.precio, metodo || 'Tarjeta', aprobado ? 'aprobado' : 'rechazado', uid]);
  if (aprobado) await activarPremium(uid, plan.id_membresia);
  const f = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  res.json({ estado: aprobado ? 'aprobado' : 'rechazado', comprobante: `NT-${f}-${String(r.insertId).padStart(3, '0')}`, plan: plan.nombre, monto: plan.precio });
}));

// ---------- ADMIN ----------
const ROLES = ['Administrador', 'Usuario normal', 'Usuario Premium'];

async function listarUsuarios() {
  const rows = await q(
    `SELECT u.id_usuario AS id, u.nombre AS name, u.correo AS email, u.telefono AS phone,
            u.fecha_nacimiento AS birth, u.id_rol,
            (SELECT COUNT(*) FROM Suscripcion s WHERE s.id_usuario = u.id_usuario
                AND s.estado = 'activa' AND s.fecha_fin >= CURDATE()) AS activas
       FROM Usuario u ORDER BY u.id_usuario`);
  return rows.map((r) => ({
    id: r.id, name: r.name, email: r.email, phone: r.phone, birth: r.birth,
    role: r.id_rol === 1 ? 'Administrador' : r.activas ? 'Usuario Premium' : 'Usuario normal',
    membership: r.id_rol === 1 ? 'No aplica' : r.activas ? 'Activa' : 'Sin membresía',
  }));
}

app.get('/api/admin/resumen', auth, adminOnly, h(async (_req, res) => {
  const [[u], [p], [ing], [c], [a], [ad]] = await Promise.all([
    q('SELECT COUNT(*) AS n FROM Usuario'),
    q("SELECT COUNT(DISTINCT s.id_usuario) AS n FROM Suscripcion s JOIN Usuario u ON u.id_usuario = s.id_usuario WHERE u.id_rol <> 1 AND s.estado = 'activa' AND s.fecha_fin >= CURDATE()"),
    q("SELECT COALESCE(SUM(monto), 0) AS n FROM Pago WHERE estado = 'aprobado'"),
    q('SELECT COUNT(*) AS n FROM Cancion'),
    q('SELECT COUNT(*) AS n FROM Album'),
    q('SELECT COUNT(*) AS n FROM Usuario WHERE id_rol = 1'),
  ]);
  const por = await q(`SELECT DATE_FORMAT(fecha_inicio, '%Y-%m') AS ym, COUNT(*) AS c FROM Suscripcion
                       WHERE fecha_inicio >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
                       GROUP BY ym`);
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    meses.push({ label: nombres[d.getMonth()], count: Number(por.find((x) => x.ym === ym)?.c || 0) });
  }
  res.json({ usuarios: u.n, premium: p.n, ingresos: Number(ing.n), canciones: c.n, albumes: a.n, admins: ad.n, meses });
}));

app.get('/api/admin/usuarios', auth, adminOnly, h(async (_req, res) => res.json(await listarUsuarios())));

app.post('/api/admin/usuarios', auth, adminOnly, h(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const correo = String(req.body.correo || '').trim().toLowerCase();
  const telefono = String(req.body.telefono || '').trim();
  const fecha_nacimiento = String(req.body.fecha_nacimiento || '').trim();
  const contrasena = String(req.body.contrasena || '');
  const role = req.body.role || 'Usuario normal';
  if (nombre.length < 2) return fail(res, 400, 'Escribe el nombre del usuario');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return fail(res, 400, 'Escribe un correo válido');
  if (contrasena.length < 6) return fail(res, 400, 'La contraseña debe tener 6 o más caracteres');
  if (!ROLES.includes(role)) return fail(res, 400, 'Rol inválido');
  if (fecha_nacimiento && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) return fail(res, 400, 'Fecha de nacimiento inválida');
  if ((await q('SELECT 1 FROM Usuario WHERE correo = ?', [correo])).length) return fail(res, 409, 'Ese correo ya está registrado');
  const hash = await bcrypt.hash(contrasena, 10);
  const r = await q('INSERT INTO Usuario (nombre, correo, telefono, fecha_nacimiento, contrasena_hash, id_rol) VALUES (?,?,?,?,?,?)',
    [nombre, correo, telefono || null, fecha_nacimiento || null, hash, role === 'Administrador' ? 1 : 2]);
  if (role === 'Usuario Premium') await activarPremium(r.insertId);
  res.json({ ok: true, id: r.insertId });
}));

// Borra los usuarios de demostración (@ejemplo.com). No toca administradores ni al admin actual.
app.delete('/api/admin/usuarios-demo', auth, adminOnly, h(async (req, res) => {
  const demo = await q("SELECT id_usuario FROM Usuario WHERE correo LIKE '%@ejemplo.com' AND id_rol <> 1 AND id_usuario <> ?", [req.user.id_usuario]);
  for (const d of demo) {
    await limpiarDatosSociales(d.id_usuario);
    await q('DELETE FROM Usuario WHERE id_usuario = ?', [d.id_usuario]);
  }
  res.json({ ok: true, eliminados: demo.length });
}));

app.put('/api/admin/usuarios/:id/rol', auth, adminOnly, h(async (req, res) => {
  const id = Number(req.params.id), { role } = req.body;
  if (!ROLES.includes(role)) return fail(res, 400, 'Rol inválido');
  if (id === req.user.id_usuario && role !== 'Administrador') return fail(res, 400, 'No puedes quitarte el rol de administrador a ti mismo');
  await q('UPDATE Usuario SET id_rol = ? WHERE id_usuario = ?', [role === 'Administrador' ? 1 : 2, id]);
  if (role === 'Usuario Premium') {
    if (!(await estado(id)).premium) await activarPremium(id);
  } else {
    await q("UPDATE Suscripcion SET estado = 'cancelada' WHERE id_usuario = ? AND estado = 'activa' AND fecha_fin >= CURDATE()", [id]);
  }
  res.json({ ok: true });
}));

app.delete('/api/admin/usuarios/:id', auth, adminOnly, h(async (req, res) => {
  if (Number(req.params.id) === req.user.id_usuario) return fail(res, 400, 'No puedes eliminar tu propia cuenta');
  await limpiarDatosSociales(Number(req.params.id));
  await q('DELETE FROM Usuario WHERE id_usuario = ?', [req.params.id]);
  res.json({ ok: true });
}));

app.get('/api/admin/pagos', auth, adminOnly, h(async (_req, res) => {
  res.json(await q(`SELECT p.id_pago, u.nombre, p.monto, p.metodo_pago AS metodo, p.fecha_pago AS fecha, p.estado
                      FROM Pago p JOIN Usuario u ON u.id_usuario = p.id_usuario ORDER BY p.id_pago DESC LIMIT 100`));
}));

// ---------- PLANES (precio editable por el admin) ----------
app.get('/api/planes', h(async (_req, res) => {
  res.json(await q('SELECT id_membresia AS id, nombre, precio, duracion_dias AS dias FROM Membresia ORDER BY id_membresia'));
}));

app.put('/api/admin/planes/:id', auth, adminOnly, h(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const precio = Number(req.body.precio);
  const dias = Math.floor(Number(req.body.dias));
  if (!nombre || !(precio > 0) || !(dias > 0)) return fail(res, 400, 'Nombre, precio y días deben ser válidos');
  const [actual] = await q('SELECT nombre FROM Membresia WHERE id_membresia = ?', [Number(req.params.id)]);
  if (actual && /grat/i.test(actual.nombre)) return fail(res, 400, 'El plan Gratis no se puede editar');
  const r = await q('UPDATE Membresia SET nombre = ?, precio = ?, duracion_dias = ? WHERE id_membresia = ?', [nombre, precio, dias, Number(req.params.id)]);
  if (!r.affectedRows) return fail(res, 404, 'Plan no encontrado');
  res.json({ ok: true });
}));

// ---------- CATÁLOGO ADMIN (agregar / editar / eliminar canciones) ----------
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio');
const COVERS_DIR = path.join(__dirname, '..', 'public', 'covers');
const AUDIO_EXT = { 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac', 'audio/flac': 'flac', 'audio/webm': 'webm' };
const IMG_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// Guarda un data URL en disco y devuelve el nombre de archivo (o lanza Error con mensaje para el usuario)
function guardarDataUrl(dataUrl, dir, extPermitidas, base) {
  const m = /^data:([\w/+.-]+)(?:;[^,]*)?;base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!m) throw new Error('Archivo inválido');
  const ext = extPermitidas[m[1].toLowerCase()];
  if (!ext) throw new Error(`Formato no permitido (${m[1]})`);
  fs.mkdirSync(dir, { recursive: true });
  const slug = String(base || 'archivo').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 40) || 'archivo';
  const nombre = `${slug}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(dir, nombre), Buffer.from(m[2], 'base64'));
  return nombre;
}
const borrarSiExiste = (p) => { try { fs.unlinkSync(p); } catch {} };

async function idGeneroPorNombre(genre) {
  const nombre = String(genre || '').trim();
  if (!nombre || nombre.toLowerCase() === 'sin género') { const [g] = await q('SELECT id_genero FROM Genero ORDER BY id_genero LIMIT 1'); return g?.id_genero ?? 1; }
  const [g] = await q('SELECT id_genero FROM Genero WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [nombre]);
  return g ? g.id_genero : (await q('INSERT INTO Genero (nombre) VALUES (?)', [nombre])).insertId;
}
async function idArtistaPorNombre(artist) {
  const nombre = String(artist || '').trim();
  const [a] = await q('SELECT id_artista FROM Artista WHERE LOWER(nombre) = LOWER(?) LIMIT 1', [nombre]);
  return a ? a.id_artista : (await q('INSERT INTO Artista (nombre) VALUES (?)', [nombre])).insertId;
}
// "Sencillo" (o vacío) = álbum propio de esa canción, para que cada portada sea independiente
async function idAlbumPara(album, idArtista, portada) {
  const nombre = String(album || '').trim() || 'Sencillo';
  if (nombre.toLowerCase() !== 'sencillo') {
    const [a] = await q('SELECT id_album FROM Album WHERE LOWER(titulo) = LOWER(?) AND id_artista = ? LIMIT 1', [nombre, idArtista]);
    if (a) { if (portada) await q('UPDATE Album SET portada = ? WHERE id_album = ?', [portada, a.id_album]); return a.id_album; }
  }
  return (await q('INSERT INTO Album (titulo, anio, portada, id_artista) VALUES (?, ?, ?, ?)', [nombre, new Date().getFullYear(), portada || null, idArtista])).insertId;
}
const cancionAdmin = async (id) => (await q(`${CANCIONES_SQL} WHERE c.id_cancion = ?`, [id]))[0];

app.post('/api/admin/canciones', auth, adminOnly, h(async (req, res) => {
  const { title, artist, album, genre, artwork, audio, audioName, duration } = req.body || {};
  if (!String(title || '').trim() || !String(artist || '').trim()) return fail(res, 400, 'Falta el nombre o el artista');
  if (!audio) return fail(res, 400, 'Sube el archivo de audio');
  const [dup] = await q(`SELECT c.id_cancion FROM Cancion c JOIN Artista a ON a.id_artista = c.id_artista WHERE LOWER(c.titulo) = LOWER(?) AND LOWER(a.nombre) = LOWER(?) LIMIT 1`, [String(title).trim(), String(artist).trim()]);
  if (dup) return fail(res, 409, 'Esa canción ya existe en el catálogo');
  let archivo = null, portada = null;
  try {
    archivo = guardarDataUrl(audio, AUDIO_DIR, AUDIO_EXT, audioName ? path.parse(String(audioName)).name : title);
    if (artwork) portada = '/covers/' + guardarDataUrl(artwork, COVERS_DIR, IMG_EXT, title);
  } catch (e) { if (archivo) borrarSiExiste(path.join(AUDIO_DIR, archivo)); return fail(res, 400, e.message); }
  const idArtista = await idArtistaPorNombre(artist);
  const idAlbum = await idAlbumPara(album, idArtista, portada);
  const r = await q(`INSERT INTO Cancion (titulo, duracion, archivo_audio, id_genero, id_album, id_artista) VALUES (?, ?, ?, ?, ?, ?)`,
    [String(title).trim(), Math.max(1, Math.round(Number(duration) || 30)), archivo, await idGeneroPorNombre(genre), idAlbum, idArtista]);
  res.json(sinIds(await cancionAdmin(r.insertId)));
}));

app.put('/api/admin/canciones/:id', auth, adminOnly, h(async (req, res) => {
  const id = Number(req.params.id);
  const [actual] = await q('SELECT * FROM Cancion WHERE id_cancion = ?', [id]);
  if (!actual) return fail(res, 404, 'Canción no encontrada');
  const { title, artist, album, genre, artwork, audio, audioName, duration } = req.body || {};
  if (!String(title || '').trim() || !String(artist || '').trim()) return fail(res, 400, 'Falta el nombre o el artista');
  let archivo = actual.archivo_audio, portada = null, audioNuevo = null;
  try {
    if (audio) { audioNuevo = guardarDataUrl(audio, AUDIO_DIR, AUDIO_EXT, audioName ? path.parse(String(audioName)).name : title); archivo = audioNuevo; }
    if (artwork && String(artwork).startsWith('data:')) portada = '/covers/' + guardarDataUrl(artwork, COVERS_DIR, IMG_EXT, title);
  } catch (e) { if (audioNuevo) borrarSiExiste(path.join(AUDIO_DIR, audioNuevo)); return fail(res, 400, e.message); }
  const idArtista = await idArtistaPorNombre(artist);
  const [albActual] = await q('SELECT * FROM Album WHERE id_album = ?', [actual.id_album]);
  const nombreAlbum = String(album || '').trim() || 'Sencillo';
  let idAlbum = actual.id_album;
  if (!albActual || albActual.id_artista !== idArtista || albActual.titulo.toLowerCase() !== nombreAlbum.toLowerCase()) {
    idAlbum = await idAlbumPara(nombreAlbum, idArtista, portada || albActual?.portada || null);
  } else if (portada) {
    await q('UPDATE Album SET portada = ? WHERE id_album = ?', [portada, idAlbum]);
  }
  await q('UPDATE Cancion SET titulo = ?, duracion = ?, archivo_audio = ?, id_genero = ?, id_album = ?, id_artista = ? WHERE id_cancion = ?',
    [String(title).trim(), Math.max(1, Math.round(Number(duration) || actual.duracion || 30)), archivo, await idGeneroPorNombre(genre), idAlbum, idArtista, id]);
  if (audioNuevo && actual.archivo_audio && !/^https?:\/\//i.test(actual.archivo_audio)) borrarSiExiste(path.join(AUDIO_DIR, path.basename(actual.archivo_audio)));
  res.json(sinIds(await cancionAdmin(id)));
}));

app.delete('/api/admin/canciones/:id', auth, adminOnly, h(async (req, res) => {
  const id = Number(req.params.id);
  const [c] = await q('SELECT archivo_audio FROM Cancion WHERE id_cancion = ?', [id]);
  if (!c) return fail(res, 404, 'Canción no encontrada');
  for (const t of ['PlaylistCancion', 'Favorito', 'Descarga', 'Compartido', 'Letra', 'HistorialReproduccion']) {
    try { await q(`DELETE FROM ${t} WHERE id_cancion = ?`, [id]); } catch (e) { console.warn(`(aviso) no se limpió ${t}:`, e.message); }
  }
  await q('DELETE FROM Cancion WHERE id_cancion = ?', [id]);
  if (c.archivo_audio && !/^https?:\/\//i.test(c.archivo_audio)) borrarSiExiste(path.join(AUDIO_DIR, path.basename(c.archivo_audio)));
  res.json({ ok: true });
}));

// ---------- CATÁLOGO EXTERNO ----------
const cacheExterno = new Map();
const TTL_EXTERNO = 10 * 60 * 1000;
const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const quitarAcentos = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const GENEROS = {
  'pop':         { label: 'Pop',         terminos: ['pop', 'pop latino'],                                   jamendo: ['pop'] },
  'rock':        { label: 'Rock',        terminos: ['rock', 'rock en español'],                             jamendo: ['rock'] },
  'hip hop':     { label: 'Hip Hop',     terminos: ['hip hop', 'rap'],                                      jamendo: ['hiphop'] },
  'reggaeton':   { label: 'Reggaetón',   terminos: ['reggaeton', 'urbano latino'],                          jamendo: [] },
  'regional':    { label: 'Regional',    terminos: ['regional mexicano', 'banda', 'corridos', 'norteño'],   jamendo: [] },
  'electronica': { label: 'Electrónica', terminos: ['electronica', 'edm', 'house'],                         jamendo: ['electronic'] },
};

const CONSULTAS_INICIALES = [
  ...Object.values(GENEROS).map((g) => ({ term: g.terminos[0], label: g.label })),
  { term: 'indie', label: 'Indie' },
];
const JAMENDO_INICIAL = [
  { tag: 'pop', label: 'Pop' }, { tag: 'rock', label: 'Rock' }, { tag: 'hiphop', label: 'Hip Hop' },
  { tag: 'electronic', label: 'Electrónica' }, { tag: 'jazz', label: 'Jazz' }, { tag: 'reggae', label: 'Reggae' },
  { tag: 'latin', label: 'Latin' }, { tag: 'metal', label: 'Metal' }, { tag: 'indie', label: 'Indie' },
  { tag: 'lounge', label: 'Lounge' },
];

app.get('/api/external/canciones', h(async (req, res) => {
  const texto = String(req.query.q || '').trim();
  const generoPedido = String(req.query.genero || '').trim();
  const claveGenero = quitarAcentos(generoPedido.toLowerCase());

  const clave = `${texto.toLowerCase()}|${claveGenero}`;
  const guardado = cacheExterno.get(clave);
  if (guardado && guardado.expira > Date.now()) return res.json(guardado.data);

  const jamendoId = process.env.JAMENDO_CLIENT_ID;

  let consultas;
  let consultasJamendo;
  if (texto) {
    consultas = [{ term: texto, label: null }];
    consultasJamendo = [{ params: { search: texto }, label: null }];
  } else if (generoPedido) {
    const g = GENEROS[claveGenero];
    const label = g?.label || capitalizar(generoPedido);
    consultas = (g?.terminos || [generoPedido]).map((term) => ({ term, label }));
    consultasJamendo = (g ? g.jamendo : [claveGenero]).map((tag) => ({ params: { tags: tag, order: 'popularity_month' }, label }));
  } else {
    consultas = CONSULTAS_INICIALES;
    consultasJamendo = JAMENDO_INICIAL.map(({ tag, label }) => ({ params: { tags: tag, order: 'popularity_month' }, label }));
  }

  const limite = generoPedido ? 25 : 15;
  const getJson = (url, vacio) => fetch(url).then((r) => (r.ok ? r.json() : vacio)).catch(() => vacio);
  const urlJamendo = (extra) =>
    `https://api.jamendo.com/v3.0/tracks/?${new URLSearchParams({
      client_id: jamendoId || '', format: 'json', limit: '20',
      audioformat: 'mp32', imagesize: '300', include: 'musicinfo', ...extra,
    })}`;

  const [dz, it, jm] = await Promise.all([
    Promise.all(consultas.map((c) => getJson(`https://api.deezer.com/search?q=${encodeURIComponent(c.term)}&limit=${limite}`, { data: [] }))),
    Promise.all(consultas.map((c) => getJson(`https://itunes.apple.com/search?term=${encodeURIComponent(c.term)}&entity=song&limit=${limite}&country=MX`, { results: [] }))),
    jamendoId ? Promise.all(consultasJamendo.map((c) => getJson(urlJamendo(c.params), { results: [] }))) : Promise.resolve([]),
  ]);

  const jamendo = jm.flatMap((d, i) => (d.results || []).map((t) => ({
    id: `jm-${t.id}`,
    title: t.name,
    artist: t.artist_name || 'Artista desconocido',
    album: t.album_name || 'Sencillo',
    genre: consultasJamendo[i].label || capitalizar(t.musicinfo?.tags?.genres?.[0]) || 'General',
    year: t.releasedate ? Number(String(t.releasedate).slice(0, 4)) : null,
    duration: t.duration || 0,
    file: t.audio,
    artwork: t.image || t.album_image || '',
    full: true,
  })));

  const deezer = dz.flatMap((d, i) => (d.data || []).map((t) => ({
    id: `dz-${t.id}`,
    title: t.title,
    artist: t.artist?.name || 'Artista desconocido',
    album: t.album?.title || 'Sencillo',
    genre: consultas[i].label || 'General',
    year: null,
    duration: 30,
    file: t.preview,
    artwork: t.album?.cover_medium || '',
    full: false,
  })));

  const itunes = it.flatMap((d, i) => (d.results || []).map((t) => ({
    id: `it-${t.trackId}`,
    title: t.trackName,
    artist: t.artistName,
    album: t.collectionName || 'Sencillo',
    genre: consultas[i].label || t.primaryGenreName || 'General',
    year: t.releaseDate ? new Date(t.releaseDate).getFullYear() : null,
    duration: 30,
    file: t.previewUrl,
    artwork: t.artworkUrl100 ? t.artworkUrl100.replace('100x100', '300x300') : '',
    full: false,
  })));

  const unicos = new Map();
  for (const c of [...jamendo, ...deezer, ...itunes]) {
    if (!c.file || !c.title) continue;
    const k = `${c.title.toLowerCase()}-${c.artist.toLowerCase()}`;
    if (!unicos.has(k)) unicos.set(k, c);
  }
  const data = Array.from(unicos.values());

  cacheExterno.set(clave, { expira: Date.now() + TTL_EXTERNO, data });
  res.json(data);
}));

// ---------- ENLACES DE AUDIO CADUCADOS ----------
// Los enlaces de audio de Deezer llevan una firma que CADUCA. Si una canción guardada (playlist, favoritos,
// historial) deja de sonar, el frontend pide aquí un enlace nuevo buscando la misma canción por título y artista.
const normalizarTexto = (s = '') => quitarAcentos(String(s)).toLowerCase().replace(/[^a-z0-9ñ ]+/g, ' ').replace(/\s+/g, ' ').trim();

app.get('/api/external/resolver', h(async (req, res) => {
  const titulo = String(req.query.titulo || '').trim();
  const artista = String(req.query.artista || '').trim();
  if (!titulo) return fail(res, 400, 'Falta el título de la canción');

  const t = normalizarTexto(titulo);
  const a = normalizarTexto(artista);
  const coincide = (nombre, autor) => {
    const n = normalizarTexto(nombre);
    const x = normalizarTexto(autor);
    return n && (n.includes(t) || t.includes(n)) && (!a || x.includes(a) || a.includes(x));
  };
  const getJson = (url) => fetch(url, { signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const consulta = encodeURIComponent(`${artista} ${titulo}`.trim());

  const [it, dz] = await Promise.all([
    getJson(`https://itunes.apple.com/search?term=${consulta}&entity=song&limit=10&country=MX`),
    getJson(`https://api.deezer.com/search?q=${consulta}&limit=10`),
  ]);

  // iTunes primero: sus enlaces de vista previa no caducan
  const deItunes = (it?.results || []).find((r) => r.previewUrl && coincide(r.trackName, r.artistName));
  if (deItunes) return res.json({ file: deItunes.previewUrl, fuente: 'itunes' });
  const deDeezer = (dz?.data || []).find((r) => r.preview && coincide(r.title, r.artist?.name));
  if (deDeezer) return res.json({ file: deDeezer.preview, fuente: 'deezer' });

  fail(res, 404, 'No se encontró un enlace de audio vigente para esta canción');
}));

// ---------- PROXY DE AUDIO (evita bloqueos del navegador y enlaces con firma) ----------
// El navegador pide el audio a TU servidor (/api/audio?url=...) y el servidor lo descarga de Deezer/iTunes/Jamendo.
// Así no lo bloquean las extensiones ni la prevención de rastreo de Edge, ni el rechazo (403) de Deezer por "hotlinking".
// Solo acepta los proveedores de la lista HOSTS_AUDIO (la misma que usan las descargas).
app.get('/api/audio', async (req, res) => {
  const MAX_REDIRECCIONES = 3;
  let destino;
  try { destino = new URL(String(req.query.url || '')); } catch { return fail(res, 400, 'Enlace de audio no válido'); }

  const ctrl = new AbortController();
  res.on('close', () => ctrl.abort());
  const headers = { 'User-Agent': 'Mozilla/5.0 (NextTune)', Accept: '*/*' };
  if (req.headers.range) headers.Range = req.headers.range; // permite adelantar/retroceder la canción

  try {
    let upstream = null;
    for (let i = 0; i <= MAX_REDIRECCIONES; i++) {
      if (!hostPermitido(destino.href)) return fail(res, 403, 'Proveedor de audio no permitido');
      // El tiempo límite solo vigila la espera de la respuesta; una vez que llega, el audio puede tardar lo que necesite en bajar
      for (let intento = 0; ; intento++) {
        const espera = new AbortController();
        const timer = setTimeout(() => { console.warn('[audio] el proveedor tardó más de 30 s:', destino.href); espera.abort(); }, 30000);
        try {
          upstream = await fetch(destino, { headers, redirect: 'manual', signal: AbortSignal.any([ctrl.signal, espera.signal]) });
          break;
        } catch (err) {
          if (ctrl.signal.aborted || intento >= 1) throw err; // un segundo intento por si el proveedor tardó
        } finally { clearTimeout(timer); }
      }
      if (upstream.status >= 300 && upstream.status < 400 && upstream.headers.get('location')) {
        destino = new URL(upstream.headers.get('location'), destino);
        continue;
      }
      break;
    }
    if (!upstream || (!upstream.ok && upstream.status !== 206)) {
            console.warn('[audio] el proveedor respondió', upstream?.status, destino.href);
      const code = upstream?.status === 403 || upstream?.status === 404 ? upstream.status : 502;
      return fail(res, code, 'El proveedor no entregó el audio');
    }
    res.status(upstream.status);
    for (const nombre of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
      const v = upstream.headers.get(nombre);
      if (v) res.setHeader(nombre, v);
    }
    if (!upstream.headers.get('accept-ranges')) res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    Readable.fromWeb(upstream.body).on('error', () => res.destroy()).pipe(res);
    } catch (e) {
    if (ctrl.signal.aborted) return; // el navegador canceló la petición (cambiaste de canción o adelantaste): es normal
    console.error('[audio] error:', destino.href, e?.cause?.code || e?.cause?.message || e?.message);
    if (!res.headersSent) fail(res, 502, 'No se pudo obtener el audio del proveedor');
    else res.destroy();
  }
});

// ---------- FRONTEND COMPILADO ----------
app.use('/audio', express.static(AUDIO_DIR));
app.use('/covers', express.static(COVERS_DIR));
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|audio|covers).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const PORT = Number(process.env.PORT || 3000);
pool.query('SELECT 1').then(async () => {
  await crearTablasSociales();
  console.log('Conectado a MySQL');
  app.listen(PORT, () => console.log(`🎵 API de NextTune en http://localhost:${PORT}`));
}).catch((e) => {
  console.error('No se pudo conectar a MySQL:', e.message);
  process.exit(1);
});