export function createNavigation({
  elements,

  loadScenes,
  isScenesLoaded,

  loadAudio,
  isAudioLoaded,

  loadOutput,
  isOutputLoaded,
}) {
  function setActiveView(viewName) {
    elements.galleryView.hidden = viewName !== 'gallery';
    elements.scenesView.hidden = viewName !== 'scenes';
    elements.audioView.hidden = viewName !== 'audio';
    elements.outputView.hidden = viewName !== 'output';

    elements.navigationButtons.forEach((button) => {
      const active = button.dataset.view === viewName;

      button.classList.toggle('active', active);

      button.setAttribute('aria-pressed', String(active));
    });

    if (viewName === 'scenes' && !isScenesLoaded()) {
      loadScenes();
    }

    if (viewName === 'audio' && !isAudioLoaded()) {
      loadAudio();
    }

    if (viewName === 'output' && !isOutputLoaded()) {
      loadOutput();
    }
  }

  elements.navigationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveView(button.dataset.view);
    });
  });

  return { setActiveView };
}
