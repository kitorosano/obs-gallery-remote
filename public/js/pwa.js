let installPrompt = null;

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function initializePwa() {
  const installButton = document.querySelector('#install-app');
  const iosDialog = document.querySelector('#ios-install-dialog');
  const closeIosButton = document.querySelector('#close-ios-install');

  if (!installButton || !iosDialog || !closeIosButton) return;

  // Si ya estamos ejecutando la PWA
  // instalada, no mostramos nada.
  if (isStandalone()) {
    installButton.hidden = true;
  } else if (isIos()) {
    // iOS no utiliza beforeinstallprompt.
    installButton.hidden = false;
    installButton.textContent = 'Cómo instalar';
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();

    installPrompt = event;

    if (!isStandalone()) {
      installButton.hidden = false;
      installButton.textContent = 'Instalar aplicación';
    }
  });

  installButton.addEventListener('click', async () => {
    if (isIos()) {
      iosDialog.showModal();
      return;
    }

    if (!installPrompt) return;

    installButton.disabled = true;

    try {
      await installPrompt.prompt();

      const result = await installPrompt.userChoice;

      if (result.outcome === 'accepted') {
        installButton.hidden = true;
      }
    } finally {
      installPrompt = null;
      installButton.disabled = false;
    }
  });

  closeIosButton.addEventListener('click', () => {
    iosDialog.close();
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    installButton.hidden = true;

    console.log('OBS Remote instalado como PWA.');
  });

  registerServiceWorker();
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        { updateViaCache: 'none' },
      );

      console.log('Service Worker registrado:', registration.scope);
    } catch (error) {
      console.error('No se pudo registrar el Service Worker:', error);
    }
  });
}
