import { createObsEvents } from './obs-events.js';

export function createPanelCoordinator({ services, obs, gallery, scenes, audio, output }) {
  let audioRefreshTimer = null;

  async function syncGalleryFromObs() {
    try {
      const result = await services.obs.currentGalleryImage();
      if (!result.matched) {
        gallery.setMessage('OBS está mostrando una imagen externa a la galería.');
        return;
      }
      gallery.selectImageFromObs(result.imageId);
    } catch (error) {
      console.warn('No se pudo sincronizar la imagen actual de OBS:', error);
    }
  }

  function scheduleAudioRefresh() {
    if (audioRefreshTimer) window.clearTimeout(audioRefreshTimer);
    audioRefreshTimer = window.setTimeout(() => {
      audioRefreshTimer = null;
      audio.loadAudio({ silent: true, preserveMessage: true });
    }, 100);
  }

  const events = createObsEvents({
    onSceneChanged: () => scenes.loadScenes({ silent: true, preserveMessage: true }),
    onAudioChanged: scheduleAudioRefresh,
    onOutputChanged: () => output.loadOutput({ silent: true, preserveMessage: true }),
    onObsDisconnected: () => obs.refreshStatus(),
    onGalleryImageChanged: syncGalleryFromObs,
    onObsConnected: async () => {
      await obs.refreshStatus();
      await refreshFeatures();
    },
  });

  async function refreshFeatures() {
    await Promise.allSettled([
      syncGalleryFromObs(),
      scenes.loadScenes({ silent: true, preserveMessage: true }),
      audio.loadAudio({ silent: true, preserveMessage: true }),
      output.loadOutput({ silent: true, preserveMessage: true }),
    ]);
  }

  async function start() {
    events.connect();
    await gallery.loadGallery();
    await obs.refreshStatus();
    await refreshFeatures();
  }

  function stop() {
    events.disconnect();
    output.stopRealtime();
    if (audioRefreshTimer) {
      window.clearTimeout(audioRefreshTimer);
      audioRefreshTimer = null;
    }
    obs.setAvailability(false);
  }

  return { start, stop, refreshFeatures };
}
