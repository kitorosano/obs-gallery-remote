import assert from 'node:assert/strict';
import { mock, test } from 'node:test';

const calls = [];
const app = {
  disable(...args) {
    calls.push(['disable', ...args]);
  },
  use(...args) {
    calls.push(['use', ...args]);
  },
  listen(...args) {
    calls.push(['listen', ...args]);
    args[2]();
  },
};

const express = () => app;
express.json = (...args) => {
  calls.push(['json', ...args]);
  return 'json middleware';
};

express.static = (...args) => {
  calls.push(['static', ...args]);
  return 'static middleware';
};

const config = {
  projectRoot: 'C:\\project',
  galleryRoot: 'C:\\gallery',
  port: 3000,
  host: '127.0.0.1',
  obsHost: '127.0.0.1',
  obsPort: 4455,
};

const validateConfig = mock.fn();
const mkdir = mock.fn(async () => {});
const startObsConnection = mock.fn();
const requireAuth = 'auth middleware';
const authRoutes = 'auth routes';
const galleryRoutes = 'gallery routes';
const healthRoutes = 'health routes';
const obsRoutes = 'obs routes';

function moduleUrl(path) {
  return new URL(path, import.meta.url).href;
}

mock.module('express', { defaultExport: express });
mock.module('node:fs/promises', {
  defaultExport: { mkdir },
});
mock.module(moduleUrl('../../server/config/config.js'), {
  namedExports: { config, validateConfig },
});
mock.module(moduleUrl('../../server/obs/connection.js'), {
  namedExports: { startObsConnection },
});
mock.module(moduleUrl('../../server/middleware/auth.middleware.js'), {
  namedExports: { requireAuth },
});
mock.module(moduleUrl('../../server/routes/auth.routes.js'), {
  defaultExport: authRoutes,
});
mock.module(moduleUrl('../../server/routes/gallery.routes.js'), {
  defaultExport: galleryRoutes,
});
mock.module(moduleUrl('../../server/routes/health.routes.js'), {
  defaultExport: healthRoutes,
});
mock.module(moduleUrl('../../server/routes/obs.routes.js'), {
  defaultExport: obsRoutes,
});

test('configura Express, crea la galería e inicia la conexión con OBS', async () => {
  const originalError = console.error;
  const originalLog = console.log;
  const errors = [];
  const logs = [];
  console.error = (...args) => errors.push(args);
  console.log = (...args) => logs.push(args);

  try {
    await import('../../server/index.js');

    assert.deepEqual(calls.slice(0, 9), [
      ['disable', 'x-powered-by'],
      ['json', { limit: '32kb' }],
      ['use', 'json middleware'],
      ['static', 'C:\\project/public'],
      ['use', 'static middleware'],
      ['use', '/api/auth', authRoutes],
      ['use', '/api/health', healthRoutes],
      ['use', '/api/obs', requireAuth, obsRoutes],
      ['use', '/api/gallery', requireAuth, galleryRoutes],
    ]);
    assert.equal(typeof calls[9][1], 'function');
    assert.deepEqual(calls[10].slice(0, 3), ['listen', 3000, '127.0.0.1']);
    assert.equal(typeof calls[10][3], 'function');
    assert.equal(validateConfig.mock.calls.length, 1);
    assert.equal(mkdir.mock.calls.length, 1);
    assert.deepEqual(mkdir.mock.calls[0].arguments, [
      'C:\\gallery',
      { recursive: true },
    ]);
    assert.equal(startObsConnection.mock.calls.length, 1);
    assert.deepEqual(logs, [
      ['OBS Gallery Remote disponible en http://localhost:3000'],
      ['Carpeta de galería: C:\\gallery'],
      ['OBS WebSocket configurado en ws://127.0.0.1:4455'],
      [
        'Conexión OBS: ejecuta POST /api/obs/connect desde la interfaz o una herramienta HTTP.',
      ],
    ]);

    const response = {
      statusCode: undefined,
      body: undefined,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };
    const error = new Error('test error');
    calls[9][1](error, {}, response, {});

    assert.deepEqual(errors.at(-1), [error]);
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, { error: 'Error interno del servidor.' });
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
});
