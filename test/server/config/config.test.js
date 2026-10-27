import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

const environmentKeys = [
  'GALLERY_ROOT',
  'HOST',
  'PORT',
  'OBS_HOST',
  'OBS_PORT',
  'OBS_PASSWORD',
  'OBS_IMAGE_INPUT',
  'OBS_STREAM_DELAY_SECONDS',
  'PANEL_PASSWORD',
  'SESSION_SECRET',
];

function importConfig(moduleName, environment = {}) {
  const originalEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );

  for (const key of environmentKeys) {
    if (Object.hasOwn(environment, key)) {
      process.env[key] = environment[key];
    } else {
      delete process.env[key];
    }
  }

  return import(`../../../server/config/config.js?${moduleName}`).finally(
    () => {
      for (const key of environmentKeys) {
        if (originalEnvironment[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = originalEnvironment[key];
        }
      }
    },
  );
}

describe('config', () => {
  test('config usa los valores predeterminados y resuelve las rutas del proyecto', async () => {
    const { config } = await importConfig('defaults');
    const projectRoot = path.resolve(process.cwd());

    assert.deepEqual(config, {
      projectRoot,
      galleryRoot: path.join(projectRoot, 'gallery'),
      host: '0.0.0.0',
      port: 3000,
      obsHost: '127.0.0.1',
      obsPort: 4455,
      obsPassword: '',
      obsImageInput: 'OBS_GALLERY_REMOTE',
      obsStreamDelaySeconds: 0,
      panelPassword: '',
      sessionSecret: '',
    });
  });

  test('config convierte los valores de entorno personalizados', async () => {
    const { config } = await importConfig('custom', {
      GALLERY_ROOT: 'C:\\OBS-Gallery',
      HOST: '192.168.1.20',
      PORT: '8080',
      OBS_HOST: '192.168.1.30',
      OBS_PORT: '4456',
      OBS_PASSWORD: 'obs-password',
      OBS_IMAGE_INPUT: 'Custom Input',
      OBS_STREAM_DELAY_SECONDS: '12',
      PANEL_PASSWORD: 'panel-password',
      SESSION_SECRET: 'session-secret',
    });

    assert.equal(config.projectRoot, path.resolve(process.cwd()));
    assert.equal(
      config.galleryRoot,
      path.resolve(config.projectRoot, 'C:\\OBS-Gallery'),
    );
    assert.equal(config.host, '192.168.1.20');
    assert.equal(config.port, 8080);
    assert.equal(config.obsHost, '192.168.1.30');
    assert.equal(config.obsPort, 4456);
    assert.equal(config.obsPassword, 'obs-password');
    assert.equal(config.obsImageInput, 'Custom Input');
    assert.equal(config.obsStreamDelaySeconds, 12);
    assert.equal(config.panelPassword, 'panel-password');
    assert.equal(config.sessionSecret, 'session-secret');
  });

  test('validateConfig devuelve la configuración válida recibida o la predeterminada', async () => {
    const { config, validateConfig } = await importConfig('valid', {
      PANEL_PASSWORD: 'panel-password',
      SESSION_SECRET: 'session-secret',
    });

    assert.equal(validateConfig(), config);

    const candidate = {
      ...config,
      port: 1,
      obsPort: 65535,
      obsStreamDelaySeconds: 0,
    };
    assert.equal(validateConfig(candidate), candidate);
  });

  test('validateConfig rechaza credenciales ausentes y todos los límites inválidos', async () => {
    const { validateConfig } = await importConfig('invalid');

    const cases = [
      {
        name: 'credenciales ausentes',
        candidate: { port: 3000, obsPort: 4455, obsStreamDelaySeconds: 0 },
        message:
          'Configuración inválida o ausente: PANEL_PASSWORD, SESSION_SECRET.',
      },
      {
        name: 'puerto no entero',
        candidate: {
          panelPassword: 'panel',
          sessionSecret: 'secret',
          port: '3000',
          obsPort: 4455,
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: PORT.',
      },
      {
        name: 'puerto menor que uno',
        candidate: {
          panelPassword: 'panel',
          sessionSecret: 'secret',
          port: 0,
          obsPort: 4455,
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: PORT.',
      },
      {
        name: 'puerto mayor que 65535',
        candidate: {
          panelPassword: 'panel',
          sessionSecret: 'secret',
          port: 65536,
          obsPort: 4455,
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: PORT.',
      },
      {
        name: 'puerto de OBS no entero',
        candidate: {
          panelPassword: 'panel',
          sessionSecret: 'secret',
          port: 3000,
          obsPort: '4455',
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: OBS_PORT.',
      },
      {
        name: 'puerto de OBS menor que uno',
        candidate: {
          panelPassword: 'panel',
          sessionSecret: 'secret',
          port: 3000,
          obsPort: 0,
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: OBS_PORT.',
      },
      {
        name: 'puerto de OBS mayor que 65535',
        candidate: {
          panelPassword: 'panel',
          sessionSecret: 'secret',
          port: 3000,
          obsPort: 65536,
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: OBS_PORT.',
      },
      {
        name: 'retardo no entero',
        candidate: {
          panelPassword: 'panel',
          sessionSecret: 'secret',
          port: 3000,
          obsPort: 4455,
          obsStreamDelaySeconds: '0',
        },
        message: 'Configuración inválida o ausente: OBS_STREAM_DELAY_SECONDS.',
      },
      {
        name: 'retardo negativo',
        candidate: {
          panelPassword: 'panel',
          sessionSecret: 'secret',
          port: 3000,
          obsPort: 4455,
          obsStreamDelaySeconds: -1,
        },
        message: 'Configuración inválida o ausente: OBS_STREAM_DELAY_SECONDS.',
      },
    ];

    for (const { name, candidate, message } of cases) {
      assert.throws(
        () => validateConfig(candidate),
        {
          name: 'Error',
          message,
        },
        name,
      );
    }
  });

  test('validateConfig acumula todas las claves inválidas', async () => {
    const { validateConfig } = await importConfig('all-invalid');

    assert.throws(
      () =>
        validateConfig({
          panelPassword: '',
          sessionSecret: '',
          port: 0,
          obsPort: 65536,
          obsStreamDelaySeconds: -1,
        }),
      {
        message:
          'Configuración inválida o ausente: PANEL_PASSWORD, SESSION_SECRET, PORT, OBS_PORT, OBS_STREAM_DELAY_SECONDS.',
      },
    );
  });
});
