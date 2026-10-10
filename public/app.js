import { api } from './js/api.js';
import { createGallery } from './js/gallery.js';
import { createNavigation } from './js/navigation.js';
import { createObsController } from './js/obs.js';
import { createScenes } from './js/scenes.js';
import { elements } from './js/dom.js';

const obs = createObsController({ api, elements });

const gallery = createGallery({
  api,
  elements,
  showImage: obs.showImage,
});

const scenes = createScenes({
  api,
  elements,
  refreshStatus: obs.refreshStatus,
});

createNavigation({
  elements,
  isScenesLoaded: scenes.isLoaded,
  loadScenes: scenes.loadScenes,
});

elements.refreshButton.addEventListener('click', gallery.loadGallery);
elements.refreshScenesButton.addEventListener('click', () => scenes.loadScenes());
elements.search.addEventListener('input', gallery.render);

elements.autoShow.addEventListener('change', () => {
  localStorage.setItem(
    gallery.AUTO_SHOW_STORAGE_KEY,
    String(elements.autoShow.checked),
  );
});

elements.connectButton.addEventListener('click', async () => {
  gallery.setMessage('Conectando con OBS…');

  try {
    const result = await obs.connect();

    gallery.setMessage(
      `Conexión establecida${
        result.version ? ` con OBS ${result.version}` : ''
      }.`,
      'success',
    );

    scenes.reset();

    if (!elements.scenesView.hidden) {
      await scenes.loadScenes();
    }
  } catch (error) {
    gallery.setMessage(
      `No se pudo conectar con OBS: ${error.message}. Verifica que OBS esté abierto y que OBS WebSocket esté habilitado.`,
      'error',
    );
  }

  await obs.refreshStatus();
});

elements.showButton.addEventListener('click', () => {
  const selectedImage = gallery.getSelectedImage();

  if (selectedImage) {
    obs.showImage(selectedImage);
  }
});

await gallery.loadGallery();
await obs.refreshStatus();
