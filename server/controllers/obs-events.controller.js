import {
  addObsEventClient,
  removeObsEventClient,
} from '../services/obs-events.js';

export function subscribeToObsEvents(req, res) {
  /*
   * Cabeceras requeridas para Server-Sent Events.
   */
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  /*
   * Mensaje inicial.
   *
   * Además de confirmar que el canal funciona,
   * hace que el navegador considere abierta
   * correctamente la conexión SSE.
   */
  res.write('event: connected\n');

  res.write(
    `data: ${JSON.stringify({
      type: 'connected',
      timestamp: Date.now(),
    })}\n\n`,
  );

  addObsEventClient(res);

  /*
   * Cuando el teléfono cierra la página,
   * eliminamos esa conexión.
   */
  req.on('close', () => {
    removeObsEventClient(res);
  });
}
