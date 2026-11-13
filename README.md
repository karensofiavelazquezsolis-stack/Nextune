# NextTune (diseño de Figma Make + MySQL)

Frontend: tu diseño de Figma Make (React + Tailwind), sin cambios visuales.
Backend: Node + Express + MySQL (carpeta `server/`).

## Pasos

1. Instala Node.js 22 LTS (https://nodejs.org). MySQL debe estar encendido.
2. En MySQL Workbench ejecuta tu script de las 19 tablas (si no lo has hecho).
3. Copia `.env.example` a `.env` y escribe tu contraseña de MySQL en `DB_PASSWORD`.
4. En la terminal de VS Code, dentro de esta carpeta:

```
npm install
npm run seed
npm run dev
```

5. Abre http://localhost:5173

`npm run seed` agrega la columna de contraseña, el catálogo de ejemplo (las 6 canciones del diseño)
y 4 cuentas de prueba. Puedes ejecutarlo varias veces sin duplicar nada.

## Cuentas de prueba (contraseña: demo123)

| Correo | Rol |
|---|---|
| usuario@nexttune.mx | Usuario normal |
| premium@nexttune.mx | Usuario Premium |
| admin@nexttune.mx | Administrador |
| vencido@nexttune.mx | Membresía vencida |

## Audio

Pon tus mp3 en `public/audio/` con los nombres `cancion1.mp3` … `cancion6.mp3`
(o cambia `archivo_audio` en la tabla Cancion). Si el archivo no existe, la app
simula el avance de la canción como en el prototipo.

## Qué está conectado a la base de datos

Registro, inicio de sesión, recuperación de contraseña, catálogo (Cancion/Artista/Album/Genero),
letras, favoritos, playlists, historial de reproducción, descargas (solo Premium), compartir,
pagos simulados + suscripción Premium, perfil editable y todo el panel de administrador
(resumen, usuarios y roles, pagos, catálogo).

Pendiente (las tablas ya existen): Cola de reproducción, Recomendaciones y edición del catálogo desde el panel admin.

## Versión de producción en un solo puerto

```
npm run build
npm start        # http://localhost:3000
```
