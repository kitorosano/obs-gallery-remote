const REFRESH_INTERVAL_MS = 1000;

export function createProgramMonitor({ programService, elements }) {
  let running = false;
  let timeoutId = null;

  async function updateFrame() {
    timeoutId = null;
    if (!running || document.hidden) return;

    try {
      const data = await programService.screenshot();
      if (!running) return;

      elements.image.src = data.imageData;
      elements.scene.textContent = data.sceneName || '—';
      elements.root.classList.add('has-image');
      elements.root.classList.remove('is-disconnected');
    } catch (error) {
      if (!running) return;

      elements.root.classList.add('is-disconnected');
      elements.scene.textContent = 'OBS no disponible';
    }

    if (!running) return;

    timeoutId = window.setTimeout(updateFrame, REFRESH_INTERVAL_MS);
  }

  function start() {
    if (running) return;
    running = true;
    updateFrame();
  }

  function stop() {
    running = false;

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!running) return;

    if (document.hidden) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      return;
    }

    if (timeoutId === null) updateFrame();
  });

  return {
    start,
    stop,
    refresh() {
      if (!running) return;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      updateFrame();
    },
  };
}
