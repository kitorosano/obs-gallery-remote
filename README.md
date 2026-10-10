# OBS Gallery Remote

Aplicación web local para seleccionar imágenes desde un celular y enviarlas a OBS Studio usando OBS WebSocket. El proyecto es independiente de cualquier fuente de galería o plugin propio existente.

## Entorno objetivo

- Windows 10
- OBS Studio 32.0.4
- Node.js LTS (recomendado)
- Teléfono y PC conectados a la misma red local

## 1. Preparar OBS

1. Abre OBS.
2. Entra en **Herramientas → Ajustes del servidor WebSocket** (el nombre puede variar ligeramente según el idioma).
3. Activa el servidor WebSocket y deja habilitada la autenticación.
4. Anota el puerto y la contraseña. El puerto predeterminado suele ser `4455`.
5. En una escena de prueba, crea una fuente nueva de tipo **Imagen** y llámala exactamente `OBS_GALLERY_REMOTE`. No uses una fuente existente del usuario para las primeras pruebas.
6. Mantén OBS WebSocket accesible solo desde el PC local. No abras ni reenvíes el puerto 4455 en el router.

## 2. Instalar y configurar

1. Instala Node.js LTS desde el sitio oficial de Node.js si todavía no está instalado.
2. Extrae esta carpeta en una ubicación de trabajo, por ejemplo `C:\OBS-Gallery-Remote`.
3. Abre PowerShell en esa carpeta.
4. Instala dependencias:

   ```powershell
   npm install
   ```

5. Crea el archivo `.env` a partir de `.env.example`:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

6. Introduce la contraseña real de OBS en `OBS_PASSWORD`. No compartas el archivo `.env`.
7. Deja `OBS_HOST=127.0.0.1` si OBS y el servidor corren en el mismo PC.
8. Copia algunas imágenes JPG, PNG, WEBP, BMP o GIF dentro de `gallery` o sus subcarpetas.

## 3. Ejecutar

Con OBS abierto, en PowerShell:

```powershell
npm start
```

En el propio PC, abre `http://localhost:3000`. Para usar el teléfono, averigua la IPv4 local del PC con `ipconfig` y abre `http://IP-DEL-PC:3000` desde el navegador del teléfono. Ambos dispositivos deben estar en la misma red.

Si Windows Firewall pregunta, permite el acceso únicamente en redes privadas. Si el teléfono no conecta, revisa el perfil de red de Windows y la regla de firewall para el puerto 3000. No expongas el servidor a Internet.

## 4. Uso

1. Pulsa **Actualizar galería** si agregaste imágenes después de abrir la página.
2. Selecciona una miniatura para ver la vista previa.
3. Pulsa **Conectar con OBS** para conectar el backend.
4. Pulsa **Mostrar en OBS** para actualizar la fuente `OBS_GALLERY_REMOTE`.

Elegir una miniatura no cambia lo que se muestra en OBS. La emisión siempre requiere pulsar el botón.

## 5. Endpoints iniciales

- `GET /api/health`
- `GET /api/obs/status`
- `POST /api/obs/connect`
- `GET /api/gallery`
- `GET /api/gallery/:id/file`
- `POST /api/obs/show` con JSON `{ "imageId": "..." }`

## 6. Notas y limitaciones de esta versión

- La integración de salida actual usa una fuente de imagen normal de OBS llamada `OBS_GALLERY_REMOTE`, dedicada a este proyecto.
- El backend envía a OBS la ruta del archivo seleccionado mediante `SetInputSettings`. Si la fuente no existe o no es de tipo Imagen, la operación fallará y la API devolverá un error.
- La aplicación aún no confirma de forma autoritativa cuál imagen está visible en la salida de programa; esa función requiere una estrategia de sincronización adicional.
- Las imágenes se leen de la carpeta configurada; no se copian ni se modifican.
- La lista de formatos permitidos se encuentra en `server/index.js`.
- Este MVP es una base inicial y debe probarse en el PC objetivo antes de utilizarse en un evento en directo.

## 7. Arquitectura y siguientes pasos

- Mantener la interfaz móvil desacoplada de OBS.
- Mantener el control de OBS en el backend, nunca desde el navegador del teléfono.
- Después de validar la conexión y el cambio de imagen: mejorar manejo de reconexión, indicador de imagen al aire, navegación anterior/siguiente, PWA y autenticación opcional del panel.
- La integración con el plugin propio del usuario es opcional y queda fuera del MVP.
