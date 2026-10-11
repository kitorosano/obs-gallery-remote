export function createObsController({ obsService, elements, onConnectionChange }) {
  async function refreshStatus() {
    try {
      const status = await obsService.status();

      elements.status.textContent = status.connected
        ? `OBS conectado${status.version ? ` · ${status.version}` : ''}`
        : 'OBS desconectado';

      elements.status.className = `status ${
        status.connected ? 'connected' : 'disconnected'
      }`;

      onConnectionChange?.(status.connected);

      return status.connected;
    } catch {
      elements.status.textContent = 'Servidor no disponible';
      elements.status.className = 'status disconnected';
      onConnectionChange?.(false);
      return false;
    }
  }

  async function connect() {
    return obsService.connect();
  }

  async function showImage(image) {
    elements.showButton.disabled = true;
    elements.message.textContent = 'Enviando imagen a OBS…';

    try {
      const result = await obsService.showImage(image.id);

      elements.message.textContent = result.message || 'Imagen enviada a OBS.';
      elements.message.className = 'message success';
    } catch (error) {
      elements.message.textContent = `No se pudo mostrar la imagen: ${error.message}`;
      elements.message.className = 'message error';
    } finally {
      elements.showButton.disabled = false;
    }
  }

  return {
    connect,
    refreshStatus,
    showImage,
    setAvailability: (connected) => onConnectionChange?.(connected),
  };
}
