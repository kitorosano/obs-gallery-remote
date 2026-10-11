export function createObsEvents({
  onSceneChanged,
  onAudioChanged,
  onOutputChanged,
  onObsConnected,
  onObsDisconnected,
}) {
  let eventSource = null;

  function connect() {
    if (eventSource) {
      return;
    }

    eventSource = new EventSource('/api/obs/events');

    eventSource.addEventListener('connected', () => {
      console.log('[SSE] Canal de eventos conectado.');
    });

    eventSource.addEventListener('obs-event', (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'scene-changed':
            onSceneChanged?.(message.data);
            break;
          case 'audio-mute-changed':
          case 'audio-volume-changed':
            onAudioChanged?.(message.data);
            break;
          case 'stream-state-changed':
          case 'record-state-changed':
            onOutputChanged?.(message.data);
            break;

          case 'obs-connected':
            onObsConnected?.(message.data);
            break;

          case 'obs-disconnected':
            onObsDisconnected?.(message.data);
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('[SSE] Evento inválido:', error);
      }
    });

    eventSource.onerror = () => {
      /*
       * No cerramos EventSource.
       *
       * El navegador intentará reconectarse
       * automáticamente si el servidor
       * desaparece temporalmente.
       */
      console.warn('[SSE] Conexión de eventos interrumpida. Reintentando…');
    };
  }

  function disconnect() {
    if (!eventSource) {
      return;
    }

    eventSource.close();
    eventSource = null;
  }

  return {
    connect,
    disconnect,
  };
}
