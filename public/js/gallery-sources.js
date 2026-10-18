import { createMessagePresenter, renderEmptyState } from './ui.js';

export function createGallerySources({
  galleryService,
  elements,
  onSourcesChanged,
}) {
  let sources = [];

  const setMessage = createMessagePresenter(elements.sourcesMessage);

  function createSourceCard(source) {
    const card = document.createElement('article');
    card.className = 'gallery-source-card';

    const info = document.createElement('div');
    info.className = 'gallery-source-info';

    const name = document.createElement('strong');
    name.textContent = source.name;

    const sourcePath = document.createElement('span');
    sourcePath.className = 'gallery-source-path';
    sourcePath.textContent = source.path;

    info.append(name, sourcePath);

    const actions = document.createElement('div');
    actions.className = 'gallery-source-actions';

    const enabledLabel = document.createElement('label');
    enabledLabel.className = 'gallery-source-enabled';

    const enabledText = document.createElement('span');
    enabledText.textContent = source.enabled ? 'Activa' : 'Inactiva';

    const switchContainer = document.createElement('span');
    switchContainer.className = 'switch';

    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = source.enabled === true;
    enabled.setAttribute('aria-label', `Activar ${source.name}`);

    const switchTrack = document.createElement('span');
    switchTrack.className = 'switch-track';
    switchTrack.setAttribute('aria-hidden', 'true');

    switchContainer.append(enabled, switchTrack);
    enabledLabel.append(enabledText, switchContainer);

    const renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.className = 'secondary';
    renameButton.textContent = 'Renombrar';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'secondary danger';
    deleteButton.textContent = 'Eliminar';

    enabled.addEventListener('change', async () => {
      const requestedEnabled = enabled.checked;
      enabled.disabled = true;

      try {
        const response = await galleryService.updateSource(source.id, {
          enabled: requestedEnabled,
        });

        const updatedSource = response.source;
        enabled.checked = updatedSource.enabled === true;
        enabledText.textContent = updatedSource.enabled ? 'Activa' : 'Inactiva';

        await refreshAfterChange();

        setMessage(
          updatedSource.enabled ? 'Fuente activada.' : 'Fuente desactivada.',
          'success',
        );
      } catch (error) {
        // Restaurar estado conocido del servidor.
        enabled.checked = source.enabled === true;
        enabledText.textContent = source.enabled ? 'Activa' : 'Inactiva';

        setMessage(
          `No se pudo actualizar la fuente: ${error.message}`,
          'error',
        );
      } finally {
        enabled.disabled = false;
      }
    });

    renameButton.addEventListener('click', async () => {
      const newName = window.prompt('Nuevo nombre de la fuente:', source.name);
      if (newName === null) return;

      const name = newName.trim();
      if (!name || name === source.name) return;

      try {
        await galleryService.updateSource(source.id, { name });
        await refreshAfterChange();
        setMessage('Fuente renombrada.', 'success');
      } catch (error) {
        setMessage(`No se pudo renombrar la fuente: ${error.message}`, 'error');
      }
    });

    deleteButton.addEventListener('click', async () => {
      const confirmed = window.confirm(
        `¿Eliminar la fuente "${source.name}"?\n\nLos archivos del directorio no se eliminarán.`,
      );
      if (!confirmed) return;

      deleteButton.disabled = true;

      try {
        await galleryService.deleteSource(source.id);
        await refreshAfterChange();
        setMessage('Fuente eliminada.', 'success');
      } catch (error) {
        setMessage(`No se pudo eliminar la fuente: ${error.message}`, 'error');

        deleteButton.disabled = false;
      }
    });

    actions.append(enabledLabel, renameButton, deleteButton);
    card.append(info, actions);
    return card;
  }

  function render() {
    elements.sourcesList.replaceChildren();

    if (!sources.length) {
      renderEmptyState(elements.sourcesList, 'No hay fuentes configuradas.');

      return;
    }

    for (const source of sources) {
      elements.sourcesList.append(createSourceCard(source));
    }
  }

  async function load() {
    try {
      const data = await galleryService.sources();
      sources = data.sources ?? [];
      render();
    } catch (error) {
      setMessage(
        `No se pudieron cargar las fuentes: ${error.message}`,
        'error',
      );
    }
  }

  async function refreshAfterChange() {
    await load();

    if (onSourcesChanged) await onSourcesChanged();
  }

  async function addSource({ name, path }) {
    await galleryService.addSource({
      name,
      path,
    });

    await refreshAfterChange();
  }

  return {
    load,
    addSource,
  };
}
