const REFRESH_INTERVAL_MS = 1000;
const PIP_STORAGE_KEY = 'obs-gallery-remote-program-pip';

export function createProgramMonitor({ programService, elements }) {
  let running = false;
  let timeoutId = null;
  let pipEnabled = false;

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

  function renderPipState() {
    elements.root.classList.toggle('is-pip', pipEnabled);
    elements.pipButton.classList.toggle('is-active', pipEnabled);
    elements.pipButton.setAttribute('aria-pressed', String(pipEnabled));
    elements.pipButton.setAttribute(
      'aria-label',
      pipEnabled ? 'Salir del modo PiP' : 'Activar modo PiP',
    );
    elements.pipButton.title = pipEnabled ? 'Volver a vista fija' : 'Modo PiP';
  }

  function setPip(enabled) {
    pipEnabled = enabled;
    localStorage.setItem(PIP_STORAGE_KEY, enabled ? 'true' : 'false');
    renderPipState();
  }

  function togglePip() {
    setPip(!pipEnabled);
  }

  pipEnabled = localStorage.getItem(PIP_STORAGE_KEY) === 'true';
  renderPipState();

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

  elements.pipButton.addEventListener('click', togglePip);

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
    togglePip,
  };
}
