import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  addObsEventClient,
  broadcastObsEvent,
  getObsEventClientCount,
  removeObsEventClient,
} from '../../../server/services/obs-events.js';

describe('obs events service', () => {
  test('registra, elimina y transmite a clientes conectados', () => {
    const writes = [];
    const client = { write: (value) => writes.push(value) };
    addObsEventClient(client);
    addObsEventClient(client);
    assert.equal(getObsEventClientCount(), 1);
    broadcastObsEvent('SceneChanged', { scene: 'Live' });
    assert.equal(writes.length, 2);
    assert.equal(writes[0], 'event: obs-event\n');
    const payload = JSON.parse(writes[1].slice(6));
    assert.deepEqual(payload, { type: 'SceneChanged', data: { scene: 'Live' }, timestamp: payload.timestamp });
    removeObsEventClient(client);
    assert.equal(getObsEventClientCount(), 0);
  });

  test('usa datos vacíos por defecto y permite eliminar clientes inexistentes', () => {
    const client = { write() {} };
    removeObsEventClient(client);
    addObsEventClient(client);
    broadcastObsEvent('Ping');
    removeObsEventClient(client);
    assert.equal(getObsEventClientCount(), 0);
  });
});