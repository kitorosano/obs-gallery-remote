const THEME_STORAGE_KEY = 'obs-gallery-remote-theme';
const DEFAULT_THEME = 'dark';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    const active = button.dataset.themeOption === theme;

    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function initializeTheme() {
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;

  applyTheme(storedTheme);
}

export function createHeader({ menuButton, menuDropdown }) {
  function isOpen() {
    return !menuDropdown.hidden;
  }

  function open() {
    menuDropdown.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
  }

  function close() {
    menuDropdown.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    if (isOpen()) close();
    else open();
  }

  initializeTheme();

  document.querySelectorAll('[data-theme-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const theme = button.dataset.themeOption;

      localStorage.setItem(THEME_STORAGE_KEY, theme);
      applyTheme(theme);
    });
  });

  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggle();
  });

  menuDropdown.addEventListener('click', (event) => {
    event.stopPropagation();

    const button = event.target.closest('button');

    if (button && !button.matches('[data-theme-option]')) {
      close();
    }
  });

  document.addEventListener('click', close);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen()) {
      close();
      menuButton.focus();
    }
  });

  return {
    close,
  };
}
