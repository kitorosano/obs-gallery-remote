import { SERVICE_NAME, SERVICE_VERSION } from '../constants/gallery.js';

export function getHealth(_req, res) {
  res.json({ ok: true, service: SERVICE_NAME, version: SERVICE_VERSION });
}
