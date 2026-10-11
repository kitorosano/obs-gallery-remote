import assert from 'node:assert/strict';
import test from 'node:test';

import { createServices } from '../public/js/services.js';
import { formatDuration } from '../public/js/ui.js';

test('formatDuration normaliza valores y produce HH:MM:SS', () => {
  assert.equal(formatDuration(3_661_900), '01:01:01');
  assert.equal(formatDuration(-100), '00:00:00');
  assert.equal(formatDuration('invalid'), '00:00:00');
});

test('createServices encapsula endpoints y serialización JSON', async () => {
  const calls = [];
  const request = async (...args) => {
    calls.push(args);
    return { ok: true };
  };
  const services = createServices(request);

  await services.obs.setMute('Mic', true);
  await services.auth.status();

  assert.deepEqual(calls, [
    ['/api/obs/audio/mute', { method: 'POST', body: JSON.stringify({ inputName: 'Mic', muted: true }) }],
    ['/api/auth/status'],
  ]);
});
