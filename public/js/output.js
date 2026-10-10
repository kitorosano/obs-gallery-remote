export function createOutput({ api, elements, refreshStatus }) {
  let outputLoaded = false;
  let actionInProgress = false;

  let state = {
    stream: null,
    record: null,
  };

  function setMessage(text = '', type = '') {
    elements.outputMessage.textContent = text;
    elements.outputMessage.className = `message ${type}`.trim();
  }

  function formatDuration(durationMs) {
    if (!Number.isFinite(Number(durationMs))) {
      return '00:00:00';
    }

    const totalSeconds = Math.floor(Number(durationMs) / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((value) => String(value).padStart(2, '0'))
      .join(':');
  }

  function renderStatus({ container, active, activeText, inactiveText }) {
    container.className = `output-status ${active ? 'active' : 'inactive'}`;

    container.textContent = active ? activeText : inactiveText;
  }

  function render() {
    const stream = state.stream;
    const record = state.record;

    if (!stream || !record) {
      return;
    }

    /*
     * STREAM
     */
    renderStatus({
      container: elements.streamStatus,
      active: stream.active,
      activeText: stream.reconnecting ? 'RECONECTANDO' : 'EN VIVO',
      inactiveText: 'FUERA DEL AIRE',
    });

    elements.streamDuration.textContent = formatDuration(stream.durationMs);

    elements.streamButton.textContent = stream.active
      ? 'Detener transmisión'
      : 'Iniciar transmisión';

    elements.streamButton.className = stream.active
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

    elements.recordDuration.textContent = formatDuration(record.durationMs);

    elements.recordButton.textContent = record.active
      ? 'Detener grabación'
      : 'Iniciar grabación';

    elements.recordButton.className = record.active
      ? 'output-action danger'
      : 'output-action start';

    elements.recordButton.disabled = actionInProgress;
  }

  async function loadOutput({ silent = false, preserveMessage = false } = {}) {
    if (!silent) {
      setMessage('Consultando estado de emisión…');
    }

    try {
      const data = await api('/api/obs/output/status');

      state = {
        stream: data.stream,
        record: data.record,
      };

      outputLoaded = true;

      render();

      if (!silent && !preserveMessage) {
        setMessage('');
      }

      return true;
    } catch (error) {
      outputLoaded = false;

      if (!silent) {
        setMessage(
          `No se pudo consultar el estado de emisión: ${error.message}`,
          'error',
        );
      }

      return false;
    }
  }

  async function executeAction({ endpoint, workingMessage, successMessage }) {
    if (actionInProgress) {
      return;
    }

    actionInProgress = true;
    render();

    setMessage(workingMessage);

    try {
      await api(endpoint, {
        method: 'POST',
      });

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

  async function toggleStream() {
    if (!state.stream) {
      return;
    }

    if (state.stream.active) {
      const confirmed = window.confirm(
        '¿Detener la transmisión en vivo?\n\nEsto cortará inmediatamente la emisión desde OBS.',
      );

      if (!confirmed) {
        return;
      }

      await executeAction({
        endpoint: '/api/obs/stream/stop',
        workingMessage: 'Deteniendo transmisión…',
        successMessage: 'La transmisión fue detenida.',
      });

      return;
    }

    await executeAction({
      endpoint: '/api/obs/stream/start',
      workingMessage: 'Iniciando transmisión…',
      successMessage: 'La transmisión está en vivo.',
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
        endpoint: '/api/obs/record/stop',
        workingMessage: 'Deteniendo grabación…',
        successMessage: 'La grabación fue detenida.',
      });

      return;
    }

    await executeAction({
      endpoint: '/api/obs/record/start',
      workingMessage: 'Iniciando grabación…',
      successMessage: 'La grabación está activa.',
    });
  }

  elements.streamButton.addEventListener('click', toggleStream);

  elements.recordButton.addEventListener('click', toggleRecord);

  return {
    isLoaded: () => outputLoaded,
    loadOutput,
    reset: () => {
      outputLoaded = false;
    },
  };
}
