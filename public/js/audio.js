export function createAudio({ api, elements, refreshStatus }) {
  let inputs = [];
  let audioLoaded = false;
  let changeInProgress = false;

  function setMessage(text = '', type = '') {
    elements.audioMessage.textContent = text;
    elements.audioMessage.className = `message ${type}`.trim();
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

      const info = document.createElement('div');
      info.className = 'audio-info';

      const name = document.createElement('strong');
      name.className = 'audio-name';
      name.textContent = input.inputName;

      const status = document.createElement('span');
      status.className = `audio-status${input.muted ? ' muted' : ' active'}`;
      status.textContent = input.muted ? 'SILENCIADO' : 'ACTIVO';

      info.append(name, status);

      const button = document.createElement('button');
      button.className = input.muted ? 'audio-toggle muted' : 'audio-toggle';

      button.textContent = input.muted ? 'Activar audio' : 'Silenciar';

      button.disabled = changeInProgress;

      button.addEventListener('click', () => {
        changeMute(input.inputName, !input.muted);
      });

      card.append(info, button);
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

      /*
       * Aunque el POST ya devuelve el estado confirmado,
       * recargamos toda la lista para mantener la UI
       * sincronizada con OBS.
       */
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

  return {
    isLoaded: () => audioLoaded,
    loadAudio,
    reset: () => {
      audioLoaded = false;
    },
  };
}
