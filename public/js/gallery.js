const AUTO_SHOW_STORAGE_KEY = 'obs-gallery-auto-show';

export function createGallery({ api, elements, showImage }) {
  let images = [];
  let selectedImage = null;
  let activeCategory = 'Todas';

  elements.autoShow.checked =
    localStorage.getItem(AUTO_SHOW_STORAGE_KEY) === 'true';

  function setMessage(text = '', type = '') {
    elements.message.textContent = text;
    elements.message.className = `message ${type}`.trim();
  }

  function renderCategories() {
    const categories = [
      'Todas',
      ...new Set(images.map((image) => image.category)),
    ];

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

    if (!categories.includes(activeCategory)) {
      activeCategory = 'Todas';
    }
  }

  function filteredImages() {
    const query = elements.search.value.trim().toLocaleLowerCase();

    return images.filter((image) => {
      const categoryMatch =
        activeCategory === 'Todas' || image.category === activeCategory;
      const textMatch = `${image.name} ${image.filename} ${image.category}`
        .toLocaleLowerCase()
        .includes(query);

      return categoryMatch && textMatch;
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
      const empty = document.createElement('p');

      empty.className = 'muted';
      empty.textContent = images.length
        ? 'No hay imágenes que coincidan con el filtro.'
        : 'No se encontraron imágenes. Copia archivos a la carpeta gallery y actualiza la galería.';
      elements.gallery.append(empty);
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
      tile.addEventListener('click', () => selectImage(image));
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

    if (elements.autoShow.checked) {
      showImage(image);
    } else {
      setMessage('Imagen seleccionada. Todavía no se ha enviado a OBS.');
    }
  }

  async function loadGallery() {
    setMessage('');

    try {
      const data = await api('/api/gallery');
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
    setMessage,
  };
}
