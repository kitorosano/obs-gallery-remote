import { createMessagePresenter, renderEmptyState } from './ui.js';

export function createScenes({ obsService, elements, refreshStatus }) {
  let scenes = [];
  let currentScene = null;
  let scenesLoaded = false;
  let sceneChangeInProgress = false;

  const setMessage = createMessagePresenter(elements.sceneMessage);

  function render() {
    elements.sceneGrid.replaceChildren();
    elements.currentScene.textContent = currentScene || 'Sin información';
    elements.sceneCount.textContent = `${scenes.length} ${
      scenes.length === 1 ? 'escena' : 'escenas'
    }`;

    if (!scenes.length) {
      renderEmptyState(elements.sceneGrid, 'OBS no devolvió ninguna escena.');
      return;
    }

    for (const sceneName of scenes) {
      const button = document.createElement('button');
      const isActive = sceneName === currentScene;

      button.className = `scene-button${isActive ? ' active' : ''}`;
      button.setAttribute('aria-pressed', String(isActive));
      button.disabled = sceneChangeInProgress || isActive;

      const name = document.createElement('span');
      name.className = 'scene-name';
      name.textContent = sceneName;
      button.append(name);

      if (isActive) {
        const badge = document.createElement('span');
        badge.className = 'scene-live-badge';
        badge.textContent = 'EN PROGRAMA';
        button.append(badge);
      }

      button.addEventListener('click', () => changeScene(sceneName));
      elements.sceneGrid.append(button);
    }
  }

  async function loadScenes({ silent = false, preserveMessage = false } = {}) {
    if (!silent) {
      setMessage('Cargando escenas…');
    }

    try {
      const data = await obsService.scenes();
      scenes = Array.isArray(data.scenes) ? data.scenes : [];
      currentScene = data.currentScene || null;
      scenesLoaded = true;
      render();

      if (!silent && !preserveMessage) {
        setMessage('');
      }

      return true;
    } catch (error) {
      scenesLoaded = false;
      renderEmptyState(elements.sceneGrid, 'No se pudieron cargar las escenas.');
      elements.currentScene.textContent = '—';
      elements.sceneCount.textContent = '';

      if (!silent) {
        setMessage(`No se pudieron cargar las escenas: ${error.message}`, 'error');
      }

      return false;
    }
  }

  async function changeScene(sceneName) {
    if (sceneChangeInProgress || sceneName === currentScene) {
      return;
    }

    sceneChangeInProgress = true;
    render();
    setMessage(`Cambiando a "${sceneName}"…`);

    try {
      await obsService.setScene(sceneName);

      const refreshed = await loadScenes({ silent: true, preserveMessage: true });

      if (!refreshed) {
        throw new Error(
          'La escena fue solicitada, pero no se pudo confirmar el estado actual de OBS.',
        );
      }

      if (currentScene !== sceneName) {
        throw new Error(`OBS no confirmó "${sceneName}" como escena en programa.`);
      }

      setMessage(`"${currentScene}" está ahora en programa.`, 'success');
    } catch (error) {
      setMessage(`No se pudo cambiar la escena: ${error.message}`, 'error');
    } finally {
      sceneChangeInProgress = false;
      render();
      await refreshStatus();
    }
  }

  return {
    isLoaded: () => scenesLoaded,
    loadScenes,
    reset: () => {
      scenesLoaded = false;
    },
  };
}
