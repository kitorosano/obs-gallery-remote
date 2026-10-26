import { createMessagePresenter, formatDuration } from './ui.js';

export function createOutput({ obsService, elements, refreshStatus }) {
  const SYNC_INTERVAL_MS = 3000;
  const TIMER_INTERVAL_MS = 1000;
  const STREAM_TRANSITION_POLL_MS = 500;
  const STREAM_TRANSITION_TIMEOUT_MS = 120000;

  let outputLoaded = false;
  let actionInProgress = false;
  let streamTransition = null;

  let syncInterval = null;
  let timerInterval = null;

  let state = {
    stream: null,
    record: null,
    stats: null,
    aitumStreams: [],
  };

  /*
   * Momento local en que recibimos el último estado
   * confirmado por OBS.
   */
  let lastSyncAt = null;
  let previousStreamSample = null;
  let streamBitrateKbps = 0;

  const setMessage = createMessagePresenter(elements.outputMessage);

  function updateStreamBitrate(stream, sampledAt) {
    if (!stream?.active) {
      previousStreamSample = null;
      streamBitrateKbps = 0;
      return;
    }

    const bytes = Number(stream.bytes) || 0;

    if (previousStreamSample) {
      const elapsedMs = sampledAt - previousStreamSample.sampledAt;
      const bytesDelta = bytes - previousStreamSample.bytes;

      if (elapsedMs > 0 && bytesDelta >= 0) {
        streamBitrateKbps = (bytesDelta * 8) / (elapsedMs / 1000) / 1000;
      }
    }

    previousStreamSample = {
      bytes,
      sampledAt,
    };
  }

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

  function handleStreamStateChanged({ outputState } = {}) {
    switch (outputState) {
      case 'OBS_WEBSOCKET_OUTPUT_STARTING':
        streamTransition = 'starting';
        break;

      case 'OBS_WEBSOCKET_OUTPUT_STOPPING':
        streamTransition = 'stopping';
        break;

      case 'OBS_WEBSOCKET_OUTPUT_STARTED':
      case 'OBS_WEBSOCKET_OUTPUT_STOPPED':
        streamTransition = null;
        break;

      default:
        return;
    }

    render();
  }

  function renderStatus({ container, active, activeText, inactiveText }) {
    container.className = `output-status ${active ? 'active' : 'inactive'}`;

    container.textContent = active ? activeText : inactiveText;
  }

  function renderTimers() {
    if (!state.stream || !state.record) return;

    const streamDurationMs = getEstimatedDuration(state.stream);

    elements.streamDuration.textContent = formatDuration(streamDurationMs);

    const delaySeconds = Number(state.stream.delaySeconds) || 0;

    elements.streamDelay.textContent = `${delaySeconds} s`;
    elements.streamDelayInfo.hidden = delaySeconds <= 0;

    elements.recordDuration.textContent = formatDuration(
      getEstimatedDuration(state.record),
    );
  }

  function renderNavOutputStatus({
    allStreamsActive,
    anyStreamActive,
    streamStarting,
    streamStopping,
  }) {
    let status = 'offline';
    let label = 'Fuera del aire';

    if (streamStarting) {
      status = 'pending';
      label = 'Iniciando transmisiones';
    } else if (streamStopping) {
      status = 'pending';
      label = 'Deteniendo transmisiones';
    } else if (allStreamsActive) {
      status = 'live';
      label = 'En vivo';
    } else if (anyStreamActive) {
      status = 'partial';
      label = 'Transmisión parcial';
    }

    elements.navOutputStatus.className = `nav-icon nav-output-status ${status}`;

    const navButton = elements.navOutputStatus.closest('.nav-button');

    if (navButton) {
      navButton.title = label;
    }
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
    renderStreamMetrics();

    const allStreamsActive =
      streams.length > 0 && streams.every((stream) => stream.active);

    const anyStreamActive = streams.some((stream) => stream.active);

    const streamStarting = streamTransition === 'starting';
    const streamStopping = streamTransition === 'stopping';

    renderNavOutputStatus({
      allStreamsActive,
      anyStreamActive,
      streamStarting,
      streamStopping,
    });

    if (streamStarting) {
      elements.streamStatus.className = 'output-status pending';
      elements.streamStatus.textContent = 'INICIANDO';
    } else if (streamStopping) {
      elements.streamStatus.className = 'output-status pending';
      elements.streamStatus.textContent = 'DETENIENDO';
    } else {
      renderStatus({
        container: elements.streamStatus,
        active: anyStreamActive,
        activeText: allStreamsActive ? 'EN VIVO' : 'PARCIAL',
        inactiveText: 'FUERA DEL AIRE',
      });
    }

    if (streamStarting) {
      elements.streamButton.textContent = 'Iniciando…';
    } else if (streamStopping) {
      elements.streamButton.textContent = 'Deteniendo…';
    } else {
      elements.streamButton.textContent = anyStreamActive
        ? 'Detener transmisiones'
        : 'Iniciar transmisiones';
    }

    elements.streamButton.className = anyStreamActive
      ? 'output-action danger'
      : 'output-action start';

    elements.streamButton.disabled =
      actionInProgress || streamTransition !== null;

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

  function renderStreamMetrics() {
    const stream = state.stream;
    const stats = state.stats;

    if (!stream || !stats) return;

    if (!stream.active) {
      elements.streamBitrate.textContent = '—';
      elements.streamDroppedFrames.textContent = '—';
    } else {
      elements.streamBitrate.textContent = `${Math.round(streamBitrateKbps)} kbps`;

      elements.streamDroppedFrames.textContent = `${stream.skippedFrames} (${stream.skippedFramesPercent.toFixed(1)}%)`;
    }

    elements.streamFps.textContent = `${stats.activeFps.toFixed(2)} FPS`;

    elements.streamCpu.textContent = `${stats.cpuUsage.toFixed(1)}%`;
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

      const sampledAt = Date.now();

      updateStreamBitrate(data.stream, sampledAt);

      state = {
        stream: data.stream,
        record: data.record,
        stats: data.stats,
        aitumStreams: aitumData?.outputs?.outputs ?? [],
      };

      lastSyncAt = sampledAt;
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

  async function executeAction({
    action,
    workingMessage,
    successMessage,
    refreshAfterAction = true,
  }) {
    if (actionInProgress) return false;

    actionInProgress = true;

    render();
    setMessage(workingMessage);

    try {
      await action();

      if (refreshAfterAction) {
        const refreshed = await loadOutput({
          silent: true,
          preserveMessage: true,
        });

        if (!refreshed) {
          throw new Error(
            'La operación fue enviada, pero no se pudo confirmar el estado actual de OBS.',
          );
        }
      }

      setMessage(successMessage, 'success');

      return true;
    } catch (error) {
      setMessage(`La operación falló: ${error.message}`, 'error');

      await loadOutput({
        silent: true,
        preserveMessage: true,
      });

      return false;
    } finally {
      actionInProgress = false;

      render();

      await refreshStatus();
    }
  }

  function isAnyStreamActive() {
    return getStreamStates().some((stream) => stream.active);
  }

  function wait(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  async function waitForStreamsToStart() {
    const startedAt = Date.now();

    while (Date.now() - startedAt < STREAM_TRANSITION_TIMEOUT_MS) {
      const refreshed = await loadOutput({
        silent: true,
        preserveMessage: true,
      });

      if (!refreshed) {
        throw new Error('No se pudo confirmar el estado de las transmisiones.');
      }

      const streams = getStreamStates();

      const allActive =
        streams.length > 0 && streams.every((stream) => stream.active);

      if (allActive) return;

      await wait(STREAM_TRANSITION_POLL_MS);
    }

    throw new Error(
      'No todas las transmisiones llegaron a estar activas dentro del tiempo de espera.',
    );
  }

  async function waitForStreamsToStop() {
    const startedAt = Date.now();

    while (Date.now() - startedAt < STREAM_TRANSITION_TIMEOUT_MS) {
      const refreshed = await loadOutput({
        silent: true,
        preserveMessage: true,
      });

      if (!refreshed) {
        throw new Error('No se pudo confirmar el estado de las transmisiones.');
      }

      if (!isAnyStreamActive()) return;

      await wait(STREAM_TRANSITION_POLL_MS);
    }

    throw new Error(
      'Las transmisiones siguen activas después del tiempo de espera.',
    );
  }

  async function toggleStream() {
    if (!state.stream) return;

    if (isAnyStreamActive()) {
      const confirmed = window.confirm(
        '¿Detener todas las transmisiones en vivo?\n\nEsto detendrá todas las salidas de streaming inmediatamente.',
      );
      if (!confirmed) return;

      streamTransition = 'stopping';
      render();

      try {
        const stopped = await executeAction({
          action: obsService.stopAllStreams,
          workingMessage: 'Deteniendo transmisiones…',
          successMessage: 'Esperando a que finalicen las transmisiones…',
          refreshAfterAction: false,
        });

        if (!stopped) {
          throw new Error('La orden de detención no pudo completarse.');
        }

        await waitForStreamsToStop();

        setMessage('Las transmisiones fueron detenidas.', 'success');
      } catch (error) {
        setMessage(
          `No se pudo confirmar la detención: ${error.message}`,
          'error',
        );
      } finally {
        streamTransition = null;

        await loadOutput({
          silent: true,
          preserveMessage: true,
        });

        render();
      }

      return;
    }

    streamTransition = 'starting';
    render();

    try {
      const started = await executeAction({
        action: obsService.startAllStreams,
        workingMessage: 'Iniciando transmisiones…',
        successMessage: 'Confirmando transmisiones…',
        refreshAfterAction: false,
      });

      if (!started) {
        throw new Error('La orden de inicio no pudo completarse.');
      }

      await waitForStreamsToStart();

      setMessage('Las transmisiones están en vivo.', 'success');
    } catch (error) {
      setMessage(`No se pudo confirmar el inicio: ${error.message}`, 'error');
    } finally {
      streamTransition = null;

      await loadOutput({
        silent: true,
        preserveMessage: true,
      });

      render();
    }
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
    if (
      document.hidden ||
      actionInProgress ||
      streamTransition !== null ||
      elements.outputView.hidden
    ) {
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
    handleStreamStateChanged,
    reset: () => {
      outputLoaded = false;
      lastSyncAt = null;

      state = {
        stream: null,
        record: null,
        stats: null,
        aitumStreams: [],
      };

      elements.navOutputStatus.className = 'nav-icon nav-output-status unknown';

      const navButton = elements.navOutputStatus.closest('.nav-button');
      if (navButton) {
        navButton.title = 'Estado de emisión desconocido';
      }
    },
  };
}
