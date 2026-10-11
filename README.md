# OBS Gallery Remote

Panel web móvil para controlar OBS Studio de forma remota, con especial enfoque en el manejo de imágenes durante transmisiones en vivo.

La aplicación utiliza **Node.js + Express** como backend y se comunica con OBS mediante **obs-websocket**. El frontend está diseñado principalmente para teléfonos y puede instalarse como **PWA**.

El acceso remoto se realiza de forma privada mediante **Tailscale**, sin exponer OBS WebSocket ni el servidor Node directamente a Internet.

---

## Funcionalidades actuales

### Galería de imágenes

- Listado de imágenes disponibles.
- Soporte para JPG, JPEG, PNG, WEBP, BMP y GIF.
- Organización mediante subdirectorios/categorías.
- Búsqueda de imágenes.
- Vista previa antes de enviar a OBS.
- Selección visual de la imagen actual.
- Botón **Mostrar en OBS**.
- Modo **Auto Show** para enviar automáticamente una imagen al seleccionarla.
- Sincronización bidireccional:
  - si la imagen cambia desde el panel, OBS se actualiza;
  - si la fuente cambia directamente desde OBS, el panel actualiza su selección.
- La aplicación utiliza una fuente de imagen dedicada de OBS:
  - `OBS_GALLERY_REMOTE`

Actualmente las imágenes se leen desde el directorio `gallery/`.

> Está planificada una evolución de este sistema para permitir múltiples directorios externos configurables. Ver [Roadmap](#roadmap).

---

### Escenas

- Obtención de escenas desde OBS.
- Cambio de escena de programa desde el teléfono.
- Sincronización automática cuando la escena cambia directamente desde OBS.
- OBS se mantiene como fuente de verdad del estado.

---

### Audio

- Listado de fuentes de audio.
- Mute / unmute.
- Control de volumen.
- Volumen expresado en dB.
- Sincronización automática ante cambios realizados directamente desde OBS.

El slider no envía solicitudes por cada píxel recorrido: el cambio se confirma al finalizar la interacción para evitar tráfico innecesario hacia OBS.

---

### Emisión y grabación

Control independiente de:

- Streaming.
- Grabación.

La interfaz muestra:

- estado actual;
- tiempo de emisión;
- tiempo de grabación;
- Stream Delay configurado.

También existen confirmaciones antes de detener una transmisión o grabación para evitar acciones accidentales durante un evento en vivo.

---

### Stream Delay

El proyecto contempla el retraso configurado en OBS.

Puede configurarse mediante:

```dotenv
OBS_STREAM_DELAY_SECONDS=10
```

El panel distingue entre:

- **Tiempo de emisión:** duración reportada por OBS WebSocket.
- **Retraso configurado:** Stream Delay.
- **Tiempo desde inicio:** duración aproximada desde que se inició físicamente la transmisión.

---

## Sincronización en tiempo real

El backend mantiene una conexión WebSocket con OBS.

El frontend recibe cambios mediante **Server-Sent Events (SSE)**:

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

Actualmente se sincronizan eventos relacionados con:

- conexión/desconexión de OBS;
- escena actual;
- mute de audio;
- volumen;
- streaming;
- grabación;
- imagen utilizada por `OBS_GALLERY_REMOTE`.

El endpoint SSE es:

```text
GET /api/obs/events
```

La conexión incluye heartbeat periódico y el navegador puede reconectarse automáticamente.

---

## Reconexión automática a OBS

El backend intenta conectarse automáticamente a OBS al iniciar.

Si OBS todavía no está abierto o se cierra durante el funcionamiento:

1. el backend detecta la desconexión;
2. el frontend pasa al estado OBS desconectado;
3. los controles que dependen de OBS quedan temporalmente deshabilitados;
4. el backend intenta reconectarse automáticamente;
5. cuando OBS vuelve a estar disponible, el panel sincroniza nuevamente sus estados.

Esto permite iniciar el servidor Node antes que OBS y también cerrar/reabrir OBS sin reiniciar la aplicación.

---

## Autenticación

El panel está protegido mediante contraseña.

La configuración se realiza en `.env`:

```dotenv
PANEL_PASSWORD=change_me
SESSION_SECRET=change_me
```

La implementación utiliza:

- cookie de sesión firmada;
- `HttpOnly`;
- `SameSite=Strict`;
- duración de sesión de 7 días;
- validación HMAC SHA-256;
- comparación segura mediante `timingSafeEqual`;
- protección server-side de las APIs;
- rate limiting del login.

No se utiliza:

- base de datos;
- Redis;
- almacenamiento externo de sesiones.

### Rate limiting

Los intentos fallidos de inicio de sesión se controlan en memoria.

Actualmente:

```text
5 intentos / 5 minutos / IP
```

Después del límite, el backend responde con `429 Too Many Requests`.

---

## PWA

OBS Gallery Remote puede instalarse como una **Progressive Web App**.

Incluye:

- `manifest.webmanifest`;
- iconos 192×192;
- iconos 512×512;
- iconos maskable;
- modo `standalone`;
- metadatos para iOS;
- Service Worker;
- caché del app shell;
- experiencia de instalación para navegadores compatibles;
- instrucciones específicas para iPhone/iPad.

### Estrategia de caché

El Service Worker solamente almacena recursos estáticos de la aplicación.

Por diseño, las APIs nunca se cachean:

```text
/api/*
```

Esto incluye:

```text
/api/obs/*
/api/gallery/*
/api/auth/*
/api/obs/events
```

De esta forma nunca se presenta como actual un estado antiguo de OBS.

---

## Acceso remoto seguro con Tailscale

La configuración recomendada utiliza **Tailscale Serve**.

La arquitectura de producción es:

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
- acceso desde el teléfono;
- acceso remoto fuera de la LAN;
- mantener el panel dentro del tailnet;
- no abrir puertos del router;
- no exponer OBS WebSocket;
- no instalar Nginx o Caddy;
- no gestionar certificados TLS manualmente.

Se utiliza **Tailscale Serve**, no Funnel.

Por tanto, el panel permanece privado para dispositivos autorizados en el tailnet.

### MagicDNS

MagicDNS debe estar habilitado para acceder mediante el hostname proporcionado por Tailscale:

```text
https://<nombre-pc>.<tailnet>.ts.net
```

### Tailscale Serve

Con el backend funcionando en el puerto `3000`:

```powershell
tailscale serve --bg 3000
```

Para comprobar la configuración:

```powershell
tailscale serve status
```

El resultado esperado es similar a:

```text
https://<hostname>.<tailnet>.ts.net (tailnet only)
|-- / proxy http://127.0.0.1:3000
```

---

## Seguridad

La configuración recomendada es:

```dotenv
HOST=127.0.0.1
PORT=3000

OBS_HOST=127.0.0.1
OBS_PORT=4455
```

Esto significa que ni Node ni OBS WebSocket necesitan escuchar directamente conexiones provenientes de la LAN.

El flujo de acceso remoto es:

```text
Teléfono
   │
   │ Tailscale
   ▼
HTTPS :443
   │
   ▼
Tailscale Serve
   │
   ▼
Node :3000
   │
   ▼
OBS :4455
```

Además existen dos capas independientes de acceso:

1. el dispositivo debe pertenecer al tailnet autorizado;
2. el usuario debe autenticarse en OBS Gallery Remote.

No se recomienda exponer los puertos `3000` o `4455` mediante port forwarding.

---

# Instalación

## Requisitos

- Windows 10 o superior.
- OBS Studio 28+.
- Node.js LTS.
- obs-websocket habilitado.
- Tailscale para acceso remoto/PWA desde otros dispositivos.

OBS Studio incluye obs-websocket de forma integrada en versiones modernas.

---

## 1. Configurar OBS

En OBS:

**Herramientas → Ajustes del servidor WebSocket**

Configura:

- servidor WebSocket habilitado;
- autenticación habilitada;
- puerto, normalmente `4455`;
- contraseña segura.

Crea además una fuente de tipo **Imagen** llamada exactamente:

```text
OBS_GALLERY_REMOTE
```

Esta fuente está dedicada al proyecto.

---

## 2. Instalar el proyecto

Clona el repositorio:

```powershell
git clone https://github.com/kitorosano/obs-gallery-remote.git
cd obs-gallery-remote
```

Instala las dependencias:

```powershell
npm install
```

---

## 3. Configurar `.env`

Copia:

```powershell
Copy-Item .env.example .env
```

Configura como mínimo:

```dotenv
HOST=127.0.0.1
PORT=3000

GALLERY_ROOT=./gallery

OBS_HOST=127.0.0.1
OBS_PORT=4455
OBS_PASSWORD=replace_me

OBS_IMAGE_INPUT=OBS_GALLERY_REMOTE
OBS_STREAM_DELAY_SECONDS=10

PANEL_PASSWORD=replace_me
SESSION_SECRET=replace_with_a_long_random_secret
```

No publiques `.env` ni almacenes allí credenciales reales dentro del repositorio.

---

## 4. Ejecutar

Con OBS disponible:

```powershell
npm start
```

Desde el propio PC:

```text
http://127.0.0.1:3000
```

Para acceso desde otro dispositivo se recomienda Tailscale Serve en lugar de exponer directamente el puerto `3000`.

---

# Arquitectura del proyecto

El backend Express está organizado por responsabilidades:

```text
server/
├── config/
├── constants/
├── controllers/
├── middleware/
├── obs/
├── routes/
└── services/
```

El frontend utiliza módulos independientes:

```text
public/
├── app.js
├── index.html
├── main.css
├── manifest.webmanifest
├── service-worker.js
│
├── icons/
├── css/
└── js/
```

Entre los módulos frontend se encuentran responsabilidades para:

```text
auth
gallery
navigation
OBS
scenes
audio
output
OBS events
PWA
```

`app.js` compone las funcionalidades; `services.js` encapsula los contratos
HTTP, `panel.js` coordina la sincronización con OBS y cada módulo de interfaz
recibe únicamente los elementos DOM que necesita.

El navegador nunca se conecta directamente a OBS.

Toda interacción sigue:

```text
Frontend
   │
   │ REST / SSE
   ▼
Node / Express
   │
   │ obs-websocket
   ▼
OBS
```

Esto mantiene credenciales y lógica sensible fuera del cliente.

---

# API

## Autenticación

```text
GET  /api/auth/status
POST /api/auth/login
POST /api/auth/logout
```

## Galería

```text
GET /api/gallery
GET /api/gallery/:id/file
```

## OBS

```text
GET  /api/obs/status
POST /api/obs/show
GET  /api/obs/gallery-image
```

## Escenas

```text
GET  /api/obs/scenes
POST /api/obs/scenes/current
```

## Audio

```text
GET  /api/obs/audio
POST /api/obs/audio/mute
POST /api/obs/audio/volume
```

## Emisión

```text
GET  /api/obs/output/status

POST /api/obs/stream/start
POST /api/obs/stream/stop

POST /api/obs/record/start
POST /api/obs/record/stop
```

## Eventos

```text
GET /api/obs/events
```

Los endpoints de OBS y Gallery requieren autenticación.

---

# Principios de diseño

El proyecto sigue algunas reglas importantes:

- OBS es la fuente de verdad para su estado.
- Después de una mutación importante se vuelve a consultar o sincronizar el estado.
- El navegador nunca recibe las credenciales de OBS.
- OBS WebSocket permanece local.
- Las APIs dinámicas no se almacenan en el Service Worker.
- Los controles destructivos durante una transmisión requieren confirmación.
- Se evita generar tráfico innecesario hacia OBS.
- La interfaz debe ser cómoda para operación táctil desde un teléfono.
- El backend debe mantenerse liviano para no competir con OBS por CPU o RAM.

---

# Roadmap

## Gallery Multi-Source

La siguiente evolución importante del proyecto será eliminar la dependencia de una única carpeta `gallery/`.

El objetivo es permitir configurar desde el panel **uno o varios directorios de imágenes del PC**, incluso cuando estén fuera del proyecto.

Ejemplo:

```text
D:\Iglesia\Cultos
D:\Iglesia\Jovenes
E:\Recursos\Imagenes
```

Node accederá directamente a esos directorios. Las imágenes no serán copiadas ni movidas.

### Fuentes de galería

Cada directorio será tratado como una fuente independiente:

```text
Galerías

✓ Cultos
  D:\Iglesia\Cultos

✓ Jóvenes
  D:\Iglesia\Jovenes

✓ Recursos
  E:\Recursos\Imagenes
```

Cada fuente tendrá, como mínimo:

```text
id
nombre
ruta
enabled
```

La configuración podrá persistirse localmente sin necesidad de una base de datos.

### Galería unificada

Las fuentes activas formarán un único índice de imágenes.

El usuario podrá:

- buscar entre todas las imágenes;
- seleccionar una fuente específica;
- filtrar resultados;
- continuar utilizando categorías/subdirectorios;
- visualizar previews;
- enviar cualquier imagen válida a `OBS_GALLERY_REMOTE`.

El frontend trabajará con identificadores lógicos y no con rutas arbitrarias del filesystem.

Ejemplo:

```json
{
  "id": "cultos:anuncios/bautismos.png",
  "sourceId": "cultos",
  "name": "bautismos.png",
  "category": "Anuncios"
}
```

La ruta física será resuelta exclusivamente por el backend.

### Administración desde el frontend

Está previsto poder:

- agregar fuentes;
- eliminar fuentes;
- activar/desactivar fuentes;
- asignar nombres descriptivos;
- visualizar las rutas configuradas.

### Explorador de directorios

Como el navegador del teléfono no puede abrir directamente el selector de carpetas de Windows, se plantea implementar un explorador seguro servido por Node.

Conceptualmente:

```text
Seleccionar directorio

Este equipo
├── C:\
├── D:\
│   ├── Iglesia
│   │   ├── Cultos
│   │   ├── Jóvenes
│   │   └── Multimedia
│   └── Recursos
└── E:\
```

El teléfono únicamente navegará la estructura permitida; Node será quien consulte el filesystem.

La implementación deberá impedir path traversal y evitar que los endpoints puedan utilizarse para leer archivos arbitrarios del PC.

---

## Otras mejoras posibles

- Navegación anterior / siguiente.
- Indicador más destacado de imagen actualmente al aire.
- Favoritos.
- Historial de imágenes utilizadas.
- Detección automática de cambios en directorios.
- Transiciones.
- Preview de Program de OBS.
- Integraciones adicionales con plugins de OBS cuando dispongan de APIs estables.

---

## Aitum Multistream

Se investigó la integración con **Aitum Multistream 1.0.8** para controlar una salida secundaria, por ejemplo Facebook, además del streaming principal de OBS.

La versión utilizada actualmente no expone el vendor WebSocket necesario para realizar esta integración de forma robusta desde obs-websocket.

Por este motivo no se implementó automatización mediante clicks, teclado u otros mecanismos frágiles.

La integración puede reconsiderarse cuando Aitum exponga una API estable compatible con obs-websocket.

---

# Estado actual

OBS Gallery Remote ya funciona como panel móvil para operación real de OBS, incluyendo:

```text
Galería
Escenas
Audio
Streaming
Grabación
Sincronización en tiempo real
Reconexión automática
Autenticación
PWA
HTTPS
Acceso privado mediante Tailscale
```

La siguiente área principal de desarrollo es **Gallery Multi-Source**.
