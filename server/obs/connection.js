import { config } from '../config/config.js';
import { RCP_VERSION, RECONNECT_DELAY_MS } from '../constants/obs.js';
import { broadcastObsEvent } from '../services/obs-events.js';
import { obsClient } from './client.js';

const state = {
  connected: false,
  version: null,
  lastError: null,
  reconnecting: false,
};

let reconnectTimer = null;

export function getObsConnectionState() {
  return { ...state };
}

export function isObsConnected() {
  return state.connected;
}

export async function connectObs() {
  if (state.connected) {
    return { obsVersion: state.version };
  }

  if (state.reconnecting) {
    throw new Error('Ya hay una conexión con OBS en curso.');
  }

  state.reconnecting = true;

  try {
    const result = await obsClient.connect(
      `ws://${config.obsHost}:${config.obsPort}`,
      config.obsPassword || undefined,
      { rpcVersion: RCP_VERSION },
    );

    state.connected = true;
    state.version = result.obsVersion || null;
    state.lastError = null;
    return result;
  } catch (error) {
    state.connected = false;
    state.lastError = error?.message || 'No se pudo conectar con OBS.';
    throw error;
  } finally {
    state.reconnecting = false;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  console.log(
    `Reintentando conexión con OBS en ${RECONNECT_DELAY_MS / 1000} segundos…`,
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (state.connected) return;

    try {
      await connectObs();
      console.log('Reconexión automática con OBS establecida.');
    } catch {
      scheduleReconnect();
    }
  }, RECONNECT_DELAY_MS);
}

export async function startObsConnection() {
  if (state.connected || state.reconnecting) return;

  try {
    console.log('Intentando conexión inicial con OBS…');
    await connectObs();
    console.log('Conexión inicial con OBS establecida.');
  } catch {
    console.log('OBS no está disponible al iniciar el servidor.');
    scheduleReconnect();
  }
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
  if (wasConnected) broadcastObsEvent('obs-disconnected', { connected: false });
  scheduleReconnect();
});

obsClient.on('ConnectionError', (error) => {
  state.lastError = error?.message || 'Error de conexión con OBS.';
  console.error('Error de OBS WebSocket:', state.lastError);
});

obsClient.on('CurrentProgramSceneChanged', ({ sceneName }) => {
  broadcastObsEvent('scene-changed', { sceneName });
});

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
