const STORAGE_KEY = 'obs-remote-control-sections';

const DEFAULT_STATE = {
  scenes: true,
  sources: false,
  audio: false,
};

export function createControl({ root }) {
  let sectionState = loadState();

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

      return {
        ...DEFAULT_STATE,
        ...(saved || {}),
      };
    } catch {
      return { ...DEFAULT_STATE };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sectionState));
  }

  function renderSection(button) {
    const sectionName = button.dataset.controlSection;
    const expanded = sectionState[sectionName] !== false;

    const contentId = button.getAttribute('aria-controls');
    const content = document.getElementById(contentId);

    button.setAttribute('aria-expanded', String(expanded));

    if (content) {
      content.hidden = !expanded;
    }
  }

  function toggleSection(button) {
    const sectionName = button.dataset.controlSection;

    sectionState[sectionName] = !(sectionState[sectionName] !== false);

    saveState();
    renderSection(button);
  }

  function init() {
    const buttons = root.querySelectorAll('.control-section-toggle');

    buttons.forEach((button) => {
      renderSection(button);

      button.addEventListener('click', () => {
        toggleSection(button);
      });
    });
  }

  return { init };
}
