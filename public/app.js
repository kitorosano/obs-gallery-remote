const $ = (selector) => document.querySelector(selector);
const galleryEl = $('#gallery');
const searchEl = $('#search');
const statusEl = $('#obs-status');
const previewEl = $('#preview');
const placeholderEl = $('#preview-placeholder');
const selectedNameEl = $('#selected-name');
const showButton = $('#show');
const messageEl = $('#message');

let images = [];
let selectedImage = null;
let activeCategory = 'Todas';

function setMessage(text = '', type = '') {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`.trim();
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status}`);
  return data;
}

function renderCategories() {
  const categories = ['Todas', ...new Set(images.map(image => image.category))];
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
  if (!categories.includes(activeCategory)) activeCategory = 'Todas';
}

function filteredImages() {
  const query = searchEl.value.trim().toLocaleLowerCase();
  return images.filter(image => {
    const categoryMatch = activeCategory === 'Todas' || image.category === activeCategory;
    const textMatch = `${image.name} ${image.filename} ${image.category}`.toLocaleLowerCase().includes(query);
    return categoryMatch && textMatch;
  });
}

function renderGallery() {
  const visibleImages = filteredImages();
  galleryEl.replaceChildren();
  $('#image-count').textContent = `${visibleImages.length} ${visibleImages.length === 1 ? 'imagen' : 'imágenes'}`;
  if (!visibleImages.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = images.length ? 'No hay imágenes que coincidan con el filtro.' : 'No se encontraron imágenes. Copia archivos a la carpeta gallery y actualiza la galería.';
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
    tile.addEventListener('click', () => selectImage(image));
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
  setMessage('Imagen seleccionada. Todavía no se ha enviado a OBS.');
  renderGallery();
}

async function loadGallery() {
  setMessage('');
  try {
    const data = await api('/api/gallery');
    images = data.images;
    if (selectedImage && !images.some(image => image.id === selectedImage.id)) {
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

async function refreshStatus() {
  try {
    const status = await api('/api/obs/status');
    statusEl.textContent = status.connected ? `OBS conectado${status.version ? ` · ${status.version}` : ''}` : 'OBS desconectado';
    statusEl.className = `status ${status.connected ? 'connected' : 'disconnected'}`;
  } catch {
    statusEl.textContent = 'Servidor no disponible';
    statusEl.className = 'status disconnected';
  }
}

$('#refresh').addEventListener('click', loadGallery);
searchEl.addEventListener('input', renderGallery);
$('#connect').addEventListener('click', async () => {
  setMessage('Conectando con OBS…');
  try {
    const result = await api('/api/obs/connect', { method: 'POST' });
    setMessage(`Conexión establecida${result.version ? ` con OBS ${result.version}` : ''}.`, 'success');
  } catch (error) {
    setMessage(`No se pudo conectar con OBS: ${error.message}. Verifica que OBS esté abierto y que OBS WebSocket esté habilitado.`, 'error');
  }
  await refreshStatus();
});

showButton.addEventListener('click', async () => {
  if (!selectedImage) return;
  showButton.disabled = true;
  setMessage('Enviando imagen a OBS…');
  try {
    const result = await api('/api/obs/show', {
      method: 'POST',
      body: JSON.stringify({ imageId: selectedImage.id })
    });
    setMessage(result.message || 'Imagen enviada a OBS.', 'success');
  } catch (error) {
    setMessage(`No se pudo mostrar la imagen: ${error.message}`, 'error');
  } finally {
    showButton.disabled = false;
  }
});

await loadGallery();
await refreshStatus();
