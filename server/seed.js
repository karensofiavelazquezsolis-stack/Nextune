// Prepara la base de datos para la app: agrega la columna de contraseña y carga datos de ejemplo.
// Es seguro ejecutarlo varias veces:  npm run seed
import bcrypt from 'bcryptjs';
import { pool, q } from './db.js';

const LETRA = ['Cruzan las luces la ciudad,', 'cada latido vuelve a empezar.', 'Sigue el camino, déjate llevar,', 'la noche apenas va a comenzar.', 'Somos el eco de otra señal.'].join('\n');

async function main() {
  // 1) Columna de contraseña (el diagrama original no la tenía)
  const col = await q(`SELECT 1 FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE() AND LOWER(TABLE_NAME) = 'usuario' AND COLUMN_NAME = 'contrasena_hash'`);
  if (!col.length) {
    await q("ALTER TABLE Usuario ADD COLUMN contrasena_hash VARCHAR(255) NOT NULL DEFAULT ''");
    console.log('• Columna contrasena_hash agregada a Usuario');
  }

  // 2) Roles y membresías
  await q("INSERT IGNORE INTO Rol (id_rol, nombre, descripcion) VALUES (1, 'Administrador', 'Gestiona usuarios, pagos y catálogo'), (2, 'Usuario', 'Usuario de la app')");
  if (!(await q("SELECT 1 FROM Membresia WHERE nombre = 'Premium mensual'")).length) {
    await q(`INSERT INTO Membresia (nombre, precio, duracion_dias, descripcion) VALUES
      ('Gratis', 0, 36500, 'Escucha en línea con anuncios'),
      ('Premium mensual', 89, 30, 'Sin anuncios, descargas y modo sin conexión'),
      ('Premium anual', 899, 365, 'Premium con descuento anual')`);
  }

  // 3) Catálogo (las mismas canciones del diseño de Figma)
  await q("DELETE FROM Artista WHERE nombre IN ('Artista Demo 1', 'Artista Demo 2')"); // datos de prueba viejos
  if (!(await q("SELECT 1 FROM Artista WHERE nombre = 'Mara Nova'")).length) {
    const generos = {};
    for (const g of ['Pop', 'Rock', 'Hip Hop', 'Reggaetón', 'Regional', 'Electrónica', 'Indie']) {
      const ex = await q('SELECT id_genero FROM Genero WHERE nombre = ?', [g]);
      generos[g] = ex.length ? ex[0].id_genero : (await q('INSERT INTO Genero (nombre) VALUES (?)', [g])).insertId;
    }
    const catalogo = [
      ['Luz de neón', 'Mara Nova', 'Horizonte', 'Electrónica', 222],
      ['Sin gravedad', 'Vértice Sur', 'Órbita', 'Pop', 205],
      ['Noche infinita', 'Cobalto', 'Después del sol', 'Rock', 238],
      ['Kilómetros', 'Alma Polar', 'Mapas', 'Indie', 197],
      ['Pulsos', 'Línea Cero', 'Frecuencia', 'Electrónica', 214],
      ['Volver a empezar', 'Nilo Ámbar', 'Ciclos', 'Pop', 226],
    ];
    for (const [i, [titulo, artista, album, genero, dur]] of catalogo.entries()) {
      const idArtista = (await q('INSERT INTO Artista (nombre) VALUES (?)', [artista])).insertId;
      const idAlbum = (await q('INSERT INTO Album (titulo, anio, id_artista) VALUES (?, 2025, ?)', [album, idArtista])).insertId;
      const idCancion = (await q(
        'INSERT INTO Cancion (titulo, duracion, archivo_audio, id_genero, id_album, id_artista) VALUES (?, ?, ?, ?, ?, ?)',
        [titulo, dur, `cancion${i + 1}.mp3`, generos[genero], idAlbum, idArtista])).insertId;
      await q('INSERT INTO Letra (contenido, sincronizada, id_cancion) VALUES (?, TRUE, ?)', [LETRA, idCancion]);
    }
    console.log('• Catálogo de ejemplo creado (6 canciones)');
  }

  // 4) Cuentas de prueba (contraseña: demo123)
  const hash = await bcrypt.hash('demo123', 10);
  const cuentas = [
    ['Leo Mendoza', 'usuario@nexttune.mx', '55 2480 3312', '1996-04-18', 2, null],
    ['Lucía Mar', 'premium@nexttune.mx', '55 1033 8821', '1991-11-02', 2, 'activa'],
    ['Ana Norte', 'admin@nexttune.mx', '55 9902 1174', '1988-07-24', 1, null],
    ['Diego Sol', 'vencido@nexttune.mx', '55 7001 2244', '1994-02-09', 2, 'vencida'],
  ];
  const [premium] = await q("SELECT id_membresia, precio FROM Membresia WHERE nombre = 'Premium mensual'");
  for (const [nombre, correo, tel, nac, rol, sub] of cuentas) {
    if ((await q('SELECT 1 FROM Usuario WHERE correo = ?', [correo])).length) {
      await q('UPDATE Usuario SET contrasena_hash = ? WHERE correo = ? AND contrasena_hash = ""', [hash, correo]);
      continue;
    }
    const id = (await q(
      'INSERT INTO Usuario (nombre, correo, telefono, fecha_nacimiento, contrasena_hash, id_rol) VALUES (?,?,?,?,?,?)',
      [nombre, correo, tel, nac, hash, rol])).insertId;
    if (sub === 'activa') {
      await q("INSERT INTO Suscripcion (fecha_inicio, fecha_fin, estado, id_usuario, id_membresia) VALUES (CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY), 'activa', ?, ?)", [id, premium.id_membresia]);
      await q("INSERT INTO Pago (monto, fecha_pago, metodo_pago, estado, id_usuario) VALUES (?, CURDATE(), 'Tarjeta', 'aprobado', ?)", [premium.precio, id]);
    }
    if (sub === 'vencida') {
      await q("INSERT INTO Suscripcion (fecha_inicio, fecha_fin, estado, id_usuario, id_membresia) VALUES (DATE_SUB(CURDATE(), INTERVAL 40 DAY), DATE_SUB(CURDATE(), INTERVAL 10 DAY), 'activa', ?, ?)", [id, premium.id_membresia]);
    }
  }
  console.log('✅ Listo. Cuentas de prueba: usuario@, premium@, admin@, vencido@nexttune.mx  (contraseña: demo123)');
}

main().catch((e) => { console.error('❌', e.message); process.exitCode = 1; }).finally(() => pool.end());
