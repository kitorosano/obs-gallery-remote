export function createAudio({ api, elements, refreshStatus }) {
  let inputs = [];
  let audioLoaded = false;
  let changeInProgress = false;
  const volumeChangesInProgress = new Set();

  function setMessage(text = '', type = '') {
    elements.audioMessage.textContent = text;
    elements.audioMessage.className = `message ${type}`.trim();
  }

  function formatDb(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return '—';
    }

    return `${number.toFixed(1)} dB`;
  }

  function clampVolumeDb(value) {
    return Math.min(0, Math.max(-60, Number(value)));
  }

  function render() {
    elements.audioGrid.replaceChildren();

    elements.audioCount.textContent = `${inputs.length} ${
      inputs.length === 1 ? 'fuente' : 'fuentes'
    }`;

    if (!inputs.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'OBS no devolvió ninguna fuente de audio.';
      elements.audioGrid.append(empty);
      return;
    }

    for (const input of inputs) {
      const card = document.createElement('div');
      card.className = `audio-card${input.muted ? ' muted' : ''}`;

      /*
       * Cabecera
       */
      const info = document.createElement('div');
      info.className = 'audio-info';

      const name = document.createElement('strong');
      name.className = 'audio-name';
      name.textContent = input.inputName;

      const status = document.createElement('span');
      status.className = `audio-status${input.muted ? ' muted' : ' active'}`;
      status.textContent = input.muted ? 'SILENCIADO' : 'ACTIVO';

      info.append(name, status);

      /*
       * Volumen
       */
      const volumeSection = document.createElement('div');
      volumeSection.className = 'audio-volume';

      const volumeHeader = document.createElement('div');
      volumeHeader.className = 'audio-volume-header';

      const volumeLabel = document.createElement('span');
      volumeLabel.className = 'audio-volume-label';
      volumeLabel.textContent = 'VOLUMEN';

      const volumeValue = document.createElement('strong');
      volumeValue.className = 'audio-volume-value';
      volumeValue.textContent = formatDb(input.volumeDb);

      volumeHeader.append(volumeLabel, volumeValue);

      const slider = document.createElement('input');

      slider.type = 'range';
      slider.className = 'audio-volume-slider';

      slider.min = '-60';
      slider.max = '0';
      slider.step = '0.5';

      slider.value = String(clampVolumeDb(input.volumeDb));

      slider.setAttribute('aria-label', `Volumen de ${input.inputName}`);

      slider.disabled = volumeChangesInProgress.has(input.inputName);

      /*
       * input:
       * solo actualizamos el número mientras
       * el usuario mueve el slider.
       */
      slider.addEventListener('input', () => {
        volumeValue.textContent = formatDb(slider.value);
      });

      /*
       * change:
       * enviamos el valor a OBS cuando el
       * usuario termina el movimiento.
       */
      slider.addEventListener('change', () => {
        changeVolume(input.inputName, Number(slider.value));
      });

      const scale = document.createElement('div');
      scale.className = 'audio-volume-scale';

      const min = document.createElement('span');
      min.textContent = '-60 dB';

      const max = document.createElement('span');
      max.textContent = '0 dB';

      scale.append(min, max);

      volumeSection.append(volumeHeader, slider, scale);

      /*
       * Mute
       */
      const button = document.createElement('button');

      button.className = input.muted ? 'audio-toggle muted' : 'audio-toggle';

      button.textContent = input.muted ? 'Activar audio' : 'Silenciar';

      button.disabled = changeInProgress;

      button.addEventListener('click', () => {
        changeMute(input.inputName, !input.muted);
      });

      card.append(info, volumeSection, button);

      elements.audioGrid.append(card);
    }
  }

  async function loadAudio({ silent = false, preserveMessage = false } = {}) {
    if (!silent) {
      setMessage('Cargando fuentes de audio…');
    }

    try {
      const data = await api('/api/obs/audio');

      inputs = Array.isArray(data.inputs) ? data.inputs : [];

      audioLoaded = true;

      render();

      if (!silent && !preserveMessage) {
        setMessage('');
      }

      return true;
    } catch (error) {
      audioLoaded = false;

      elements.audioGrid.replaceChildren();

      const empty = document.createElement('p');

      empty.className = 'muted';
      empty.textContent = 'No se pudieron cargar las fuentes de audio.';

      elements.audioGrid.append(empty);
      elements.audioCount.textContent = '';

      if (!silent) {
        setMessage(
          `No se pudieron cargar las fuentes de audio: ${error.message}`,
          'error',
        );
      }

      return false;
    }
  }

  async function changeMute(inputName, muted) {
    if (changeInProgress) {
      return;
    }

    changeInProgress = true;
    render();

    setMessage(
      muted ? `Silenciando "${inputName}"…` : `Activando "${inputName}"…`,
    );

    try {
      const result = await api('/api/obs/audio/mute', {
        method: 'POST',

        body: JSON.stringify({
          inputName,
          muted,
        }),
      });

      if (result.muted !== muted) {
        throw new Error(`OBS no confirmó el nuevo estado de "${inputName}".`);
      }

      const refreshed = await loadAudio({
        silent: true,
        preserveMessage: true,
      });

      if (!refreshed) {
        throw new Error(
          'El cambio fue solicitado, pero no se pudo actualizar el estado del audio.',
        );
      }

      const confirmedInput = inputs.find(
        (input) => input.inputName === inputName,
      );

      if (!confirmedInput || confirmedInput.muted !== muted) {
        throw new Error(`OBS no confirmó el estado final de "${inputName}".`);
      }

      setMessage(
        muted
          ? `"${inputName}" está silenciado.`
          : `"${inputName}" está activo.`,
        'success',
      );
    } catch (error) {
      setMessage(`No se pudo cambiar el audio: ${error.message}`, 'error');
    } finally {
      changeInProgress = false;
      render();

      await refreshStatus();
    }
  }

  async function changeVolume(inputName, requestedVolumeDb) {
    if (volumeChangesInProgress.has(inputName)) {
      return;
    }

    const volumeDb = clampVolumeDb(requestedVolumeDb);

    volumeChangesInProgress.add(inputName);

    setMessage(`Ajustando "${inputName}" a ${formatDb(volumeDb)}…`);

    try {
      const result = await api('/api/obs/audio/volume', {
        method: 'POST',

        body: JSON.stringify({
          inputName,
          volumeDb,
        }),
      });

      if (!Number.isFinite(Number(result.volumeDb))) {
        throw new Error('OBS no devolvió un volumen válido.');
      }

      /*
       * Volvemos a consultar OBS.
       * El valor devuelto por OBS puede tener
       * pequeñas diferencias de coma flotante.
       */
      const refreshed = await loadAudio({
        silent: true,
        preserveMessage: true,
      });

      if (!refreshed) {
        throw new Error(
          'El volumen fue solicitado, pero no se pudo confirmar el estado actual de OBS.',
        );
      }

      const confirmedInput = inputs.find(
        (input) => input.inputName === inputName,
      );

      if (!confirmedInput) {
        throw new Error(`No se pudo volver a encontrar "${inputName}" en OBS.`);
      }

      setMessage(
        `"${inputName}" quedó en ${formatDb(confirmedInput.volumeDb)}.`,
        'success',
      );
    } catch (error) {
      setMessage(`No se pudo cambiar el volumen: ${error.message}`, 'error');

      /*
       * Si algo falló, intentamos recuperar
       * nuevamente el estado real de OBS.
       */
      await loadAudio({
        silent: true,
        preserveMessage: true,
      });
    } finally {
      volumeChangesInProgress.delete(inputName);

      render();

      await refreshStatus();
    }
  }

  return {
    isLoaded: () => audioLoaded,
    loadAudio,
    reset: () => {
      audioLoaded = false;
    },
  };
}
