const PERFORMANCE_STORAGE_KEY = 'obs-gallery-remote-program-performance';

const PERFORMANCE_PROFILES = {
  low: {
    intervalMs: 2000,
  },
  medium: {
    intervalMs: 1000,
  },
  high: {
    intervalMs: 500,
  },
};
const PIP_STORAGE_KEY = 'obs-gallery-remote-program-pip';
const PIP_POSITION_STORAGE_KEY = 'obs-gallery-remote-program-pip-position';

export function createProgramMonitor({ programService, elements }) {
  let running = false;
  let timeoutId = null;
  let paused = false;

  let performanceProfile =
    localStorage.getItem(PERFORMANCE_STORAGE_KEY) || 'medium';
  if (!PERFORMANCE_PROFILES[performanceProfile]) {
    performanceProfile = 'medium';
  }

  let pipEnabled = false;
  let pipPosition =
    localStorage.getItem(PIP_POSITION_STORAGE_KEY) || 'bottom-right';

  let dragPointerId = null;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let dragging = false;

  function renderPipPosition() {
    elements.root.dataset.pipPosition = pipPosition;
  }

  function savePipPosition(position) {
    pipPosition = position;
    localStorage.setItem(PIP_POSITION_STORAGE_KEY, position);
    renderPipPosition();
  }

  function startDrag(event) {
    if (!pipEnabled) return;

    if (event.target.closest('button')) return;

    const rect = elements.root.getBoundingClientRect();

    dragPointerId = event.pointerId;
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    dragging = true;

    elements.root.setPointerCapture(event.pointerId);

    elements.root.classList.add('is-dragging');

    elements.root.style.left = `${rect.left}px`;
    elements.root.style.top = `${rect.top}px`;
    elements.root.style.right = 'auto';
    elements.root.style.bottom = 'auto';
  }

  function moveDrag(event) {
    if (!dragging || event.pointerId !== dragPointerId) return;

    const rect = elements.root.getBoundingClientRect();

    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;

    const left = Math.max(0, Math.min(event.clientX - dragOffsetX, maxLeft));

    const top = Math.max(0, Math.min(event.clientY - dragOffsetY, maxTop));

    elements.root.style.left = `${left}px`;
    elements.root.style.top = `${top}px`;
  }

  function endDrag(event) {
    if (!dragging || event.pointerId !== dragPointerId) return;

    const first = elements.root.getBoundingClientRect();

    const centerX = first.left + first.width / 2;
    const centerY = first.top + first.height / 2;

    const horizontal = centerX < window.innerWidth / 2 ? 'left' : 'right';
    const vertical = centerY < window.innerHeight / 2 ? 'top' : 'bottom';

    const newPosition = `${vertical}-${horizontal}`;

    elements.root.classList.remove('is-dragging');

    dragging = false;
    dragPointerId = null;

    savePipPosition(newPosition);

    elements.root.style.left = '';
    elements.root.style.top = '';
    elements.root.style.right = '';
    elements.root.style.bottom = '';

    const last = elements.root.getBoundingClientRect();

    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;

    elements.root.animate(
      [
        {
          transform: `translate(${deltaX}px, ${deltaY}px)`,
        },
        {
          transform: 'translate(0, 0)',
        },
      ],
      {
        duration: 280,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    );
  }

  function renderPauseState() {
    elements.root.classList.toggle('is-paused', paused);

    elements.pauseButton.classList.toggle('is-active', paused);
    elements.pauseButton.setAttribute('aria-pressed', String(paused));

    elements.pauseButton.setAttribute(
      'aria-label',
      paused ? 'Reanudar monitor' : 'Pausar monitor',
    );

    elements.pauseButton.title = paused ? 'Reanudar monitor' : 'Pausar monitor';
  }

  async function updateFrame() {
    timeoutId = null;

    if (!running || paused || document.hidden) return;

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

    timeoutId = window.setTimeout(
      updateFrame,
      PERFORMANCE_PROFILES[performanceProfile].intervalMs,
    );
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

  function setPaused(value) {
    paused = value;

    if (paused) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    renderPauseState();

    if (!paused && running && !document.hidden && timeoutId === null) {
      updateFrame();
    }
  }

  function togglePaused() {
    setPaused(!paused);
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

  function animatePipChange(enabled) {
    const first = elements.root.getBoundingClientRect();

    pipEnabled = enabled;

    localStorage.setItem(PIP_STORAGE_KEY, enabled ? 'true' : 'false');

    renderPipState();

    const last = elements.root.getBoundingClientRect();

    const deltaX = first.left - last.left;
    const deltaY = first.top - last.top;

    const scaleX = first.width / last.width;
    const scaleY = first.height / last.height;

    elements.root.animate(
      [
        {
          transformOrigin: 'top left',
          transform: `
          translate(${deltaX}px, ${deltaY}px)
          scale(${scaleX}, ${scaleY})
        `,
        },
        {
          transformOrigin: 'top left',
          transform: 'none',
        },
      ],
      {
        duration: 320,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    );
  }

  function setPip(enabled) {
    animatePipChange(enabled);
  }

  function togglePip() {
    setPip(!pipEnabled);
  }

  function renderPerformanceProfile() {
    for (const button of elements.performanceButtons) {
      const active = button.dataset.programPerformance === performanceProfile;

      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function setPerformanceProfile(profile) {
    if (!PERFORMANCE_PROFILES[profile]) return;

    performanceProfile = profile;

    localStorage.setItem(PERFORMANCE_STORAGE_KEY, profile);

    renderPerformanceProfile();

    if (!running || paused || document.hidden) return;

    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }

    updateFrame();
  }

  pipEnabled = localStorage.getItem(PIP_STORAGE_KEY) === 'true';

  renderPipPosition();
  renderPipState();
  renderPauseState();
  renderPerformanceProfile();

  document.addEventListener('visibilitychange', () => {
    if (!running) return;

    if (document.hidden) {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      return;
    }

    if (!paused && timeoutId === null) {
      updateFrame();
    }
  });

  for (const button of elements.performanceButtons) {
    button.addEventListener('click', () => {
      setPerformanceProfile(button.dataset.programPerformance);
    });
  }

  elements.pauseButton.addEventListener('click', togglePaused);
  elements.pipButton.addEventListener('click', togglePip);

  elements.root.addEventListener('pointerdown', startDrag);
  elements.root.addEventListener('pointermove', moveDrag);
  elements.root.addEventListener('pointerup', endDrag);
  elements.root.addEventListener('pointercancel', endDrag);

  return {
    start,
    stop,
    refresh() {
      if (!running || paused) return;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }

      updateFrame();
    },
    togglePip,
  };
}
