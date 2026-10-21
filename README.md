# OBS Gallery Remote

Panel web móvil para controlar OBS Studio desde un teléfono o tablet, con foco en la gestión de imágenes durante transmisiones en vivo.

La aplicación combina **Node.js + Express** con **obs-websocket** para ofrecer un panel ligero, accesible desde la red local o desde un tailnet privado mediante **Tailscale**. El frontend está pensado para uso táctil y puede instalarse como **PWA**.

---

## Qué ha cambiado recientemente

El proyecto ya no depende exclusivamente de una única carpeta `gallery/` ni de una configuración fija. Ahora incluye:

- gestión de múltiples fuentes de galería configurables;
- almacenamiento local persistente de fuentes en `data/gallery-sources.json`;
- panel para añadir, activar/desactivar, renombrar y eliminar fuentes;
- vista unificada de imágenes de todas las fuentes activas;
- soporte de monitor de programa con vista previa en directo;
- integración con Aitum Stream Suite para gestionar salidas adicionales;
- control de visibilidad de fuentes dentro de OBS;
- mejoras en la sincronización y en la UX del panel móvil.

---

## Estado actual del proyecto

OBS Gallery Remote funciona como panel móvil de control real para OBS, con las siguientes capacidades principales:

### Galería multimedia

- listado de imágenes desde una o múltiples carpetas;
- soporte para `JPG`, `JPEG`, `PNG`, `WEBP`, `BMP` y `GIF`;
- organización por carpetas y categorías;
- búsqueda por nombre o ruta relativa;
- vista previa antes de mostrar en pantalla;
- selección visual de la imagen actual;
- botón **Mostrar en OBS**;
- modo **Auto Show** para enviar automáticamente la imagen seleccionada;
- sincronización con el estado de OBS;
- uso de la fuente de imagen dedicada `OBS_GALLERY_REMOTE`.

### Fuentes de galería

La galería ya admite múltiples directorios de imágenes configurados por el usuario.

El flujo actual es:

- se guarda una lista local en `data/gallery-sources.json`;
- cada fuente tiene `id`, `name`, `path` y `enabled`;
- el panel puede añadir nuevas rutas, renombrarlas, activar/desactivar o eliminarla;
- solo las fuentes habilitadas forman el índice global de imágenes.

Ejemplo del archivo de configuración:

```json
{
  "sources": [
    {
      "id": "default",
      "name": "Galería local",
      "path": "C:/Ruta/Proyecto/gallery",
      "enabled": true
    }
  ]
}
```

La carpeta `GALLERY_ROOT` sigue siendo un valor útil como fuente por defecto, pero ya no es el único mecanismo disponible.

### Escenas y fuentes de OBS

- listado de escenas desde OBS;
- cambio de escena actual desde el teléfono;
- actualización automática cuando OBS cambia la escena;
- listado de fuentes del programa y control de visibilidad;
- sincronización con el estado real de OBS.

### Audio

- listado de fuentes de audio;
- mute / unmute;
- control de volumen en dB;
- sincronización automática ante cambios desde OBS;
- ajuste de volumen con confirmación final para evitar tráfico innecesario.

### Emisión, grabación y delay

Control independiente de:

- streaming principal;
- grabación;
- salidas adicionales gestionadas por Aitum;
- `stream delay` configurado en OBS.

La interfaz muestra:

- estado actual;
- tiempo de emisión;
- tiempo de grabación;
- retraso configurado;
- tiempo estimado desde el inicio de la transmisión.

### Monitor de programa

Se incluye un monitor con vista previa de la escena actual en vivo:

- captura del programa actual desde OBS;
- actualización periódica;
- modo PiP para mantener la vista pequeña sobre el panel;
- refleja el contenido que está en emisión en ese momento.

### Aitum Stream Suite

El proyecto incluye integración con **Aitum Stream Suite** cuando está disponible en OBS.

Actualmente se exponen endpoints para consultar y controlar salidas adicionales:

- `GET /api/obs/aitum`
- `POST /api/obs/aitum/streams/start-all`
- `POST /api/obs/aitum/streams/stop-all`

Esto permite gestionar salidas secundarias desde el mismo panel cuando el plugin de OBS lo expone mediante vendor requests.

---

## Sincronización en tiempo real

El backend mantiene una conexión con OBS y expone cambios al frontend mediante **Server-Sent Events (SSE)**.

```text
OBS
 │
 │ obs-websocket
 ▼
Node / Express
 │
 │ SSE
 ▼
PWA / navegador
```

Los eventos sincronizados incluyen:

- estado de conexión de OBS;
- escena actual;
- estado de audio;
- volumen;
- emisión/recording;
- imagen utilizada por `OBS_GALLERY_REMOTE`;
- cambios de visibilidad de fuentes;
- estado del monitor de programa.

Endpoint principal:

```text
GET /api/obs/events
```

La conexión incluye heartbeat y reconexión automática del cliente.

---

## Reconexión automática y robustez

El backend intenta conectar con OBS al arrancar y reintenta automáticamente si la conexión se pierde.

Cuando OBS se desconecta:

1. el panel pasa a estado desconectado;
2. los controles dependientes de OBS quedan deshabilitados;
3. el sistema reintenta la conexión;
4. cuando OBS vuelve, se sincronizan los estados nuevamente.

Esto permite iniciar Node antes que OBS y no reiniciar la app si OBS se cierra o reinicia.

---

## Autenticación y seguridad

El panel está protegido con usuario/contraseña por sesión.

Configuración mínima en `.env`:

```dotenv
PANEL_PASSWORD=change_me
SESSION_SECRET=change_me_with_a_long_random_secret
```

La implementación usa:

- cookie de sesión firmada;
- `HttpOnly`;
- `SameSite=Strict`;
- duración de sesión de 7 días;
- validación HMAC SHA-256;
- comparación segura por `timingSafeEqual`;
- rate limiting de login;
- protección server-side de las APIs.

No se usa base de datos ni Redis para sesiones.

### Rate limiting

Los intentos fallidos de login se controlan en memoria:

```text
5 intentos / 5 minutos / IP
```

Tras exceder el límite, el backend responde con `429 Too Many Requests`.

---

## PWA

OBS Gallery Remote puede instalarse como una **Progressive Web App**.

Incluye:

- `manifest.webmanifest`;
- iconos 192×192 y 512×512;
- iconos maskable;
- modo `standalone`;
- soporte para iOS;
- Service Worker;
- caché del app shell;
- instalación desde navegadores compatibles.

### Estrategia de caché

El Service Worker solo cachea recursos estáticos de la app. Las APIs nunca se cachean:

```text
/api/*
```

Incluye también:

```text
/api/obs/*
/api/gallery/*
/api/auth/*
/api/obs/events
```

Esto evita mostrar estados antiguos de OBS en el navegador.

---

## Acceso remoto seguro con Tailscale

La configuración recomendada sigue siendo **Tailscale Serve**.

Arquitectura sugerida:

```text
Teléfono / PWA
      │
      │ HTTPS
      │ Tailscale
      ▼
Tailscale Serve
      │
      │ reverse proxy
      ▼
127.0.0.1:3000
Node / Express
      │
      │ obs-websocket
      ▼
127.0.0.1:4455
OBS Studio
```

Esto permite:

- HTTPS válido para la PWA;
- acceso desde fuera de la LAN;
- mantener la app y OBS dentro del tailnet;
- no abrir puertos del router;
- no exponer OBS WebSocket directamente.

---

## Instalación

### Requisitos

- Windows 10 o superior.
- OBS Studio 28+.
- Node.js LTS.
- obs-websocket habilitado.
- Tailscale para acceso remoto desde otros dispositivos.

### 1. Configurar OBS

En OBS:

**Herramientas → Ajustes del servidor WebSocket**

Configura:

- WebSocket habilitado;
- autenticación habilitada;
- puerto `4455` (o el que prefieras);
- contraseña segura.

Crea además una fuente de tipo **Imagen** llamada exactamente:

```text
OBS_GALLERY_REMOTE
```

Esta fuente sigue siendo la fuente de trabajo principal para la galería.

### 2. Clonar e instalar

```powershell
git clone https://github.com/kitorosano/obs-gallery-remote.git
cd obs-gallery-remote
npm install
```

### 3. Configurar `.env`

```powershell
Copy-Item .env.example .env
```

Configuración recomendada:

```dotenv
HOST=127.0.0.1
PORT=3000

GALLERY_ROOT=./gallery

OBS_HOST=127.0.0.1
OBS_PORT=4455
OBS_PASSWORD=replace_me

OBS_IMAGE_INPUT=OBS_GALLERY_REMOTE
OBS_STREAM_DELAY_SECONDS=0

PANEL_PASSWORD=replace_me
SESSION_SECRET=replace_with_a_long_random_secret
```

> `GALLERY_ROOT` se conserva como origen por defecto, pero hoy la app permite definir varias fuentes desde el propio panel y almacenarlas localmente.

### 4. Ejecutar

```powershell
npm start
```

Abrir en navegador:

```text
http://127.0.0.1:3000
```

Para acceso remoto, se recomienda usar **Tailscale Serve** en lugar de publicar el puerto `3000` directamente.

---

## Estructura del proyecto

```text
obs-gallery-remote/
├── data/
│   └── gallery-sources.json
├── gallery/
├── public/
│   ├── app.js
│   ├── index.html
│   ├── manifest.webmanifest
│   ├── service-worker.js
│   ├── css/
│   └── js/
├── server/
│   ├── config/
│   ├── constants/
│   ├── controllers/
│   ├── middleware/
│   ├── obs/
│   ├── routes/
│   ├── services/
│   └── index.js
├── .env.example
├── package.json
├── run.bat
└── README.md
```

La carpeta `data/` guarda la configuración persistente de fuentes de galería.

---

## API relevante

### Autenticación

```text
GET  /api/auth/status
POST /api/auth/login
POST /api/auth/logout
```

### Galería

```text
GET  /api/gallery
GET  /api/gallery/:id/file
GET  /api/gallery/sources
POST /api/gallery/sources
PATCH /api/gallery/sources/:id
DELETE /api/gallery/sources/:id
```

### OBS

```text
GET  /api/obs/status
POST /api/obs/connect
POST /api/obs/show
GET  /api/obs/gallery-image
GET  /api/obs/program/screenshot

GET  /api/obs/scenes
POST /api/obs/scenes/current

GET  /api/obs/sources
POST /api/obs/sources/visibility

GET  /api/obs/audio
POST /api/obs/audio/mute
POST /api/obs/audio/volume

GET  /api/obs/output/status
POST /api/obs/record/start
POST /api/obs/record/stop

GET  /api/obs/aitum
POST /api/obs/aitum/streams/start-all
POST /api/obs/aitum/streams/stop-all

GET  /api/obs/events
```

Todos los endpoints de OBS y Gallery requieren autenticación.

---

## Principios de diseño

- OBS es la fuente de verdad del estado.
- Las mutaciones importantes se validan con una sincronización posterior.
- El navegador no recibe credenciales de OBS.
- OBS WebSocket permanece local.
- Las APIs dinámicas no se cachean en el Service Worker.
- Los controles destructivos deben solicitar confirmación.
- Se evita tráfico innecesario hacia OBS.
- La UI está pensada para operar cómodamente desde un teléfono.
- El backend se mantiene ligero para no competir con OBS por CPU/RAM.

---

## Próximas mejoras y trabajo pendiente

El proyecto ya está operativo para producción en muchos casos de uso de control móvil, pero aún hay margen para mejorar:

- explorador de directorios más amigable para seleccionar carpetas desde el móvil;
- edición avanzada de fuentes con validación más estricta;
- mejor manejo de errores para rutas inaccesibles o no válidas;
- mejoras visuales en la galería y en el monitor de programa;
- más indicadores de imagen activa y filtros avanzados;
- integración extra con otros plugins de OBS cuando expongan APIs estables.

---

## Estado final

OBS Gallery Remote ya es un panel operativo para:

- galería multi-fuente;
- escenas;
- audio;
- streaming;
- grabación;
- monitor de programa;
- sincronización en tiempo real;
- reconexión automática;
- autenticación;
- PWA;
- acceso privado usando Tailscale.

La evolución principal ya está implementada: la galería ya no es un único directorio fijo, sino un conjunto de fuentes configurables y gestionables desde la propia aplicación.
