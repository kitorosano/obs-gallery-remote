import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';

const environmentKeys = [
  'GALLERY_ROOT',
  'HOST',
  'PORT',
  'OBS_IMAGE_INPUT',
  'OBS_STREAM_DELAY_SECONDS',
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
      obsImageInput: 'OBS_GALLERY_REMOTE',
      obsStreamDelaySeconds: 0,
    });
  });

  test('config convierte los valores de entorno personalizados', async () => {
    const { config } = await importConfig('custom', {
      GALLERY_ROOT: 'C:\\OBS-Gallery',
      HOST: '192.168.1.20',
      PORT: '8080',
      OBS_IMAGE_INPUT: 'Custom Input',
      OBS_STREAM_DELAY_SECONDS: '12',
    });

    assert.equal(config.projectRoot, path.resolve(process.cwd()));
    assert.equal(
      config.galleryRoot,
      path.resolve(config.projectRoot, 'C:\\OBS-Gallery'),
    );
    assert.equal(config.host, '192.168.1.20');
    assert.equal(config.port, 8080);
    assert.equal(config.obsImageInput, 'Custom Input');
    assert.equal(config.obsStreamDelaySeconds, 12);
  });

  test('validateConfig devuelve la configuración válida recibida o la predeterminada', async () => {
    const { config, validateConfig } = await importConfig('valid', {});

    assert.equal(validateConfig(), config);

    const candidate = {
      ...config,
      port: 1,
      obsStreamDelaySeconds: 0,
    };
    assert.equal(validateConfig(candidate), candidate);
  });

  test('validateConfig rechaza credenciales ausentes y todos los límites inválidos', async () => {
    const { validateConfig } = await importConfig('invalid');

    const cases = [
      {
        name: 'puerto no entero',
        candidate: {
          port: '3000',
          obsPort: 4455,
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: PORT.',
      },
      {
        name: 'puerto menor que uno',
        candidate: {
          port: 0,
          obsPort: 4455,
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: PORT.',
      },
      {
        name: 'puerto mayor que 65535',
        candidate: {
          port: 65536,
          obsPort: 4455,
          obsStreamDelaySeconds: 0,
        },
        message: 'Configuración inválida o ausente: PORT.',
      },
      {
        name: 'retardo no entero',
        candidate: {
          port: 3000,
          obsPort: 4455,
          obsStreamDelaySeconds: '0',
        },
        message: 'Configuración inválida o ausente: OBS_STREAM_DELAY_SECONDS.',
      },
      {
        name: 'retardo negativo',
        candidate: {
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
          port: 0,
          obsPort: 65536,
          obsStreamDelaySeconds: -1,
        }),
      {
        message:
          'Configuración inválida o ausente: PORT, OBS_STREAM_DELAY_SECONDS.',
      },
    );
  });
});
