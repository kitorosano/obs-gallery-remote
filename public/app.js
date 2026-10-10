const $ = (selector) => document.querySelector(selector);

const galleryEl = $('#gallery');
const searchEl = $('#search');
const statusEl = $('#obs-status');
const previewEl = $('#preview');
const placeholderEl = $('#preview-placeholder');
const selectedNameEl = $('#selected-name');
const showButton = $('#show');
const autoShowEl = $('#auto-show');
const messageEl = $('#message');
const AUTO_SHOW_STORAGE_KEY = 'obs-gallery-auto-show';

const galleryViewEl = $('#gallery-view');
const scenesViewEl = $('#scenes-view');
const sceneGridEl = $('#scene-grid');
const currentSceneEl = $('#current-scene');
const sceneCountEl = $('#scene-count');
const sceneMessageEl = $('#scene-message');

let images = [];
let selectedImage = null;
let activeCategory = 'Todas';

let scenes = [];
let currentScene = null;
let scenesLoaded = false;
let sceneChangeInProgress = false;

autoShowEl.checked = localStorage.getItem(AUTO_SHOW_STORAGE_KEY) === 'true';

function setMessage(text = '', type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

function setSceneMessage(text = '', type = '') {
  sceneMessageEl.textContent = text;
  sceneMessageEl.className = `message ${type}`.trim();
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }

  return data;
}

/* -------------------------
   NAVEGACIÓN
------------------------- */

function setActiveView(viewName) {
  const showGallery = viewName === 'gallery';

  galleryViewEl.hidden = !showGallery;
  scenesViewEl.hidden = showGallery;

  document.querySelectorAll('.nav-button').forEach((button) => {
    const active = button.dataset.view === viewName;

    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  if (viewName === 'scenes' && !scenesLoaded) {
    loadScenes();
  }
}

document.querySelectorAll('.nav-button').forEach((button) => {
  button.addEventListener('click', () => {
    setActiveView(button.dataset.view);
  });
});

/* -------------------------
   GALERÍA
------------------------- */

function renderCategories() {
  const categories = [
    'Todas',
    ...new Set(images.map((image) => image.category)),
  ];

  const container = $('#categories');

  container.replaceChildren();

  for (const category of categories) {
    const button = document.createElement('button');

    button.className = `category${category === activeCategory ? ' active' : ''}`;

    button.textContent = category;

    button.addEventListener('click', () => {
      activeCategory = category;
      renderCategories();
      renderGallery();
    });

    container.append(button);
  }

  if (!categories.includes(activeCategory)) {
    activeCategory = 'Todas';
  }
}

function filteredImages() {
  const query = searchEl.value.trim().toLocaleLowerCase();

  return images.filter((image) => {
    const categoryMatch =
      activeCategory === 'Todas' || image.category === activeCategory;

    const textMatch = `${image.name} ${image.filename} ${image.category}`
      .toLocaleLowerCase()
      .includes(query);

    return categoryMatch && textMatch;
  });
}

function renderGallery() {
  const visibleImages = filteredImages();

  galleryEl.replaceChildren();

  $('#image-count').textContent = `${visibleImages.length} ${
    visibleImages.length === 1 ? 'imagen' : 'imágenes'
  }`;

  if (!visibleImages.length) {
    const empty = document.createElement('p');

    empty.className = 'muted';

    empty.textContent = images.length
      ? 'No hay imágenes que coincidan con el filtro.'
      : 'No se encontraron imágenes. Copia archivos a la carpeta gallery y actualiza la galería.';

    galleryEl.append(empty);

    return;
  }

  for (const image of visibleImages) {
    const tile = document.createElement('button');

    tile.className = `tile${selectedImage?.id === image.id ? ' selected' : ''}`;

    tile.setAttribute('aria-pressed', String(selectedImage?.id === image.id));

    const img = document.createElement('img');

    img.src = image.previewUrl;
    img.alt = '';
    img.loading = 'lazy';

    const name = document.createElement('span');

    name.className = 'filename';
    name.textContent = image.name;

    const category = document.createElement('span');

    category.className = 'category-label';
    category.textContent = image.category;

    tile.append(img, name, category);

    tile.addEventListener('click', () => {
      selectImage(image);
    });

    galleryEl.append(tile);
  }
}

function selectImage(image) {
  selectedImage = image;

  previewEl.src = image.previewUrl;
  previewEl.hidden = false;

  placeholderEl.hidden = true;

  selectedNameEl.textContent = `${image.name} · ${image.category}`;

  showButton.disabled = false;

  renderGallery();

  if (autoShowEl.checked) {
    showImage(image);
  } else {
    setMessage('Imagen seleccionada. Todavía no se ha enviado a OBS.');
  }
}

async function loadGallery() {
  setMessage('');

  try {
    const data = await api('/api/gallery');

    images = data.images;

    if (
      selectedImage &&
      !images.some((image) => image.id === selectedImage.id)
    ) {
      selectedImage = null;

      previewEl.hidden = true;
      placeholderEl.hidden = false;

      selectedNameEl.textContent = 'Ninguna imagen seleccionada';

      showButton.disabled = true;
    }

    renderCategories();
    renderGallery();
  } catch (error) {
    setMessage(`No se pudo cargar la galería: ${error.message}`, 'error');
  }
}

/* -------------------------
   ESTADO OBS
------------------------- */

async function refreshStatus() {
  try {
    const status = await api('/api/obs/status');

    statusEl.textContent = status.connected
      ? `OBS conectado${status.version ? ` · ${status.version}` : ''}`
      : 'OBS desconectado';

    statusEl.className = `status ${status.connected ? 'connected' : 'disconnected'}`;

    return status.connected;
  } catch {
    statusEl.textContent = 'Servidor no disponible';
    statusEl.className = 'status disconnected';

    return false;
  }
}

/* -------------------------
   ESCENAS
------------------------- */

function renderScenes() {
  sceneGridEl.replaceChildren();

  currentSceneEl.textContent = currentScene || 'Sin información';

  sceneCountEl.textContent = `${scenes.length} ${
    scenes.length === 1 ? 'escena' : 'escenas'
  }`;

  if (!scenes.length) {
    const empty = document.createElement('p');

    empty.className = 'muted';
    empty.textContent = 'OBS no devolvió ninguna escena.';

    sceneGridEl.append(empty);

    return;
  }

  for (const sceneName of scenes) {
    const button = document.createElement('button');

    const isActive = sceneName === currentScene;

    button.className = `scene-button${isActive ? ' active' : ''}`;

    button.setAttribute('aria-pressed', String(isActive));

    button.disabled = sceneChangeInProgress || isActive;

    const name = document.createElement('span');

    name.className = 'scene-name';
    name.textContent = sceneName;

    button.append(name);

    if (isActive) {
      const badge = document.createElement('span');

      badge.className = 'scene-live-badge';
      badge.textContent = 'EN PROGRAMA';

      button.append(badge);
    }

    button.addEventListener('click', () => {
      changeScene(sceneName);
    });

    sceneGridEl.append(button);
  }
}

async function loadScenes({ silent = false, preserveMessage = false } = {}) {
  if (!silent) {
    setSceneMessage('Cargando escenas…');
  }

  try {
    const data = await api('/api/obs/scenes');

    scenes = Array.isArray(data.scenes) ? data.scenes : [];

    currentScene = data.currentScene || null;

    scenesLoaded = true;

    renderScenes();

    if (!silent && !preserveMessage) {
      setSceneMessage('');
    }

    return true;
  } catch (error) {
    scenesLoaded = false;

    sceneGridEl.replaceChildren();

    const empty = document.createElement('p');

    empty.className = 'muted';
    empty.textContent = 'No se pudieron cargar las escenas.';

    sceneGridEl.append(empty);

    currentSceneEl.textContent = '—';
    sceneCountEl.textContent = '';

    if (!silent) {
      setSceneMessage(
        `No se pudieron cargar las escenas: ${error.message}`,
        'error',
      );
    }

    return false;
  }
}

async function changeScene(sceneName) {
  if (sceneChangeInProgress || sceneName === currentScene) {
    return;
  }

  sceneChangeInProgress = true;

  renderScenes();

  setSceneMessage(`Cambiando a "${sceneName}"…`);

  try {
    await api('/api/obs/scenes/current', {
      method: 'POST',
      body: JSON.stringify({
        sceneName,
      }),
    });

    const refreshed = await loadScenes({
      silent: true,
      preserveMessage: true,
    });

    if (!refreshed) {
      throw new Error(
        'La escena fue solicitada, pero no se pudo confirmar el estado actual de OBS.',
      );
    }

    if (currentScene !== sceneName) {
      throw new Error(
        `OBS no confirmó "${sceneName}" como escena en programa.`,
      );
    }

    setSceneMessage(`"${currentScene}" está ahora en programa.`, 'success');
  } catch (error) {
    setSceneMessage(`No se pudo cambiar la escena: ${error.message}`, 'error');
  } finally {
    sceneChangeInProgress = false;
    renderScenes();
    await refreshStatus();
  }
}

/* -------------------------
   EVENTOS
------------------------- */

$('#refresh').addEventListener('click', loadGallery);

$('#refresh-scenes').addEventListener('click', () => loadScenes());

searchEl.addEventListener('input', renderGallery);

autoShowEl.addEventListener('change', () => {
  localStorage.setItem(AUTO_SHOW_STORAGE_KEY, String(autoShowEl.checked));
});

$('#connect').addEventListener('click', async () => {
  setMessage('Conectando con OBS…');

  try {
    const result = await api('/api/obs/connect', {
      method: 'POST',
    });

    setMessage(
      `Conexión establecida${
        result.version ? ` con OBS ${result.version}` : ''
      }.`,
      'success',
    );

    scenesLoaded = false;

    if (!scenesViewEl.hidden) {
      await loadScenes();
    }
  } catch (error) {
    setMessage(
      `No se pudo conectar con OBS: ${error.message}. Verifica que OBS esté abierto y que OBS WebSocket esté habilitado.`,
      'error',
    );
  }

  await refreshStatus();
});

async function showImage(image) {
  showButton.disabled = true;

  setMessage('Enviando imagen a OBS…');

  try {
    const result = await api('/api/obs/show', {
      method: 'POST',
      body: JSON.stringify({
        imageId: image.id,
      }),
    });

    setMessage(result.message || 'Imagen enviada a OBS.', 'success');
  } catch (error) {
    setMessage(`No se pudo mostrar la imagen: ${error.message}`, 'error');
  } finally {
    showButton.disabled = !selectedImage;
  }
}

showButton.addEventListener('click', () => {
  if (selectedImage) {
    showImage(selectedImage);
  }
});

/* -------------------------
   INICIO
------------------------- */

await loadGallery();
await refreshStatus();
