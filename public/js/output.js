import { createMessagePresenter, formatDuration } from './ui.js';

export function createOutput({ obsService, elements, refreshStatus }) {
  const SYNC_INTERVAL_MS = 3000;
  const TIMER_INTERVAL_MS = 1000;

  let outputLoaded = false;
  let actionInProgress = false;

  let syncInterval = null;
  let timerInterval = null;

  let state = {
    stream: null,
    record: null,
    aitumStreams: [],
  };

  /*
   * Momento local en que recibimos el último estado
   * confirmado por OBS.
   */
  let lastSyncAt = null;

  const setMessage = createMessagePresenter(elements.outputMessage);

  function getEstimatedDuration(output) {
    if (!output?.active) {
      return 0;
    }

    const baseDuration = Number(output.durationMs) || 0;

    if (!lastSyncAt) {
      return baseDuration;
    }

    const elapsed = Date.now() - lastSyncAt;

    return baseDuration + elapsed;
  }

  function getAdditionalStreams() {
    return state.aitumStreams.filter((output) => output.type === 'stream');
  }

  function getStreamStates() {
    return [
      {
        name: 'YouTube',
        active: state.stream?.active === true,
        builtIn: true,
      },
      ...getAdditionalStreams().map((output) => ({
        name: output.name,
        active: output.active === true,
        builtIn: false,
      })),
    ];
  }

  function renderStatus({ container, active, activeText, inactiveText }) {
    container.className = `output-status ${active ? 'active' : 'inactive'}`;

    container.textContent = active ? activeText : inactiveText;
  }

  function renderTimers() {
    if (!state.stream || !state.record) {
      return;
    }

    /*
     * Duración que OBS WebSocket reporta
     * como efectivamente emitida.
     */
    const streamDurationMs = getEstimatedDuration(state.stream);

    elements.streamDuration.textContent = formatDuration(streamDurationMs);

    /*
     * Stream Delay configurado.
     */
    const delaySeconds = Number(state.stream.delaySeconds) || 0;

    const delayMs = delaySeconds * 1000;

    elements.streamDelay.textContent = `${delaySeconds} s`;
    elements.streamDelayInfo.hidden = delaySeconds <= 0;

    /*
     * Nuestra prueba mostró:
     *
     * OBS visual: ~00:00:30
     * WebSocket:   00:00:19.499
     *
     * Por lo tanto:
     *
     * tiempo desde inicio
     * =
     * tiempo emitido + Stream Delay
     */
    if (state.stream.active) {
      const totalDurationMs = streamDurationMs + delayMs;

      elements.streamTotalTime.textContent = `≈ ${formatDuration(totalDurationMs)}`;
    } else {
      elements.streamTotalTime.textContent = '—';
    }

    /*
     * Grabación permanece igual.
     */
    elements.recordDuration.textContent = formatDuration(
      getEstimatedDuration(state.record),
    );
  }

  function render() {
    const stream = state.stream;
    const record = state.record;

    if (!stream || !record) return;

    /*
     * STREAM
     */
    const streams = getStreamStates();
    renderStreamPlatforms(streams);

    const allStreamsActive =
      streams.length > 0 && streams.every((stream) => stream.active);

    const anyStreamActive = streams.some((stream) => stream.active);

    renderStatus({
      container: elements.streamStatus,
      active: anyStreamActive,
      activeText: allStreamsActive ? 'EN VIVO' : 'PARCIAL',
      inactiveText: 'FUERA DEL AIRE',
    });

    elements.streamButton.textContent = anyStreamActive
      ? 'Detener transmisiones'
      : 'Iniciar transmisiones';

    elements.streamButton.className = anyStreamActive
      ? 'output-action danger'
      : 'output-action start';

    elements.streamButton.disabled = actionInProgress;

    /*
     * RECORD
     */
    renderStatus({
      container: elements.recordStatus,
      active: record.active,
      activeText: record.paused ? 'PAUSADA' : 'GRABANDO',
      inactiveText: 'SIN GRABAR',
    });

    elements.recordButton.textContent = record.active
      ? 'Detener grabación'
      : 'Iniciar grabación';

    elements.recordButton.className = record.active
      ? 'output-action danger'
      : 'output-action start';

    elements.recordButton.disabled = actionInProgress;

    renderTimers();
  }

  function renderStreamPlatforms(streams) {
    elements.streamPlatforms.replaceChildren();

    for (const stream of streams) {
      const row = document.createElement('div');
      row.className = 'stream-platform-row';

      const name = document.createElement('span');
      name.textContent = stream.name;

      const status = document.createElement('span');

      renderStatus({
        container: status,
        active: stream.active,
        activeText: 'EN VIVO',
        inactiveText: 'DETENIDO',
      });

      row.append(name, status);

      elements.streamPlatforms.append(row);
    }
  }

  async function loadOutput({ silent = false, preserveMessage = false } = {}) {
    if (!silent) {
      setMessage('Consultando estado de emisión…');
    }

    try {
      const [data, aitumData] = await Promise.all([
        obsService.outputs(),
        obsService.aitum(),
      ]);

      state = {
        stream: data.stream,
        record: data.record,
        aitumStreams: aitumData?.outputs?.outputs ?? [],
      };

      lastSyncAt = Date.now();
      outputLoaded = true;

      render();

      if (!silent && !preserveMessage) {
        setMessage('');
      }

      return true;
    } catch (error) {
      if (!silent) {
        setMessage(
          `No se pudo consultar el estado de emisión: ${error.message}`,
          'error',
        );
      }

      return false;
    }
  }

  async function executeAction({ action, workingMessage, successMessage }) {
    if (actionInProgress) {
      return;
    }

    actionInProgress = true;

    render();

    setMessage(workingMessage);

    try {
      await action();

      const refreshed = await loadOutput({
        silent: true,
        preserveMessage: true,
      });

      if (!refreshed) {
        throw new Error(
          'La operación fue enviada, pero no se pudo confirmar el estado actual de OBS.',
        );
      }

      setMessage(successMessage, 'success');
    } catch (error) {
      setMessage(`La operación falló: ${error.message}`, 'error');

      await loadOutput({
        silent: true,
        preserveMessage: true,
      });
    } finally {
      actionInProgress = false;

      render();

      await refreshStatus();
    }
  }

  function isAnyStreamActive() {
    return getStreamStates().some((stream) => stream.active);
  }

  async function toggleStream() {
    if (!state.stream) return;

    if (isAnyStreamActive()) {
      const confirmed = window.confirm(
        '¿Detener todas las transmisiones en vivo?\n\nEsto detendrá todas las salidas de streaming inmediatamente.',
      );

      if (!confirmed) return;

      await executeAction({
        action: obsService.stopAllStreams,
        workingMessage: 'Deteniendo transmisiones…',
        successMessage: 'Las transmisiones fueron detenidas.',
      });

      return;
    }

    await executeAction({
      action: obsService.startAllStreams,
      workingMessage: 'Iniciando transmisiones…',
      successMessage: 'Las transmisiones están en vivo.',
    });
  }

  async function toggleRecord() {
    if (!state.record) {
      return;
    }

    if (state.record.active) {
      const confirmed = window.confirm('¿Detener la grabación actual?');

      if (!confirmed) {
        return;
      }

      await executeAction({
        action: obsService.stopRecord,
        workingMessage: 'Deteniendo grabación…',
        successMessage: 'La grabación fue detenida.',
      });

      return;
    }

    await executeAction({
      action: obsService.startRecord,
      workingMessage: 'Iniciando grabación…',
      successMessage: 'La grabación está activa.',
    });
  }

  /*
   * Consulta periódicamente OBS.
   *
   * 3 segundos es suficientemente rápido para
   * detectar cambios hechos directamente en OBS
   * sin generar polling excesivo.
   */
  async function syncWithObs() {
    if (document.hidden || actionInProgress || elements.outputView.hidden) {
      return;
    }

    await loadOutput({
      silent: true,
      preserveMessage: true,
    });
  }

  function startRealtime() {
    if (!timerInterval) {
      timerInterval = window.setInterval(renderTimers, TIMER_INTERVAL_MS);
    }

    if (!syncInterval) {
      syncInterval = window.setInterval(syncWithObs, SYNC_INTERVAL_MS);
    }
  }

  function stopRealtime() {
    if (timerInterval) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }

    if (syncInterval) {
      window.clearInterval(syncInterval);
      syncInterval = null;
    }
  }

  /*
   * Cuando el usuario vuelve a la pestaña del
   * navegador, sincronizamos inmediatamente.
   */
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !elements.outputView.hidden) {
      loadOutput({
        silent: true,
        preserveMessage: true,
      });
    }
  });

  elements.streamButton.addEventListener('click', toggleStream);
  elements.recordButton.addEventListener('click', toggleRecord);

  return {
    isLoaded: () => outputLoaded,
    loadOutput,
    startRealtime,
    stopRealtime,
    reset: () => {
      outputLoaded = false;
      lastSyncAt = null;

      state = {
        stream: null,
        record: null,
        aitumStreams: [],
      };
    },
  };
}
