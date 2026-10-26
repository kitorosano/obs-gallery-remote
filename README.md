# OBS Gallery Remote

Panel web móvil para controlar **OBS Studio** desde un teléfono, tablet o navegador, diseñado especialmente para operación durante transmisiones en vivo.

La aplicación combina **Node.js + Express** con **obs-websocket** para ofrecer un panel ligero y sincronizado en tiempo real con OBS. El frontend está diseñado con enfoque **mobile-first**, puede instalarse como **PWA** y puede utilizarse de forma remota y privada mediante **Tailscale**.

El proyecto comenzó como un controlador remoto de una galería de imágenes, pero actualmente funciona como un panel de operación más completo para OBS, incluyendo:

- galería multi-fuente;
- escenas;
- fuentes;
- audio;
- streaming;
- grabación;
- integración con Aitum Stream Suite;
- monitor del programa;
- sincronización en tiempo real;
- reconexión automática;
- autenticación;
- PWA;
- interfaz optimizada para dispositivos móviles.

---

## Estado actual del proyecto

OBS Gallery Remote funciona actualmente como un panel móvil de control para OBS.

La interfaz principal está organizada en tres áreas:

```text
Galería | Control | Emisión
```

En dispositivos móviles estas secciones se presentan mediante una **bottom navigation** similar a una aplicación nativa.

### Galería

Permite administrar y mostrar imágenes mediante una fuente dedicada de OBS:

```text
OBS_GALLERY_REMOTE
```

Incluye:

- listado de imágenes desde una o múltiples carpetas;
- soporte para `JPG`, `JPEG`, `PNG`, `WEBP`, `BMP` y `GIF`;
- organización por carpetas y categorías;
- búsqueda por nombre o ruta relativa;
- selección visual de imágenes;
- botón **Mostrar en OBS**;
- modo **Auto Show**;
- sincronización con la imagen actualmente mostrada por OBS;
- filtro por fuente de galería;
- galería optimizada en tres columnas en dispositivos móviles;
- barra de herramientas compacta;
- opciones secundarias agrupadas bajo **Más opciones**;
- preview mediante pulsación prolongada en dispositivos táctiles;
- vista previa independiente debajo de la galería en dispositivos móviles.

Una pulsación corta selecciona normalmente una imagen.

Una pulsación prolongada permite verla ampliada sin seleccionarla ni enviarla accidentalmente a OBS.

---

## Fuentes de galería

La aplicación permite configurar múltiples directorios de imágenes.

La configuración persistente se guarda en:

```text
data/gallery-sources.json
```

Cada fuente contiene:

```text
id
name
path
enabled
```

Ejemplo:

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

Desde el panel es posible:

- añadir fuentes;
- renombrarlas;
- activarlas;
- desactivarlas;
- eliminarlas;
- cambiar entre fuentes;
- construir automáticamente un índice conjunto con todas las fuentes habilitadas.

`GALLERY_ROOT` continúa funcionando como origen inicial o por defecto, pero ya no limita la galería a un único directorio.

---

# Control

La sección **Control** agrupa visualmente tres áreas:

```text
Escenas
Fuentes
Audios
```

Cada una continúa funcionando como módulo independiente internamente.

Las tres secciones pueden contraerse individualmente para ahorrar espacio en dispositivos móviles.

---

## Escenas

Permite:

- listar escenas de OBS;
- visualizar la escena activa;
- cambiar de escena desde el teléfono;
- sincronizar automáticamente los cambios realizados directamente desde OBS;
- mantener el orden proporcionado por OBS.

Los cambios de escena recibidos mediante eventos actualizan automáticamente los módulos que dependen de la escena actual.

---

## Fuentes

Permite:

- listar fuentes de OBS;
- controlar su visibilidad;
- filtrar las fuentes correspondientes a la escena actual;
- visualizar fuentes de distintas escenas;
- ocultar localmente fuentes que no se desean mostrar en el panel;
- administrar las fuentes ocultas desde un diálogo independiente.

Ocultar una fuente desde la interfaz **no modifica su visibilidad en OBS**.

La configuración local utiliza una clave basada en:

```text
sceneName:sceneItemId
```

De esta manera pueden distinguirse correctamente distintas apariciones de una misma fuente.

---

## Audio

El módulo de audio permite:

- listar entradas de audio;
- mute / unmute;
- controlar volumen en dB;
- filtrar audio correspondiente a la escena actual;
- ocultar localmente fuentes de audio del panel;
- administrar fuentes ocultas;
- sincronizar cambios realizados directamente desde OBS.

Los cambios de volumen se gestionan evitando solicitudes innecesarias durante el movimiento continuo del control.

---

# Emisión

La sección **Emisión** centraliza el estado de:

- streaming principal de OBS;
- salidas adicionales de Aitum Stream Suite;
- grabación.

La interfaz está optimizada para dispositivos móviles y utiliza estados visuales compactos.

---

## Estado global de emisión

La navegación principal incluye un indicador global de emisión.

Puede representar:

```text
FUERA DEL AIRE
INICIANDO
EN VIVO
PARCIAL
DETENIENDO
```

El icono de emisión de la navegación cambia automáticamente según el estado.

Los estados transitorios utilizan una animación visual para hacer evidente que OBS está iniciando o deteniendo la transmisión.

---

## Stream Delay

La aplicación respeta el **Stream Delay configurado directamente en OBS**.

No se implementa un segundo temporizador artificial en el frontend.

OBS WebSocket proporciona los estados reales:

```text
OBS_WEBSOCKET_OUTPUT_STARTING
OBS_WEBSOCKET_OUTPUT_STARTED
OBS_WEBSOCKET_OUTPUT_STOPPING
OBS_WEBSOCKET_OUTPUT_STOPPED
```

Por lo tanto, el flujo visual es:

```text
FUERA DEL AIRE
      ↓
  INICIANDO
      ↓
   EN VIVO
      ↓
 DETENIENDO
      ↓
FUERA DEL AIRE
```

Cuando existen múltiples salidas y solamente algunas están activas, el panel puede mostrar:

```text
PARCIAL
```

Esto permite representar correctamente configuraciones donde conviven el streaming principal de OBS y salidas administradas por Aitum.

---

# Aitum Stream Suite

OBS Gallery Remote incluye integración con **Aitum Stream Suite** mediante Vendor Requests de OBS WebSocket.

Actualmente se utilizan operaciones equivalentes a:

```text
get_outputs
start_output
stop_output
start_all_outputs
stop_all_outputs
```

La API del panel expone:

```text
GET  /api/obs/aitum
POST /api/obs/aitum/streams/start-all
POST /api/obs/aitum/streams/stop-all
```

Esto permite consultar y controlar salidas adicionales desde el mismo panel.

Los eventos de Aitum también participan en la sincronización en tiempo real del estado de emisión.

---

# Monitor de programa

La aplicación incluye un **Program Monitor** que muestra una captura periódica de la salida actual de OBS.

El monitor utiliza:

```text
GetCurrentProgramScene
GetSourceScreenshot
```

para obtener la escena actual y generar una captura JPG optimizada.

---

## Perfiles de rendimiento

El usuario puede seleccionar tres niveles:

```text
Bajo
Medio
Alto
```

Los perfiles actuales son aproximadamente:

| Perfil | Resolución | Calidad JPG | Intervalo |
| ------ | ---------: | ----------: | --------: |
| Bajo   |    480×270 |          55 |   2000 ms |
| Medio  |    640×360 |          75 |   1000 ms |
| Alto   |    960×540 |          85 |    500 ms |

El perfil seleccionado se guarda localmente en el navegador.

Esto permite elegir entre:

- menor consumo de CPU/red;
- equilibrio entre calidad y rendimiento;
- mayor fluidez y resolución.

---

## Pausa del monitor

El monitor puede pausarse manualmente.

Mientras está pausado:

- no se solicitan nuevas capturas;
- se cancelan actualizaciones pendientes;
- se reduce el consumo de recursos.

También se controla el ciclo de vida del monitor para evitar trabajo innecesario cuando la página no está visible o la sesión deja de estar autenticada.

---

## Protección contra solicitudes simultáneas

El Program Monitor evita ejecutar múltiples solicitudes de captura en paralelo.

Internamente mantiene el estado de una solicitud activa y, si se solicita una actualización mientras otra continúa procesándose, se registra una actualización pendiente.

Esto evita acumular capturas cuando OBS o la red tardan más que el intervalo configurado.

Los intervalos funcionan como una espera posterior a la finalización de cada captura, no como un `setInterval` rígido.

---

# Picture-in-Picture del monitor

El Program Monitor puede utilizarse como un pequeño panel flotante dentro de la aplicación.

El modo PiP:

- puede arrastrarse mediante touch o mouse;
- puede colocarse en las cuatro esquinas;
- hace snap automáticamente a la esquina más cercana;
- recuerda su posición;
- utiliza animaciones suaves al moverse;
- anima también la transición entre modo normal y PiP;
- respeta la bottom navigation en dispositivos móviles.

Esto permite mantener visible la salida de programa mientras se utilizan Galería, Control o Emisión.

---

# Navegación móvil

La interfaz está diseñada principalmente para teléfonos.

En dispositivos móviles la navegación principal aparece fija en la parte inferior:

```text
Galería | Control | Emisión
```

Los iconos utilizan **SVG inline** y `currentColor`, permitiendo adaptar automáticamente su apariencia al estado y al tema seleccionado.

La navegación también muestra el estado global de emisión mediante el icono correspondiente.

En escritorio se mantiene una disposición adaptada a pantallas más grandes.

---

# Temas

La aplicación incluye:

```text
Oscuro
Claro
Sistema
```

El tema puede seleccionarse desde el menú principal.

La preferencia se guarda en:

```text
obs-gallery-remote-theme
```

El diseño utiliza variables CSS semánticas para colores de:

- fondo;
- superficies;
- bordes;
- texto;
- texto secundario;
- controles;
- estado primario;
- éxito;
- advertencia;
- error.

Los colores principales utilizados son:

```text
Azul  #2563eb
Verde #10b981
Rojo  #ef4444
```

El modo **Sistema** sigue automáticamente la preferencia del sistema operativo.

---

# Actualización automática de vistas

La interfaz ya no depende de botones manuales de **Actualizar**.

Al cambiar entre:

```text
Galería
Control
Emisión
```

la información correspondiente se vuelve a consultar automáticamente.

Por ejemplo, entrar en **Control** actualiza en paralelo:

```text
Escenas
Fuentes
Audio
```

y entrar en **Emisión** actualiza el estado de outputs y activa su sincronización en tiempo real.

---

# Sincronización en tiempo real

El backend mantiene una conexión persistente con OBS y comunica cambios al frontend mediante **Server-Sent Events (SSE)**.

Arquitectura:

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

Endpoint:

```text
GET /api/obs/events
```

Los eventos incluyen:

- conexión de OBS;
- desconexión de OBS;
- cambio de escena;
- visibilidad de fuentes;
- mute de audio;
- volumen de audio;
- estado de streaming;
- estado de grabación;
- cambios de outputs de Aitum;
- cambios de la imagen utilizada por la galería.

El frontend utiliza pequeños debounce timers donde corresponde para evitar múltiples actualizaciones consecutivas provocadas por ráfagas de eventos.

---

# OBS como fuente de verdad

Uno de los principios centrales del proyecto es:

> **OBS es la fuente de verdad del estado.**

El frontend no intenta mantener una copia independiente permanente del estado de OBS.

Cuando ocurre un cambio importante, el panel vuelve a consultar OBS cuando es necesario.

Esto permite que el estado continúe siendo correcto aunque los cambios se realicen:

- desde el panel;
- directamente en OBS;
- mediante otro controlador;
- mediante plugins como Aitum Stream Suite.

---

# Reconexión automática

El backend intenta conectarse automáticamente con OBS al arrancar.

Si OBS no está disponible:

```text
Node iniciado
     ↓
OBS no disponible
     ↓
espera
     ↓
reintento automático
```

Cuando la conexión se pierde, `ConnectionClosed` provoca un nuevo ciclo de reconexión.

Cuando OBS vuelve a estar disponible:

```text
ConnectionOpened
      ↓
obs-connected
      ↓
SSE
      ↓
frontend
      ↓
reset de estado dependiente de OBS
      ↓
sincronización completa
```

Esto permite:

- iniciar Node antes que OBS;
- cerrar y volver a abrir OBS;
- reiniciar OBS;
- recuperar automáticamente el panel sin reiniciar Node.

El frontend también actualiza automáticamente el estado visual de conexión.

---

# Autenticación y seguridad

El panel está protegido mediante autenticación por contraseña y sesión.

Configuración mínima:

```dotenv
PANEL_PASSWORD=change_me
SESSION_SECRET=change_me_with_a_long_random_secret
```

La implementación utiliza:

- cookie de sesión firmada;
- `HttpOnly`;
- `SameSite=Strict`;
- duración de sesión de 7 días;
- validación HMAC SHA-256;
- comparación segura mediante `timingSafeEqual`;
- rate limiting de login;
- protección server-side de APIs.

No se utiliza base de datos ni Redis para almacenar sesiones.

---

## Estado de autenticación

Mientras la autenticación está pendiente o se muestra el login, el contenido operativo permanece oculto.

Esto incluye el Program Monitor, evitando mostrar accidentalmente una captura de OBS antes de que la sesión haya sido validada.

Si una API devuelve una sesión no autorizada:

```text
auth:unauthorized
```

el frontend:

- detiene el Program Monitor;
- detiene el coordinador del panel;
- desconecta SSE;
- vuelve a mostrar el login.

---

## Rate limiting

Los intentos fallidos de login se controlan en memoria:

```text
5 intentos / 5 minutos / IP
```

Después del límite, el backend responde:

```text
429 Too Many Requests
```

---

# PWA

OBS Gallery Remote puede instalarse como **Progressive Web App**.

Incluye:

- `manifest.webmanifest`;
- iconos 192×192;
- iconos 512×512;
- iconos maskable;
- modo `standalone`;
- soporte para iOS;
- Service Worker;
- caché del app shell;
- instalación desde navegadores compatibles.

---

## Estrategia de caché

Las APIs dinámicas nunca se cachean.

Por ejemplo:

```text
/api/*
```

incluyendo:

```text
/api/obs/*
/api/gallery/*
/api/auth/*
/api/obs/events
```

Los recursos estáticos utilizan una estrategia **network-first**.

Cuando existe conexión:

```text
Red
 ↓
respuesta actual
 ↓
actualización de caché
```

Si la red falla:

```text
Caché
 ↓
última versión disponible
```

Las solicitudes de recursos estáticos utilizan:

```text
cache: no-store
```

para comprobar primero la versión disponible en el servidor.

El registro del Service Worker utiliza:

```text
updateViaCache: none
```

para reducir problemas con versiones antiguas del propio Service Worker.

El Service Worker utiliza además:

```text
skipWaiting()
clients.claim()
```

para acelerar la activación de nuevas versiones.

---

# Acceso remoto seguro con Tailscale

La configuración recomendada para acceso remoto es **Tailscale Serve**.

Arquitectura:

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
- acceso remoto desde dispositivos autorizados;
- mantener Node y OBS dentro de la red privada;
- no abrir puertos del router;
- no exponer OBS WebSocket directamente a Internet.

Ejemplo:

```powershell
tailscale serve --bg 3000
```

---

# Instalación

## Requisitos

- Windows 10 o superior;
- OBS Studio con obs-websocket;
- Node.js LTS;
- navegador moderno;
- Tailscale recomendado para acceso remoto;
- Aitum Stream Suite opcional para control de salidas adicionales.

---

## 1. Configurar OBS

En OBS:

**Herramientas → Ajustes del servidor WebSocket**

Configurar:

- WebSocket habilitado;
- autenticación habilitada;
- puerto `4455` o el deseado;
- contraseña segura.

Crear además una fuente de tipo **Imagen** llamada exactamente:

```text
OBS_GALLERY_REMOTE
```

Esta fuente es utilizada por el sistema de galería.

---

## 2. Clonar e instalar

```powershell
git clone https://github.com/kitorosano/obs-gallery-remote.git
cd obs-gallery-remote
npm install
```

---

## 3. Configurar `.env`

```powershell
Copy-Item .env.example .env
```

Ejemplo:

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

`GALLERY_ROOT` se conserva como origen por defecto, pero la aplicación permite definir múltiples fuentes desde el propio panel.

---

## 4. Ejecutar

```powershell
npm start
```

Abrir localmente:

```text
http://127.0.0.1:3000
```

Para acceso remoto se recomienda utilizar **Tailscale Serve** en lugar de publicar directamente el puerto `3000`.

---

# Estructura del proyecto

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

La carpeta `data/` contiene la configuración persistente de fuentes de galería.

---

# API relevante

## Autenticación

```text
GET  /api/auth/status
POST /api/auth/login
POST /api/auth/logout
```

## Galería

```text
GET    /api/gallery
GET    /api/gallery/:id/file
GET    /api/gallery/sources
POST   /api/gallery/sources
PATCH  /api/gallery/sources/:id
DELETE /api/gallery/sources/:id
```

## OBS

```text
GET  /api/obs/status
POST /api/obs/connect

POST /api/obs/show
GET  /api/obs/gallery-image

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

GET  /api/obs/program/screenshot

GET  /api/obs/events
```

---

## Program Monitor API

El endpoint:

```text
GET /api/obs/program/screenshot
```

acepta el perfil mediante query string:

```text
?profile=low
?profile=medium
?profile=high
```

Ejemplo:

```text
/api/obs/program/screenshot?profile=medium
```

Los perfiles se validan server-side mediante una whitelist.

---

# Arquitectura del frontend

El frontend está dividido en módulos independientes.

Entre los principales se encuentran:

```text
gallery.js
gallery-sources.js
scenes.js
sources.js
audio.js
output.js
program-monitor.js
navigation.js
panel.js
obs.js
obs-events.js
auth.js
services.js
```

`app.js` actúa principalmente como punto de composición y conexión entre módulos.

`panel.js` coordina:

- ciclo de vida;
- SSE;
- sincronización;
- reconexión;
- refresh de funcionalidades dependientes de OBS.

`obs-events.js` encapsula el canal SSE.

Los módulos de Scenes, Sources y Audio utilizan versiones internas de carga para evitar que respuestas antiguas sobrescriban información más reciente.

---

# Optimización y rendimiento

El proyecto busca mantener un consumo reducido para no competir con OBS por recursos.

Entre las optimizaciones implementadas se encuentran:

- debounce de eventos SSE;
- actualización automática únicamente cuando corresponde;
- eliminación de botones de refresh manual;
- prevención de solicitudes simultáneas del Program Monitor;
- perfiles de calidad del Program Monitor;
- pausa manual del monitor;
- suspensión de actualizaciones cuando corresponde;
- reducción de solicitudes duplicadas durante conexión/reconexión;
- sincronización posterior a eventos importantes;
- controles de volumen diseñados para evitar tráfico excesivo;
- frontend modular sin frameworks pesados;
- backend Node/Express ligero.

---

# Principios de diseño

El proyecto sigue varios principios:

- **OBS es la fuente de verdad del estado.**
- OBS WebSocket permanece local.
- El navegador nunca recibe las credenciales de OBS.
- Los cambios realizados directamente desde OBS deben reflejarse en el panel.
- Los eventos SSE se utilizan para reaccionar a cambios externos.
- Las APIs dinámicas nunca se cachean.
- Las solicitudes duplicadas deben evitarse cuando sea posible.
- Las operaciones asíncronas deben evitar condiciones de carrera.
- Los controles destructivos deben solicitar confirmación.
- La interfaz debe funcionar cómodamente mediante touch.
- El panel debe continuar siendo utilizable en pantallas pequeñas.
- El backend debe consumir pocos recursos para no interferir con OBS.
- Las APIs públicas internas de los módulos deben mantenerse pequeñas y explícitas.

---

# Limpieza y arquitectura reciente

Después de completar las principales funcionalidades móviles se realizó una fase específica de cleanup.

Entre los cambios realizados:

- eliminación de exports sin consumidores;
- eliminación de variables de estado no utilizadas;
- eliminación de referencias DOM innecesarias;
- eliminación de wrappers triviales;
- reducción de APIs públicas entre módulos;
- eliminación de cargas duplicadas durante startup;
- eliminación de refresh duplicado durante conexión manual;
- contratos DOM más explícitos entre módulos;
- simplificación del lifecycle del Program Monitor;
- protección adicional frente a carreras asíncronas;
- conservación deliberada de mecanismos necesarios como `loadVersion`, `isLoaded()`, debounce timers y estados de conexión.

El objetivo fue reducir complejidad sin realizar refactors puramente cosméticos ni alterar comportamiento ya probado.

---

# Estado de desarrollo

Las dos grandes etapas recientes del proyecto están completas.

## Fase 1 — Rediseño móvil

Completado:

- navegación Galería / Control / Emisión;
- Control unificado visualmente;
- secciones colapsables;
- Scenes compactas;
- Sources compactas;
- Audio compacto;
- galería de tres columnas;
- toolbar compacta;
- long-press preview;
- Preview reubicado y compactado;
- Program Monitor PiP;
- Emisión compacta;
- indicador global de emisión.

## Fase 2 — Infraestructura, rendimiento y cleanup

Completado:

- iconos SVG;
- bottom navigation;
- actualización automática de vistas;
- protección del Program Monitor durante login;
- tema oscuro/claro/sistema;
- estados `INICIANDO` y `DETENIENDO`;
- integración correcta con Stream Delay de OBS;
- Program Monitor V2;
- perfiles de rendimiento;
- pausa del monitor;
- prevención de screenshots simultáneos;
- lifecycle de autenticación;
- mejoras de PWA/cache;
- cleanup de frontend;
- simplificación de conexión/reconexión;
- reducción de APIs internas.

---

# Estado actual

OBS Gallery Remote puede utilizarse actualmente como panel móvil para:

```text
Galería multi-fuente
        +
Escenas
        +
Fuentes
        +
Audio
        +
Streaming
        +
Aitum Stream Suite
        +
Grabación
        +
Program Monitor
        +
SSE
        +
Reconexión automática
        +
Autenticación
        +
PWA
        +
Tailscale
```

La aplicación está diseñada para que OBS continúe siendo el sistema principal y el panel funcione como una interfaz remota ligera, sincronizada y optimizada para operación desde dispositivos móviles.

El baseline estable posterior a la fase de optimización y cleanup corresponde al estado del proyecto alcanzado después de completar las Fases 1 y 2.

---

# Próximas mejoras

Las siguientes funcionalidades todavía no están definidas como una fase activa.

Algunas posibilidades para futuras iteraciones incluyen:

- nuevas herramientas de operación durante transmisiones;
- mejoras adicionales del Program Monitor;
- nuevas integraciones con plugins de OBS;
- exploración de directorios más amigable;
- herramientas adicionales para escenas y fuentes;
- mejoras específicas de UX según el uso real durante transmisiones.

Las nuevas funcionalidades se evaluarán manteniendo como prioridades:

```text
estabilidad
+
simplicidad
+
bajo consumo de recursos
+
buena experiencia móvil
```
