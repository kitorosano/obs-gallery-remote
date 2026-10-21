export function createNavigation({
  elements,

  loadScenes,
  isScenesLoaded,

  loadSources,
  isSourcesLoaded,

  loadAudio,
  isAudioLoaded,

  loadOutput,
  isOutputLoaded,
  startOutputRealtime,
  stopOutputRealtime,
}) {
  function setActiveView(viewName) {
    elements.galleryView.hidden = viewName !== 'gallery';
    elements.controlView.hidden = viewName !== 'control';
    elements.outputView.hidden = viewName !== 'output';

    elements.navigationButtons.forEach((button) => {
      const active = button.dataset.view === viewName;

      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (viewName === 'control') {
      if (!isScenesLoaded()) {
        loadScenes();
      }

      if (!isSourcesLoaded()) {
        loadSources();
      }

      if (!isAudioLoaded()) {
        loadAudio();
      }
    }

    if (viewName === 'output') {
      startOutputRealtime();

      if (!isOutputLoaded()) {
        loadOutput();
      }
    } else {
      stopOutputRealtime();
    }
  }

  elements.navigationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveView(button.dataset.view);
    });
  });

  return { setActiveView };
}
