import { api } from './js/api.js';
import { createAudio } from './js/audio.js';
import { createAuth } from './js/auth.js';
import {
  audioElements,
  galleryElements,
  navigationElements,
  outputElements,
  scenesElements,
  shellElements,
} from './js/dom.js';
import { createGallery } from './js/gallery.js';
import { createNavigation } from './js/navigation.js';
import { createObsController } from './js/obs.js';
import { createOutput } from './js/output.js';
import { createPanelCoordinator } from './js/panel.js';
import { initializePwa } from './js/pwa.js';
import { createScenes } from './js/scenes.js';
import { createServices } from './js/services.js';

initializePwa();
const services = createServices(api);

function setObsAvailability(connected) {
  shellElements.app.classList.toggle('obs-disconnected', !connected);
  shellElements.app.dataset.obsConnected = connected ? 'true' : 'false';
}

const obs = createObsController({
  obsService: services.obs,
  elements: { ...shellElements, ...galleryElements },
  onConnectionChange: setObsAvailability,
});
const gallery = createGallery({
  galleryService: services.gallery,
  elements: galleryElements,
  showImage: obs.showImage,
});
const scenes = createScenes({
  obsService: services.obs,
  elements: scenesElements,
  refreshStatus: obs.refreshStatus,
});
const audio = createAudio({
  obsService: services.obs,
  elements: audioElements,
  refreshStatus: obs.refreshStatus,
});
const output = createOutput({
  obsService: services.obs,
  elements: { ...outputElements, outputView: navigationElements.outputView },
  refreshStatus: obs.refreshStatus,
});
const panel = createPanelCoordinator({
  services,
  obs,
  gallery,
  scenes,
  audio,
  output,
});

createNavigation({
  elements: navigationElements,
  isScenesLoaded: scenes.isLoaded,
  loadScenes: scenes.loadScenes,
  isAudioLoaded: audio.isLoaded,
  loadAudio: audio.loadAudio,
  isOutputLoaded: output.isLoaded,
  loadOutput: output.loadOutput,
  startOutputRealtime: output.startRealtime,
  stopOutputRealtime: output.stopRealtime,
});

galleryElements.refreshButton.addEventListener('click', gallery.loadGallery);
scenesElements.refreshScenesButton.addEventListener('click', () => scenes.loadScenes());
audioElements.refreshAudioButton.addEventListener('click', () => audio.loadAudio());
outputElements.refreshOutputButton.addEventListener('click', () => output.loadOutput());
galleryElements.search.addEventListener('input', gallery.render);
galleryElements.autoShow.addEventListener('change', () => {
  localStorage.setItem(
    gallery.AUTO_SHOW_STORAGE_KEY,
    String(galleryElements.autoShow.checked),
  );
});

shellElements.connectButton.addEventListener('click', async () => {
  gallery.setMessage('Conectando con OBS…');
  try {
    const result = await obs.connect();
    gallery.setMessage(
      `Conexión establecida${result.version ? ` con OBS ${result.version}` : ''}.`,
      'success',
    );
    scenes.reset();
    audio.reset();
    output.reset();
    await panel.refreshFeatures();
  } catch (error) {
    gallery.setMessage(
      `No se pudo conectar con OBS: ${error.message}. Verifica que OBS esté abierto y que OBS WebSocket esté habilitado.`,
      'error',
    );
  }
  await obs.refreshStatus();
});

galleryElements.showButton.addEventListener('click', () => {
  const selectedImage = gallery.getSelectedImage();
  if (selectedImage) obs.showImage(selectedImage);
});

const auth = createAuth({
  authService: services.auth,
  onAuthenticated: panel.start,
  onLoggedOut: panel.stop,
});

window.addEventListener('auth:unauthorized', () => {
  panel.stop();
  auth.showLogin();
});

if (await auth.checkSession()) await panel.start();
