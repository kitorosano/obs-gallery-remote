import { createMessagePresenter, renderEmptyState } from './ui.js';

export function createSources({ obsService, elements, refreshStatus }) {
  let sources = [];
  let currentScene = null;
  let sourcesLoaded = false;
  let sourcesLoadVersion = 0;

  const changesInProgress = new Set();

  const setMessage = createMessagePresenter(elements.sourcesMessage);

  function render() {
    elements.sourcesGrid.replaceChildren();

    elements.currentSourcesScene.textContent =
      currentScene || 'Sin información';

    elements.sourcesCount.textContent = `${sources.length} ${
      sources.length === 1 ? 'fuente' : 'fuentes'
    }`;

    if (!sources.length) {
      renderEmptyState(
        elements.sourcesGrid,
        'La escena actual no tiene fuentes.',
      );

      return;
    }

    for (const source of sources) {
      const row = document.createElement('div');
      row.className = `source-control-row${source.enabled ? '' : ' disabled'}`;

      const info = document.createElement('div');
      info.className = 'source-control-info';

      const name = document.createElement('strong');
      name.className = 'source-control-name';
      name.textContent = source.sourceName;

      info.append(name);

      const control = document.createElement('label');
      control.className = 'source-control-visibility';

      const switchElement = document.createElement('span');
      switchElement.className = 'switch';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = source.enabled;
      checkbox.disabled = changesInProgress.has(source.sceneItemId);
      checkbox.setAttribute(
        'aria-label',
        `${source.enabled ? 'Ocultar' : 'Mostrar'} ${source.sourceName}`,
      );

      const track = document.createElement('span');
      track.className = 'switch-track';
      track.setAttribute('aria-hidden', 'true');

      switchElement.append(checkbox, track);
      control.append(switchElement);

      checkbox.addEventListener('change', () => {
        changeVisibility(source, checkbox.checked);
      });

      row.addEventListener('click', (event) => {
        if (event.target.closest('.source-control-visibility')) {
          return;
        }
        if (checkbox.disabled) {
          return;
        }

        checkbox.checked = !checkbox.checked;
        changeVisibility(source, checkbox.checked);
      });

      row.append(info, control);

      elements.sourcesGrid.append(row);
    }
  }

  async function loadSources({ silent = false, preserveMessage = false } = {}) {
    const loadVersion = ++sourcesLoadVersion;

    if (!silent) {
      setMessage('Cargando fuentes…');
    }

    try {
      const data = await obsService.sources();

      if (loadVersion !== sourcesLoadVersion) {
        return true;
      }

      sources = Array.isArray(data.sources) ? data.sources : [];
      currentScene = data.sceneName || null;
      sourcesLoaded = true;

      render();

      if (!silent && !preserveMessage) {
        setMessage('');
      }

      return true;
    } catch (error) {
      if (loadVersion !== sourcesLoadVersion) {
        return true;
      }

      sourcesLoaded = false;

      renderEmptyState(
        elements.sourcesGrid,
        'No se pudieron cargar las fuentes.',
      );

      elements.currentSourcesScene.textContent = '—';
      elements.sourcesCount.textContent = '';

      if (!silent) {
        setMessage(
          `No se pudieron cargar las fuentes: ${error.message}`,
          'error',
        );
      }

      return false;
    }
  }

  async function changeVisibility(source, enabled) {
    if (changesInProgress.has(source.sceneItemId)) {
      return;
    }

    changesInProgress.add(source.sceneItemId);

    render();

    setMessage(
      enabled
        ? `Mostrando "${source.sourceName}"…`
        : `Ocultando "${source.sourceName}"…`,
    );

    try {
      const result = await obsService.setSourceVisibility(
        currentScene,
        source.sceneItemId,
        enabled,
      );

      if (result.enabled !== enabled) {
        throw new Error(
          `OBS no confirmó el nuevo estado de "${source.sourceName}".`,
        );
      }

      const refreshed = await loadSources({
        silent: true,
        preserveMessage: true,
      });

      if (!refreshed) {
        throw new Error(
          'El cambio fue solicitado, pero no se pudo confirmar el estado actual de OBS.',
        );
      }

      const confirmedSource = sources.find(
        (item) => item.sceneItemId === source.sceneItemId,
      );

      if (!confirmedSource || confirmedSource.enabled !== enabled) {
        throw new Error(
          `OBS no confirmó el estado final de "${source.sourceName}".`,
        );
      }

      setMessage(
        enabled
          ? `"${source.sourceName}" está visible.`
          : `"${source.sourceName}" está oculta.`,
        'success',
      );
    } catch (error) {
      setMessage(
        `No se pudo cambiar la visibilidad: ${error.message}`,
        'error',
      );

      await loadSources({
        silent: true,
        preserveMessage: true,
      });
    } finally {
      changesInProgress.delete(source.sceneItemId);

      render();

      await refreshStatus();
    }
  }

  return {
    isLoaded: () => sourcesLoaded,
    loadSources,
    reset: () => {
      sourcesLoadVersion += 1;
      sourcesLoaded = false;
    },
  };
}
