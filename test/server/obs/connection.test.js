import assert from 'node:assert/strict';
import { after, afterEach, beforeEach, describe, mock, test } from 'node:test';

import { config } from '../../../server/config/config.js';
import { obsClient } from '../../../server/obs/client.js';
import {
  connectObs,
  getObsConnectionState,
  isObsConnected,
  startObsConnection,
} from '../../../server/obs/connection.js';
import {
  addObsEventClient,
  removeObsEventClient,
} from '../../../server/services/obs-events.js';

const originalConnect = obsClient.connect;
const originalPassword = config.obsPassword;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

let timeoutCallback;
let timeoutToken;
let clearedToken;

function installTimerStub() {
  timeoutCallback = undefined;
  timeoutToken = {};
  clearedToken = undefined;
  globalThis.setTimeout = (callback) => {
    timeoutCallback = callback;
    return timeoutToken;
  };
  globalThis.clearTimeout = (token) => {
    clearedToken = token;
  };
}

function restoreTimer() {
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
}

function eventClient() {
  const writes = [];
  const client = { write: (value) => writes.push(value) };
  addObsEventClient(client);

  return {
    client,
    events: () =>
      writes
        .filter((write) => write.startsWith('data: '))
        .map((write) => JSON.parse(write.slice(6))),
  };
}

afterEach(() => {
  obsClient.connect = originalConnect;
  config.obsPassword = originalPassword;

  if (timeoutCallback) restoreTimer();
  obsClient.emit('ConnectionOpened');
});

beforeEach(() => {
  installTimerStub();
  obsClient.emit('ConnectionClosed');
});

after(() => {
  obsClient.connect = originalConnect;
  config.obsPassword = originalPassword;

  obsClient.emit('ConnectionOpened');
  restoreTimer();
});

describe('obs connection', { concurrency: false }, () => {
  test('expone el estado inicial y el estado de conexión', () => {
    const state = getObsConnectionState();

    assert.deepEqual(state, {
      connected: false,
      version: null,
      lastError: null,
      reconnecting: false,
    });
    assert.equal(isObsConnected(), false);
  });

  test('conecta a OBS con la configuración y guarda la versión', async () => {
    const calls = [];
    config.obsPassword = 'secret';
    obsClient.connect = async (...args) => {
      calls.push(args);
      return { obsVersion: '30.2' };
    };

    const result = await connectObs();

    assert.deepEqual(calls, [
      [`ws://${config.obsHost}:${config.obsPort}`, 'secret', { rpcVersion: 1 }],
    ]);
    assert.deepEqual(result, { obsVersion: '30.2' });
    assert.equal(getObsConnectionState().version, '30.2');
    assert.equal(isObsConnected(), true);
  });

  test('usa null cuando OBS no informa una versión', async () => {
    obsClient.connect = async () => ({});

    await connectObs();

    assert.equal(getObsConnectionState().version, null);
  });

  test('reutiliza una conexión existente', async () => {
    obsClient.connect = async () => ({ obsVersion: '30.2' });
    await connectObs();
    const connect = mock.method(obsClient, 'connect');

    assert.deepEqual(await connectObs(), { obsVersion: '30.2' });
    assert.equal(connect.mock.calls.length, 0);
  });

  test('rechaza una segunda conexión mientras la primera está en curso', async () => {
    let resolveConnection;
    obsClient.emit('ConnectionClosed');
    obsClient.connect = () =>
      new Promise((resolve) => {
        resolveConnection = resolve;
      });

    const first = connectObs();
    await assert.rejects(connectObs(), {
      message: 'Ya hay una conexión con OBS en curso.',
    });

    resolveConnection({ obsVersion: '31' });
    await first;
  });

  test('guarda el mensaje de un error y libera el estado de reconexión', async () => {
    obsClient.emit('ConnectionClosed');
    const error = new Error('offline');
    obsClient.connect = async () => {
      throw error;
    };

    await assert.rejects(connectObs(), error);
    assert.deepEqual(getObsConnectionState(), {
      connected: false,
      version: null,
      lastError: 'offline',
      reconnecting: false,
    });
  });

  test('usa un mensaje predeterminado si el error no tiene mensaje', async () => {
    obsClient.emit('ConnectionClosed');
    obsClient.connect = async () => {
      throw {};
    };

    await assert.rejects(connectObs(), () => true);
    assert.equal(
      getObsConnectionState().lastError,
      'No se pudo conectar con OBS.',
    );
  });

  test('usa un mensaje predeterminado si el error es nulo', async () => {
    obsClient.emit('ConnectionClosed');
    obsClient.connect = async () => {
      throw null;
    };

    await assert.rejects(connectObs(), () => true);
    assert.equal(
      getObsConnectionState().lastError,
      'No se pudo conectar con OBS.',
    );
  });

  test('usa un mensaje predeterminado si no hay error', async () => {
    obsClient.emit('ConnectionClosed');
    obsClient.connect = async () => {
      throw undefined;
    };

    await assert.rejects(connectObs(), () => true);
    assert.equal(
      getObsConnectionState().lastError,
      'No se pudo conectar con OBS.',
    );
  });

  test('inicia conexión y no hace nada si ya está conectando o conectado', async () => {
    obsClient.emit('ConnectionOpened');
    await startObsConnection();
    obsClient.emit('ConnectionClosed');

    installTimerStub();
    let resolveConnection;
    obsClient.connect = () =>
      new Promise((resolve) => {
        resolveConnection = resolve;
      });
    const pending = startObsConnection();

    await startObsConnection();
    resolveConnection({ obsVersion: '31' });
    await pending;
  });

  test('programa una reconexión cuando la conexión inicial falla', async () => {
    obsClient.emit('ConnectionOpened');
    installTimerStub();
    obsClient.emit('ConnectionClosed');
    obsClient.connect = async () => {
      throw new Error('offline');
    };

    await startObsConnection();
    assert.equal(typeof timeoutCallback, 'function');

    obsClient.connect = async () => ({ obsVersion: '32' });
    await timeoutCallback();

    assert.equal(isObsConnected(), true);
  });

  test('reintenta y vuelve a programar si la reconexión falla', async () => {
    obsClient.emit('ConnectionOpened');
    installTimerStub();
    obsClient.emit('ConnectionClosed');
    obsClient.connect = async () => {
      throw new Error('still offline');
    };

    await startObsConnection();
    const firstCallback = timeoutCallback;
    await firstCallback();

    assert.equal(typeof timeoutCallback, 'function');
    assert.notEqual(timeoutCallback, firstCallback);
  });

  test('no duplica ni ejecuta una reconexión si ya está conectado', async () => {
    obsClient.emit('ConnectionOpened');
    installTimerStub();
    obsClient.emit('ConnectionClosed');
    obsClient.connect = async () => {
      throw new Error('offline');
    };

    await startObsConnection();
    const callback = timeoutCallback;
    obsClient.emit('ConnectionOpened');

    assert.equal(clearedToken, timeoutToken);

    await callback();

    assert.equal(isObsConnected(), true);
  });

  test('procesa los eventos de conexión, escenas, fuentes, audio y salida', () => {
    const stream = eventClient();

    obsClient.emit('ConnectionOpened');
    obsClient.emit('CurrentProgramSceneChanged', { sceneName: 'Live' });
    obsClient.emit('SceneItemEnableStateChanged', {
      sceneName: 'Live',
      sceneItemId: 7,
      sceneItemEnabled: true,
    });
    obsClient.emit('InputSettingsChanged', { inputName: config.obsImageInput });
    obsClient.emit('InputSettingsChanged', { inputName: 'Other' });
    obsClient.emit('InputMuteStateChanged', {
      inputName: 'Mic',
      inputMuted: true,
    });
    obsClient.emit('InputVolumeChanged', {
      inputName: 'Mic',
      inputVolumeDb: -3,
      inputVolumeMul: 0.7,
    });
    obsClient.emit('StreamStateChanged', {
      outputActive: true,
      outputState: 'OBS_WEBSOCKET_OUTPUT_STARTED',
    });
    obsClient.emit('RecordStateChanged', {
      outputActive: false,
      outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED',
    });

    assert.deepEqual(
      stream.events().map(({ type, data }) => ({ type, data })),
      [
        { type: 'obs-connected', data: { connected: true } },
        { type: 'scene-changed', data: { sceneName: 'Live' } },
        {
          type: 'source-visibility-changed',
          data: { sceneName: 'Live', sceneItemId: 7, enabled: true },
        },
        {
          type: 'gallery-image-changed',
          data: { inputName: config.obsImageInput },
        },
        { type: 'audio-mute-changed', data: { inputName: 'Mic', muted: true } },
        {
          type: 'audio-volume-changed',
          data: { inputName: 'Mic', volumeDb: -3, volumeMul: 0.7 },
        },
        {
          type: 'stream-state-changed',
          data: {
            outputActive: true,
            outputState: 'OBS_WEBSOCKET_OUTPUT_STARTED',
          },
        },
        {
          type: 'record-state-changed',
          data: {
            outputActive: false,
            outputState: 'OBS_WEBSOCKET_OUTPUT_STOPPED',
          },
        },
      ],
    );
    removeObsEventClient(stream.client);
  });

  test('difunde desconexión solo si estaba conectado y procesa eventos de Aitum', () => {
    const stream = eventClient();
    obsClient.emit('ConnectionOpened');
    obsClient.emit('VendorEvent', {
      vendorName: 'other',
      eventType: 'start_output',
    });
    obsClient.emit('VendorEvent', {
      vendorName: 'aitum-stream-suite',
      eventType: 'other',
    });
    obsClient.emit('VendorEvent', {
      vendorName: 'aitum-stream-suite',
      eventType: 'start_output',
    });
    obsClient.emit('VendorEvent', {
      vendorName: 'aitum-stream-suite',
      eventType: 'stop_output',
    });
    obsClient.emit('ConnectionClosed');
    obsClient.emit('ConnectionClosed');

    assert.deepEqual(
      stream.events().map(({ type, data }) => ({ type, data })),
      [
        { type: 'obs-connected', data: { connected: true } },
        { type: 'aitum-output-changed', data: {} },
        { type: 'aitum-output-changed', data: {} },
        { type: 'obs-disconnected', data: { connected: false } },
      ],
    );
    removeObsEventClient(stream.client);
  });

  test('registra errores de OBS con y sin mensaje', () => {
    obsClient.emit('ConnectionError', new Error('websocket failed'));

    assert.equal(getObsConnectionState().lastError, 'websocket failed');

    obsClient.emit('ConnectionError', {});

    assert.equal(
      getObsConnectionState().lastError,
      'Error de conexión con OBS.',
    );
  });
});
