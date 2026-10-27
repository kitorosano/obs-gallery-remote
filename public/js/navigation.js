export function createNavigation({
  elements,

  loadGallery,
  loadScenes,
  loadSources,
  loadAudio,
  loadOutput,
  loadSettings,

  startOutputRealtime,
  stopOutputRealtime,
}) {
  async function setActiveView(viewName) {
    elements.galleryView.hidden = viewName !== 'gallery';
    elements.controlView.hidden = viewName !== 'control';
    elements.outputView.hidden = viewName !== 'output';
    elements.settingsView.hidden = viewName !== 'settings';

    elements.navigationButtons.forEach((button) => {
      const active = button.dataset.view === viewName;

      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (viewName === 'gallery') {
      await loadGallery();
    }

    if (viewName === 'control') {
      await Promise.all([loadScenes(), loadSources(), loadAudio()]);
    }

    if (viewName === 'output') {
      startOutputRealtime();
      await loadOutput();
    } else {
      stopOutputRealtime();
    }

    if (viewName === 'settings') {
      await loadSettings();
    }
  }

  elements.navigationButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      await setActiveView(button.dataset.view);
    });
  });
}
