import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(serverDirectory, '..', '..');

const {
  GALLERY_ROOT = './gallery',
  HOST = '0.0.0.0',
  PORT = '3000',
  OBS_HOST = '127.0.0.1',
  OBS_PORT = '4455',
  OBS_PASSWORD = '',
  OBS_IMAGE_INPUT = 'OBS_GALLERY_REMOTE',
} = process.env;

export const config = {
  projectRoot,
  galleryRoot: path.resolve(projectRoot, GALLERY_ROOT),
  host: HOST,
  port: Number.parseInt(PORT, 10),
  obsHost: OBS_HOST,
  obsPort: Number.parseInt(OBS_PORT, 10),
  obsPassword: OBS_PASSWORD,
  obsImageInput: OBS_IMAGE_INPUT,
};
