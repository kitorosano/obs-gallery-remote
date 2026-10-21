import { api } from './js/api.js';
import { createAudio } from './js/audio.js';
import { createAuth } from './js/auth.js';
import { createControl } from './js/control.js';
import {
  audioElements,
  controlElements,
  galleryElements,
  navigationElements,
  outputElements,
  programMonitorElements,
  scenesElements,
  shellElements,
  sourcesElements,
} from './js/dom.js';
import { createGallerySources } from './js/gallery-sources.js';
import { createGallery } from './js/gallery.js';
import { createHeader } from './js/header.js';
import { createNavigation } from './js/navigation.js';
import { createObsController } from './js/obs.js';
import { createOutput } from './js/output.js';
import { createPanelCoordinator } from './js/panel.js';
import { createProgramMonitor } from './js/program-monitor.js';
import { initializePwa } from './js/pwa.js';
import { createScenes } from './js/scenes.js';
import { createServices } from './js/services.js';
import { createSources } from './js/sources.js';

initializePwa();
const services = createServices(api);

createHeader({
  menuButton: shellElements.menuButton,
  menuDropdown: shellElements.menuDropdown,
});

function setObsAvailability(connected) {
  shellElements.app.classList.toggle('obs-disconnected', !connected);
  shellElements.app.dataset.obsConnected = connected ? 'true' : 'false';
}

const obs = createObsController({
  obsService: services.obs,
  elements: { ...shellElements, ...galleryElements },
  onConnectionChange: setObsAvailability,
});
const programMonitor = createProgramMonitor({
  programService: services.obs.program,
  elements: programMonitorElements,
});
const gallery = createGallery({
  galleryService: services.gallery,
  elements: galleryElements,
  showImage: obs.showImage,
});
const gallerySources = createGallerySources({
  galleryService: services.gallery,
  elements: galleryElements,
  onSourcesChanged: gallery.loadGallery,
});
const scenes = createScenes({
  obsService: services.obs,
  elements: scenesElements,
  refreshStatus: obs.refreshStatus,
});
const sources = createSources({
  obsService: services.obs,
  elements: sourcesElements,
  refreshStatus: obs.refreshStatus,
});
const audio = createAudio({
  obsService: services.obs,
  elements: audioElements,
  refreshStatus: obs.refreshStatus,
});
const control = createControl({
  root: controlElements.root,
});
control.init();
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
  sources,
  audio,
  output,
});

createNavigation({
  elements: navigationElements,
  isScenesLoaded: scenes.isLoaded,
  loadScenes: scenes.loadScenes,
  isSourcesLoaded: sources.isLoaded,
  loadSources: sources.loadSources,
  isAudioLoaded: audio.isLoaded,
  loadAudio: audio.loadAudio,
  isOutputLoaded: output.isLoaded,
  loadOutput: output.loadOutput,
  startOutputRealtime: output.startRealtime,
  stopOutputRealtime: output.stopRealtime,
});

galleryElements.refreshButton.addEventListener('click', gallery.loadGallery);
scenesElements.refreshScenesButton.addEventListener('click', () =>
  scenes.loadScenes(),
);
sourcesElements.refreshSourcesButton.addEventListener('click', () =>
  sources.loadSources(),
);
audioElements.refreshAudioButton.addEventListener('click', () =>
  audio.loadAudio(),
);
audioElements.manageSourcesButton.addEventListener('click', async () => {
  if (!audio.isLoaded()) {
    await audio.loadAudio({
      silent: true,
    });
  }
  audio.renderSourceManager();
  audioElements.sourcesDialog.showModal();
});

audioElements.closeSourcesButton.addEventListener('click', () => {
  audioElements.sourcesDialog.close();
});
outputElements.refreshOutputButton.addEventListener('click', () =>
  output.loadOutput(),
);
galleryElements.search.addEventListener('input', gallery.render);
galleryElements.source.addEventListener('change', () => {
  gallery.setActiveSource(galleryElements.source.value);
});
galleryElements.autoShow.addEventListener('change', () => {
  localStorage.setItem(
    gallery.AUTO_SHOW_STORAGE_KEY,
    String(galleryElements.autoShow.checked),
  );
});
galleryElements.addSourceButton.addEventListener('click', () => {
  galleryElements.sourceForm.reset();
  galleryElements.sourceDialog.showModal();
  galleryElements.sourceNameInput.focus();
});
galleryElements.cancelSourceButton.addEventListener('click', () => {
  galleryElements.sourceDialog.close();
});
galleryElements.sourceForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const submitButton = galleryElements.sourceForm.querySelector(
    'button[type="submit"]',
  );

  submitButton.disabled = true;

  try {
    await gallerySources.addSource({
      name: galleryElements.sourceNameInput.value.trim(),
      path: galleryElements.sourcePathInput.value.trim(),
    });

    galleryElements.sourceDialog.close();
  } catch (error) {
    galleryElements.sourcesMessage.textContent = `No se pudo agregar la fuente: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
});
galleryElements.manageSourcesButton.addEventListener('click', async () => {
  await gallerySources.load();
  galleryElements.sourcesDialog.showModal();
});

galleryElements.closeSourcesButton.addEventListener('click', () => {
  galleryElements.sourcesDialog.close();
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
    sources.reset();
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
  onAuthenticated: async () => {
    await panel.start();
    programMonitor.start();
  },
  onLoggedOut: () => {
    programMonitor.stop();
    panel.stop();
  },
});

window.addEventListener('auth:unauthorized', () => {
  panel.stop();
  auth.showLogin();
});

if (await auth.checkSession()) {
  await panel.start();
  programMonitor.start();
}
