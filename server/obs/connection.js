import { config } from '../config/config.js';
import {
  AITUM_VENDOR,
  RCP_VERSION,
  RECONNECT_DELAY_MS,
} from '../constants/obs.js';
import { broadcastObsEvent } from '../services/obs-events.js';
import { obsClient } from './client.js';

const state = {
  status: 'disconnected',
  connected: false,
  version: null,
  lastError: null,
  endpoint: null,
};

let connectionConfig = null;
let reconnectTimer = null;
let manuallyDisconnected = false;
let connectionAttemptInProgress = false;

export function getObsConnectionState() {
  return { ...state };
}

export function isObsConnected() {
  return state.connected;
}

function isAuthenticationError(error) {
  return /authentication failed/i.test(error?.message || '');
}

export async function connectObs(
  options = connectionConfig,
  { reconnecting = false } = {},
) {
  if (!options) {
    throw new Error('No hay una configuración de conexión OBS.');
  }

  const { host, port, password } = options;

  if (!host) {
    throw new Error('El host de OBS es obligatorio.');
  }

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('El puerto de OBS no es válido.');
  }

  if (state.connected) {
    return { obsVersion: state.version };
  }

  if (connectionAttemptInProgress) {
    throw new Error('Ya hay una conexión con OBS en curso.');
  }

  connectionConfig = {
    host,
    port,
    password: password || '',
  };

  manuallyDisconnected = false;
  connectionAttemptInProgress = true;

  state.status = reconnecting ? 'reconnecting' : 'connecting';
  state.lastError = null;
  state.endpoint = { host, port };

  try {
    const result = await obsClient.connect(
      `ws://${host}:${port}`,
      password || undefined,
      { rpcVersion: RCP_VERSION },
    );

    const versionInfo = await obsClient.call('GetVersion');

    state.status = 'connected';
    state.connected = true;
    state.version = versionInfo.obsVersion || null;
    state.lastError = null;

    return {
      ...result,
      obsVersion: versionInfo.obsVersion || null,
      obsWebSocketVersion: versionInfo.obsWebSocketVersion || null,
    };
  } catch (error) {
    state.status = 'error';
    state.connected = false;
    state.version = null;
    state.lastError = error?.message || 'No se pudo conectar con OBS.';

    if (isAuthenticationError(error)) {
      manuallyDisconnected = true;
    }

    throw error;
  } finally {
    connectionAttemptInProgress = false;
  }
}

export async function disconnectObs() {
  manuallyDisconnected = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    if (state.connected) {
      await obsClient.disconnect();
    }
  } finally {
    connectionAttemptInProgress = false;

    state.status = 'disconnected';
    state.connected = false;
    state.version = null;
    state.lastError = null;
    state.endpoint = null;

    connectionConfig = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer || manuallyDisconnected || !connectionConfig) return;

  state.status = 'reconnecting';

  console.log(
    `Reintentando conexión con OBS en ${RECONNECT_DELAY_MS / 1000} segundos…`,
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    if (state.connected || manuallyDisconnected || !connectionConfig) return;

    try {
      await connectObs(connectionConfig, { reconnecting: true });
      console.log('Reconexión automática con OBS establecida.');
    } catch {
      scheduleReconnect();
    }
  }, RECONNECT_DELAY_MS);
}

obsClient.on('ConnectionOpened', () => {
  state.connected = true;
  state.lastError = null;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log('Conectado a OBS WebSocket.');
  broadcastObsEvent('obs-connected', { connected: true });
});

obsClient.on('ConnectionClosed', () => {
  const wasConnected = state.connected;

  state.connected = false;
  state.version = null;

  console.log('Conexión con OBS cerrada.');

  if (wasConnected) {
    broadcastObsEvent('obs-disconnected', {
      connected: false,
    });
  }

  if (manuallyDisconnected || !connectionConfig) {
    state.status = 'disconnected';
    return;
  }

  state.status = 'reconnecting';
  scheduleReconnect();
});

obsClient.on('ConnectionError', (error) => {
  state.lastError = error?.message || 'Error de conexión con OBS.';
  console.error('Error de OBS WebSocket:', state.lastError);
});

obsClient.on('CurrentProgramSceneChanged', ({ sceneName }) => {
  broadcastObsEvent('scene-changed', { sceneName });
});

obsClient.on(
  'SceneItemEnableStateChanged',
  ({ sceneName, sceneItemId, sceneItemEnabled }) => {
    broadcastObsEvent('source-visibility-changed', {
      sceneName,
      sceneItemId,
      enabled: sceneItemEnabled,
    });
  },
);

obsClient.on('InputSettingsChanged', ({ inputName }) => {
  if (inputName === config.obsImageInput) {
    broadcastObsEvent('gallery-image-changed', { inputName });
  }
});

obsClient.on('InputMuteStateChanged', ({ inputName, inputMuted }) => {
  broadcastObsEvent('audio-mute-changed', { inputName, muted: inputMuted });
});

obsClient.on('InputVolumeChanged', (event) => {
  broadcastObsEvent('audio-volume-changed', {
    inputName: event.inputName,
    volumeDb: event.inputVolumeDb,
    volumeMul: event.inputVolumeMul,
  });
});

obsClient.on('StreamStateChanged', ({ outputActive, outputState }) => {
  broadcastObsEvent('stream-state-changed', { outputActive, outputState });
});

obsClient.on('RecordStateChanged', ({ outputActive, outputState }) => {
  broadcastObsEvent('record-state-changed', { outputActive, outputState });
});

obsClient.on('VendorEvent', ({ vendorName, eventType }) => {
  if (vendorName !== AITUM_VENDOR) return;

  if (eventType === 'start_output' || eventType === 'stop_output') {
    broadcastObsEvent('aitum-output-changed');
  }
});
