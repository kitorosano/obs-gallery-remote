export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration =
        await navigator.serviceWorker.register('/service-worker.js');

      console.log('Service Worker registrado:', registration.scope);
    } catch (error) {
      console.error('No se pudo registrar el Service Worker:', error);
    }
  });
}
