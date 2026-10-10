export function createNavigation({ elements, loadScenes, isScenesLoaded }) {
  function setActiveView(viewName) {
    const showGallery = viewName === 'gallery';

    elements.galleryView.hidden = !showGallery;
    elements.scenesView.hidden = showGallery;

    elements.navigationButtons.forEach((button) => {
      const active = button.dataset.view === viewName;

      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    if (viewName === 'scenes' && !isScenesLoaded()) {
      loadScenes();
    }
  }

  elements.navigationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveView(button.dataset.view);
    });
  });

  return { setActiveView };
}
