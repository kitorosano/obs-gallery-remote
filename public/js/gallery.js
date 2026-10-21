import { createMessagePresenter, renderEmptyState } from './ui.js';

const AUTO_SHOW_STORAGE_KEY = 'obs-gallery-auto-show';

export function createGallery({ galleryService, elements, showImage }) {
  let images = [];
  let selectedImage = null;
  let activeCategory = 'Todas';
  let activeSourceId = '';

  elements.autoShow.checked =
    localStorage.getItem(AUTO_SHOW_STORAGE_KEY) === 'true';

  const setMessage = createMessagePresenter(elements.message);

  function renderSources() {
    const sources = new Map();

    for (const image of images) {
      if (image.sourceId && image.sourceName) {
        sources.set(image.sourceId, image.sourceName);
      }
    }

    const previousSourceId = activeSourceId;

    elements.source.replaceChildren();

    const allOption = document.createElement('option');

    allOption.value = '';
    allOption.textContent = 'Todas las fuentes';

    elements.source.append(allOption);

    const sortedSources = [...sources.entries()].sort(([, nameA], [, nameB]) =>
      nameA.localeCompare(nameB, 'es', { sensitivity: 'base' }),
    );

    for (const [id, name] of sortedSources) {
      const option = document.createElement('option');

      option.value = id;
      option.textContent = name;

      elements.source.append(option);
    }

    activeSourceId = sources.has(previousSourceId) ? previousSourceId : '';

    elements.source.value = activeSourceId;
  }

  function renderCategories() {
    const sourceImages = activeSourceId
      ? images.filter((image) => image.sourceId === activeSourceId)
      : images;

    const categories = [
      'Todas',
      ...new Set(sourceImages.map((image) => image.category)),
    ];

    if (!categories.includes(activeCategory)) {
      activeCategory = 'Todas';
    }

    elements.categories.replaceChildren();

    for (const category of categories) {
      const button = document.createElement('button');

      button.className = `category${
        category === activeCategory ? ' active' : ''
      }`;
      button.textContent = category;
      button.addEventListener('click', () => {
        activeCategory = category;
        renderCategories();
        render();
      });

      elements.categories.append(button);
    }
  }

  function filteredImages() {
    const query = elements.search.value.trim().toLocaleLowerCase();

    return images.filter((image) => {
      const sourceMatch = !activeSourceId || image.sourceId === activeSourceId;

      const categoryMatch =
        activeCategory === 'Todas' || image.category === activeCategory;

      const textMatch =
        `${image.name} ${image.filename} ${image.category} ${image.sourceName ?? ''}`
          .toLocaleLowerCase()
          .includes(query);

      return sourceMatch && categoryMatch && textMatch;
    });
  }

  function updateSelection() {
    const selectedId = selectedImage ? String(selectedImage.id) : null;

    elements.gallery.querySelectorAll('.tile').forEach((tile) => {
      const isSelected = tile.dataset.imageId === selectedId;

      tile.classList.toggle('selected', isSelected);
      tile.setAttribute('aria-pressed', String(isSelected));
    });
  }

  function render() {
    const visibleImages = filteredImages();

    elements.gallery.replaceChildren();
    elements.imageCount.textContent = `${visibleImages.length} ${
      visibleImages.length === 1 ? 'imagen' : 'imágenes'
    }`;

    if (!visibleImages.length) {
      renderEmptyState(
        elements.gallery,
        images.length
          ? 'No hay imágenes que coincidan con el filtro.'
          : 'No se encontraron imágenes. Copia archivos a la carpeta gallery y actualiza la galería.',
      );
      return;
    }

    for (const image of visibleImages) {
      const tile = document.createElement('button');
      const isSelected = selectedImage?.id === image.id;

      tile.className = `tile${isSelected ? ' selected' : ''}`;
      tile.dataset.imageId = String(image.id);
      tile.setAttribute('aria-pressed', String(isSelected));

      const imageElement = document.createElement('img');
      imageElement.src = image.previewUrl;
      imageElement.alt = '';
      imageElement.loading = 'lazy';

      const name = document.createElement('span');
      name.className = 'filename';
      name.textContent = image.name;

      const category = document.createElement('span');
      category.className = 'category-label';
      category.textContent = image.category;

      tile.append(imageElement, name, category);

      let longPressTimer = null;
      let longPressActive = false;

      const startLongPress = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) {
          return;
        }

        longPressActive = false;

        longPressTimer = window.setTimeout(() => {
          longPressActive = true;
          tile.classList.add('long-press-preview');
        }, 400);
      };

      const endLongPress = () => {
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }

        if (longPressActive) {
          tile.classList.remove('long-press-preview');
        }
      };

      tile.addEventListener('pointerdown', startLongPress);
      tile.addEventListener('pointerup', endLongPress);
      tile.addEventListener('pointercancel', endLongPress);
      tile.addEventListener('pointerleave', endLongPress);
      tile.addEventListener('click', (event) => {
        if (longPressActive) {
          event.preventDefault();
          longPressActive = false;
          return;
        }

        selectImage(image);
      });
      tile.addEventListener('contextmenu', (event) => {
        event.preventDefault();
      });

      elements.gallery.append(tile);
    }
  }

  function selectImage(image) {
    selectedImage = image;
    elements.preview.src = image.previewUrl;
    elements.preview.hidden = false;
    elements.previewPlaceholder.hidden = true;
    elements.selectedName.textContent = `${image.name} · ${image.category}`;
    elements.showButton.disabled = false;
    updateSelection();

    const obsConnected = document.body.dataset.obsConnected === 'true';

    if (elements.autoShow.checked && obsConnected) {
      showImage(image);
    } else {
      setMessage('Imagen seleccionada. Todavía no se ha enviado a OBS.');
    }
  }

  function selectImageFromObs(imageId) {
    const image = images.find((item) => String(item.id) === String(imageId));
    if (!image) return false;

    selectedImage = image;
    elements.preview.src = image.previewUrl;
    elements.preview.hidden = false;
    elements.previewPlaceholder.hidden = true;
    elements.selectedName.textContent = `${image.name} · ${image.category}`;
    elements.showButton.disabled = false;
    updateSelection();

    setMessage('Imagen sincronizada desde OBS.', 'success');
    return true;
  }

  async function loadGallery() {
    setMessage('');

    try {
      const data = await galleryService.list();
      images = data.images;

      if (
        selectedImage &&
        !images.some((image) => image.id === selectedImage.id)
      ) {
        selectedImage = null;
        elements.preview.hidden = true;
        elements.previewPlaceholder.hidden = false;
        elements.selectedName.textContent = 'Ninguna imagen seleccionada';
        elements.showButton.disabled = true;
      }

      renderSources();
      renderCategories();
      render();
    } catch (error) {
      setMessage(`No se pudo cargar la galería: ${error.message}`, 'error');
    }
  }

  return {
    AUTO_SHOW_STORAGE_KEY,
    getSelectedImage: () => selectedImage,
    loadGallery,
    render,
    selectImageFromObs,
    setMessage,
    setActiveSource(sourceId) {
      activeSourceId = sourceId;

      renderCategories();
      render();
    },
  };
}
