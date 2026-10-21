import { createMessagePresenter, renderEmptyState } from './ui.js';

const HIDDEN_SOURCES_STORAGE_KEY = 'obs-gallery-remote-hidden-sources';

const CURRENT_SCENE_ONLY_STORAGE_KEY =
  'obs-gallery-remote-sources-current-scene-only';

export function createSources({ obsService, elements, refreshStatus }) {
  let sources = [];
  let currentScene = null;
  let sourcesLoaded = false;
  let sourcesLoadVersion = 0;

  const changesInProgress = new Set();

  let hiddenSources = loadHiddenSources();

  const storedCurrentSceneOnly = localStorage.getItem(
    CURRENT_SCENE_ONLY_STORAGE_KEY,
  );
  let currentSceneOnly =
    storedCurrentSceneOnly === null ? true : storedCurrentSceneOnly === 'true';
  elements.currentSceneOnly.checked = currentSceneOnly;

  const setMessage = createMessagePresenter(elements.sourcesMessage);

  function loadHiddenSources() {
    try {
      const stored = localStorage.getItem(HIDDEN_SOURCES_STORAGE_KEY);

      if (!stored) {
        return new Set();
      }

      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) {
        return new Set();
      }

      return new Set(parsed.filter((key) => typeof key === 'string'));
    } catch {
      return new Set();
    }
  }

  function saveHiddenSources() {
    localStorage.setItem(
      HIDDEN_SOURCES_STORAGE_KEY,
      JSON.stringify([...hiddenSources]),
    );
  }

  function getSourceKey(source) {
    return `${source.sceneName}:${source.sceneItemId}`;
  }

  function setPanelSourceVisibility(source, visible) {
    const sourceKey = getSourceKey(source);

    if (visible) {
      hiddenSources.delete(sourceKey);
    } else {
      hiddenSources.add(sourceKey);
    }

    saveHiddenSources();
    render();
  }

  function render() {
    elements.sourcesGrid.replaceChildren();

    const sceneSources = currentSceneOnly
      ? sources.filter((source) => source.sceneName === currentScene)
      : sources;

    const hiddenCount = sceneSources.filter((source) =>
      hiddenSources.has(getSourceKey(source)),
    ).length;

    const visibleSources = sceneSources.filter(
      (source) => !hiddenSources.has(getSourceKey(source)),
    );

    const totalHiddenCount = sources.filter((source) =>
      hiddenSources.has(getSourceKey(source)),
    ).length;

    elements.currentSourcesScene.textContent =
      currentScene || 'Sin información';

    elements.manageSourcesButton.textContent =
      totalHiddenCount > 0
        ? `Gestionar fuentes (${totalHiddenCount} ocultas)`
        : 'Gestionar fuentes';

    elements.sourcesCount.textContent =
      hiddenCount > 0
        ? `${visibleSources.length} visibles · ${hiddenCount} ocultas`
        : `${visibleSources.length} ${
            visibleSources.length === 1 ? 'fuente' : 'fuentes'
          }`;

    if (!visibleSources.length) {
      let message = 'OBS no devolvió ninguna fuente.';

      if (sources.length) {
        if (currentSceneOnly && sceneSources.length === 0) {
          message = 'La escena actual no tiene fuentes.';
        } else {
          message = 'Todas las fuentes disponibles están ocultas.';
        }
      }

      renderEmptyState(elements.sourcesGrid, message);

      return;
    }

    for (const source of visibleSources) {
      const row = document.createElement('div');
      row.className = `source-control-row${source.enabled ? '' : ' disabled'}`;

      const info = document.createElement('div');
      info.className = 'source-control-info';

      const name = document.createElement('strong');
      name.className = 'source-control-name';
      name.textContent = source.sourceName;

      info.append(name);

      const control = document.createElement('div');
      control.className = 'source-control-visibility';

      const switchElement = document.createElement('span');
      switchElement.className = 'switch';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = source.enabled;
      checkbox.disabled = changesInProgress.has(getSourceKey(source));
      checkbox.setAttribute(
        'aria-label',
        `${source.enabled ? 'Ocultar' : 'Mostrar'} ${source.sourceName}`,
      );

      const track = document.createElement('span');
      track.className = 'switch-track';
      track.setAttribute('aria-hidden', 'true');

      switchElement.append(checkbox, track);
      control.append(switchElement);

      const hideButton = document.createElement('button');
      hideButton.type = 'button';
      hideButton.className = 'source-hide-button';
      hideButton.textContent = '×';
      hideButton.setAttribute(
        'aria-label',
        `Ocultar ${source.sourceName} del panel`,
      );
      hideButton.title = 'Ocultar del panel';
      hideButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setPanelSourceVisibility(source, false);
      });

      checkbox.addEventListener('change', () => {
        changeVisibility(source, checkbox.checked);
      });

      info.addEventListener('click', () => {
        if (checkbox.disabled) return;

        checkbox.checked = !checkbox.checked;
        changeVisibility(source, checkbox.checked);
      });

      row.append(info, control, hideButton);

      elements.sourcesGrid.append(row);
    }
  }

  function renderSourceManager() {
    elements.sourcesList.replaceChildren();

    if (!sources.length) {
      renderEmptyState(elements.sourcesList, 'No hay fuentes disponibles.');

      return;
    }

    for (const source of sources) {
      const row = document.createElement('div');
      row.className = 'audio-source-manager-row';

      const name = document.createElement('span');
      name.className = 'audio-source-manager-name';
      name.textContent = `${source.sourceName} · ${source.sceneName}`;

      const control = document.createElement('label');
      control.className = 'audio-source-visibility';

      const label = document.createElement('span');
      const visible = !hiddenSources.has(getSourceKey(source));
      label.textContent = visible ? 'Visible' : 'Oculta';

      const switchElement = document.createElement('span');
      switchElement.className = 'switch';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = visible;
      checkbox.setAttribute(
        'aria-label',
        `Mostrar ${source.sourceName} de ${source.sceneName}`,
      );

      const track = document.createElement('span');
      track.className = 'switch-track';
      track.setAttribute('aria-hidden', 'true');

      switchElement.append(checkbox, track);
      control.append(label, switchElement);

      function applyVisibility() {
        setPanelSourceVisibility(source, checkbox.checked);

        label.textContent = checkbox.checked ? 'Visible' : 'Oculta';
      }

      checkbox.addEventListener('change', applyVisibility);

      row.addEventListener('click', (event) => {
        if (event.target.closest('.audio-source-visibility')) {
          return;
        }

        checkbox.checked = !checkbox.checked;
        applyVisibility();
      });

      row.append(name, control);
      elements.sourcesList.append(row);
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
    const sourceKey = getSourceKey(source);
    if (changesInProgress.has(sourceKey)) return;

    changesInProgress.add(sourceKey);

    render();

    setMessage(
      enabled
        ? `Mostrando "${source.sourceName}"…`
        : `Ocultando "${source.sourceName}"…`,
    );

    try {
      const result = await obsService.setSourceVisibility(
        source.sceneName,
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
        (item) =>
          item.sceneName === source.sceneName &&
          item.sceneItemId === source.sceneItemId,
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
      changesInProgress.delete(sourceKey);

      render();

      await refreshStatus();
    }
  }

  elements.currentSceneOnly.addEventListener('change', () => {
    currentSceneOnly = elements.currentSceneOnly.checked;

    localStorage.setItem(
      CURRENT_SCENE_ONLY_STORAGE_KEY,
      currentSceneOnly ? 'true' : 'false',
    );

    render();
  });

  return {
    isLoaded: () => sourcesLoaded,
    isCurrentSceneOnly: () => currentSceneOnly,

    loadSources,
    renderSourceManager,
    reset: () => {
      sourcesLoadVersion += 1;
      sourcesLoaded = false;
    },
  };
}
