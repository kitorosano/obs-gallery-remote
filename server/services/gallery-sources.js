import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config/config.js';
import { SOURCE_FILE_NAME, SOURCE_FOLDER_NAME } from '../constants/gallery.js';

const dataDirectory = path.join(config.projectRoot, SOURCE_FOLDER_NAME);
const sourcesFile = path.join(dataDirectory, SOURCE_FILE_NAME);

async function ensureStorage() {
  await fs.mkdir(dataDirectory, {
    recursive: true,
  });

  try {
    await fs.access(sourcesFile);
  } catch {
    const initialData = {
      sources: [
        {
          id: 'default',
          name: 'Galería local',
          path: config.galleryRoot,
          enabled: true,
        },
      ],
    };

    await writeData(initialData);
  }
}

async function readData() {
  await ensureStorage();

  const content = await fs.readFile(sourcesFile, 'utf8');

  return JSON.parse(content);
}

async function writeData(data) {
  await fs.mkdir(dataDirectory, {
    recursive: true,
  });

  await fs.writeFile(sourcesFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function validateDirectory(directoryPath) {
  const absolutePath = path.resolve(directoryPath);

  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isDirectory()) return null;

    return absolutePath;
  } catch {
    return null;
  }
}

export async function listGallerySources() {
  const data = await readData();

  return data.sources;
}

export async function addGallerySource({ name, path: sourcePath }) {
  const normalizedName = String(name ?? '').trim();
  const normalizedPath = String(sourcePath ?? '').trim();

  if (!normalizedName) {
    throw new Error('El nombre de la fuente es obligatorio.');
  }

  if (!normalizedPath) {
    throw new Error('La ruta de la fuente es obligatoria.');
  }

  const absolutePath = await validateDirectory(normalizedPath);

  if (!absolutePath) {
    throw new Error('El directorio indicado no existe o no es válido.');
  }

  const data = await readData();

  const duplicate = data.sources.some(
    (source) =>
      path.resolve(source.path).toLowerCase() === absolutePath.toLowerCase(),
  );

  if (duplicate) {
    throw new Error('Ese directorio ya está configurado como fuente.');
  }

  const source = {
    id: crypto.randomUUID(),
    name: normalizedName,
    path: absolutePath,
    enabled: true,
  };

  data.sources.push(source);
  await writeData(data);

  return source;
}

export async function updateGallerySource(id, changes) {
  const data = await readData();

  const source = data.sources.find((item) => item.id === id);
  if (!source) return null;

  if (Object.prototype.hasOwnProperty.call(changes, 'name')) {
    const name = String(changes.name ?? '').trim();

    if (!name) {
      throw new Error('El nombre no puede estar vacío.');
    }

    source.name = name;
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'enabled')) {
    if (typeof changes.enabled !== 'boolean') {
      throw new Error('enabled debe ser boolean.');
    }

    source.enabled = changes.enabled;
  }

  await writeData(data);

  return source;
}

export async function removeGallerySource(id) {
  const data = await readData();

  const index = data.sources.findIndex((source) => source.id === id);
  if (index === -1) return false;

  data.sources.splice(index, 1);
  await writeData(data);

  return true;
}
