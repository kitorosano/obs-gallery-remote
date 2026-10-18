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

  menuButton.addEventListener('click', (event) => {
    event.stopPropagation();
    toggle();
  });

  menuDropdown.addEventListener('click', (event) => {
    event.stopPropagation();

    if (event.target.closest('button')) {
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
