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
  OBS_STREAM_DELAY_SECONDS = '0',
  PANEL_PASSWORD = '',
  SESSION_SECRET = '',
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
  obsStreamDelaySeconds: Number.parseInt(OBS_STREAM_DELAY_SECONDS, 10),
  panelPassword: PANEL_PASSWORD,
  sessionSecret: SESSION_SECRET,
};

export function validateConfig(candidate = config) {
  const errors = [];

  if (!candidate.panelPassword) errors.push('PANEL_PASSWORD');
  if (!candidate.sessionSecret) errors.push('SESSION_SECRET');

  if (
    !Number.isInteger(candidate.port) ||
    candidate.port < 1 ||
    candidate.port > 65535
  ) {
    errors.push('PORT');
  }
  if (
    !Number.isInteger(candidate.obsPort) ||
    candidate.obsPort < 1 ||
    candidate.obsPort > 65535
  ) {
    errors.push('OBS_PORT');
  }
  if (
    !Number.isInteger(candidate.obsStreamDelaySeconds) ||
    candidate.obsStreamDelaySeconds < 0
  ) {
    errors.push('OBS_STREAM_DELAY_SECONDS');
  }

  if (errors.length) {
    throw new Error(`Configuración inválida o ausente: ${errors.join(', ')}.`);
  }

  return candidate;
}
