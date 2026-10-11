import assert from 'node:assert/strict';
import test from 'node:test';

import { validateConfig } from '../server/config/config.js';

const validConfig = {
  panelPassword: 'password',
  sessionSecret: 'secret',
  port: 3000,
  obsPort: 4455,
  obsStreamDelaySeconds: 0,
};

test('validateConfig acepta una configuración completa', () => {
  assert.equal(validateConfig(validConfig), validConfig);
});

test('validateConfig informa todos los valores inválidos', () => {
  assert.throws(
    () => validateConfig({ ...validConfig, panelPassword: '', port: NaN, obsPort: 70000 }),
    /PANEL_PASSWORD, PORT, OBS_PORT/,
  );
});
