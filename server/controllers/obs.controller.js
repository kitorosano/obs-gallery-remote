import path from 'node:path';
import OBSWebSocket from 'obs-websocket-js';

import { config } from '../constants/config.js';
import { broadcastObsEvent } from '../services/obs-events.js';
import { listImages, resolveImageId } from '../utils/gallery.js';

const obs = new OBSWebSocket();
let obsConnected = false;
let obsVersion = null;
let lastObsError = null;
let reconnectTimer = null;
let reconnecting = false;

const RECONNECT_DELAY_MS = 3000;

async function connectObs() {
  if (obsConnected || reconnecting) return false;

  reconnecting = true;

  try {
    const result = await obs.connect(
      `ws://${config.obsHost}:${config.obsPort}`,
      config.obsPassword || undefined,
      { rpcVersion: 1 },
    );

    obsConnected = true;
    obsVersion = result.obsVersion || null;
    lastObsError = null;

    return result;
  } catch (error) {
    obsConnected = false;
    lastObsError = error?.message || 'No se pudo conectar con OBS.';

    throw error;
  } finally {
    reconnecting = false;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  console.log(
    `Reintentando conexión con OBS en ${RECONNECT_DELAY_MS / 1000} segundos…`,
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    if (obsConnected) return;

    try {
      await connectObs();
      console.log('Reconexión automática con OBS establecida.');
    } catch {
      scheduleReconnect();
    }
  }, RECONNECT_DELAY_MS);
}

export async function startObsConnection() {
  if (obsConnected || reconnecting) return;

  try {
    console.log('Intentando conexión inicial con OBS…');
    await connectObs();
    console.log('Conexión inicial con OBS establecida.');
  } catch (error) {
    console.log('OBS no está disponible al iniciar el servidor.');
    scheduleReconnect();
  }
}

obs.on('ConnectionOpened', () => {
  obsConnected = true;
  lastObsError = null;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log('Conectado a OBS WebSocket.');
  broadcastObsEvent('obs-connected', {
    connected: true,
  });
});
obs.on('ConnectionClosed', () => {
  const wasConnected = obsConnected;

  obsConnected = false;
  obsVersion = null;

  console.log('Conexión con OBS cerrada.');

  if (wasConnected) {
    broadcastObsEvent('obs-disconnected', {
      connected: false,
    });
  }

  scheduleReconnect();
});
obs.on('ConnectionError', (error) => {
  lastObsError = error?.message || 'Error de conexión con OBS.';
  console.error('Error de OBS WebSocket:', lastObsError);
});
obs.on('CurrentProgramSceneChanged', (event) => {
  broadcastObsEvent('scene-changed', {
    sceneName: event.sceneName,
  });
});
obs.on('InputSettingsChanged', (event) => {
  if (event.inputName !== config.obsImageInput) return;

  broadcastObsEvent('gallery-image-changed', {
    inputName: event.inputName,
  });
});
obs.on('InputMuteStateChanged', (event) => {
  broadcastObsEvent('audio-mute-changed', {
    inputName: event.inputName,
    muted: event.inputMuted,
  });
});
obs.on('InputVolumeChanged', (event) => {
  broadcastObsEvent('audio-volume-changed', {
    inputName: event.inputName,
    volumeDb: event.inputVolumeDb,
    volumeMul: event.inputVolumeMul,
  });
});
obs.on('StreamStateChanged', (event) => {
  broadcastObsEvent('stream-state-changed', {
    outputActive: event.outputActive,

    outputState: event.outputState,
  });
});
obs.on('RecordStateChanged', (event) => {
  broadcastObsEvent('record-state-changed', {
    outputActive: event.outputActive,

    outputState: event.outputState,
  });
});

export function getObsStatus(_req, res) {
  res.json({
    connected: obsConnected,
    version: obsVersion,
    host: config.obsHost,
    port: config.obsPort,
    lastError: lastObsError,
  });
}

export async function connectToObs(_req, res) {
  if (obsConnected)
    return res.json({ ok: true, connected: true, version: obsVersion });

  try {
    const result = await connectObs();
    res.json({
      ok: true,
      connected: true,
      version: obsVersion,
      obsWebSocketVersion: result.obsWebSocketVersion || null,
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      connected: false,
      error: lastObsError || 'No se pudo conectar con OBS.',
    });
  }
}

export async function showImage(req, res) {
  const { imageId } = req.body || {};
  if (typeof imageId !== 'string' || !imageId) {
    return res.status(400).json({ error: 'Debes enviar imageId.' });
  }
  if (!obsConnected) {
    return res
      .status(503)
      .json({ error: 'OBS no está conectado. Usa primero /api/obs/connect.' });
  }

  const imagePath = await resolveImageId(config.galleryRoot, imageId);
  if (!imagePath) {
    return res.status(404).json({
      error: 'La imagen seleccionada no existe en la galería autorizada.',
    });
  }

  try {
    await obs.call('SetInputSettings', {
      inputName: config.obsImageInput,
      inputSettings: { file: imagePath },
      overlay: false,
    });
    res.json({
      ok: true,
      message: 'Se envió la imagen a OBS.',
      inputName: config.obsImageInput,
    });
  } catch (error) {
    const message = error?.message || 'No se pudo cambiar la imagen en OBS.';
    res.status(502).json({
      error: message,
      hint: `Verifica que exista una fuente de tipo Image llamada "${config.obsImageInput}" en OBS.`,
    });
  }
}

export async function getCurrentGalleryImage(_req, res) {
  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    const result = await obs.call('GetInputSettings', {
      inputName: config.obsImageInput,
    });

    const file = result.inputSettings?.file;

    if (typeof file !== 'string' || !file) {
      return res.json({
        ok: true,
        matched: false,
        imageId: null,
        file: null,
      });
    }

    const images = await listImages(config.galleryRoot);

    const normalizedFile = path.resolve(file);

    let matchedImage = null;

    for (const image of images) {
      const imagePath = await resolveImageId(config.galleryRoot, image.id);

      if (imagePath && path.resolve(imagePath) === normalizedFile) {
        matchedImage = image;
        break;
      }
    }

    res.json({
      ok: true,
      matched: Boolean(matchedImage),
      imageId: matchedImage?.id ?? null,
      file,
    });
  } catch (error) {
    const message =
      error?.message || 'No se pudo obtener la imagen actual de OBS.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function getScenes(_req, res) {
  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    const result = await obs.call('GetSceneList');

    res.json({
      ok: true,
      currentScene: result.currentProgramSceneName,
      scenes: result.scenes.map((scene) => scene.sceneName),
    });
  } catch (error) {
    const message =
      error?.message || 'No se pudo obtener la lista de escenas de OBS.';

    res.status(502).json({ error: message });
  }
}

export async function setCurrentScene(req, res) {
  const { sceneName } = req.body || {};

  if (typeof sceneName !== 'string' || !sceneName.trim()) {
    return res.status(400).json({
      error: 'Debes enviar sceneName.',
    });
  }

  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    await obs.call('SetCurrentProgramScene', {
      sceneName: sceneName.trim(),
    });

    res.json({
      ok: true,
      currentScene: sceneName.trim(),
    });
  } catch (error) {
    const message = error?.message || 'No se pudo cambiar la escena de OBS.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function getAudioInputs(_req, res) {
  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    const { inputs } = await obs.call('GetInputList');

    const audioInputs = [];

    for (const input of inputs) {
      try {
        const [{ inputMuted }, { inputVolumeDb, inputVolumeMul }] =
          await Promise.all([
            obs.call('GetInputMute', {
              inputName: input.inputName,
            }),

            obs.call('GetInputVolume', {
              inputName: input.inputName,
            }),
          ]);

        audioInputs.push({
          inputName: input.inputName,
          inputKind: input.inputKind,
          muted: inputMuted,
          volumeDb: inputVolumeDb,
          volumeMul: inputVolumeMul,
        });
      } catch {
        /*
         * Si las operaciones de audio fallan para este input,
         * lo ignoramos. Normalmente significa que no tiene
         * capacidad de audio.
         */
      }
    }

    res.json({
      ok: true,
      inputs: audioInputs,
    });
  } catch (error) {
    const message =
      error?.message || 'No se pudieron obtener las fuentes de audio de OBS.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function setInputMute(req, res) {
  const { inputName, muted } = req.body || {};

  if (typeof inputName !== 'string' || !inputName.trim()) {
    return res.status(400).json({
      error: 'Debes enviar inputName.',
    });
  }

  if (typeof muted !== 'boolean') {
    return res.status(400).json({
      error: 'Debes enviar muted como true o false.',
    });
  }

  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  const cleanInputName = inputName.trim();

  try {
    await obs.call('SetInputMute', {
      inputName: cleanInputName,
      inputMuted: muted,
    });

    // Confirmamos el estado real después del cambio.
    const result = await obs.call('GetInputMute', {
      inputName: cleanInputName,
    });

    res.json({
      ok: true,
      inputName: cleanInputName,
      muted: result.inputMuted,
    });
  } catch (error) {
    const message =
      error?.message || 'No se pudo cambiar el estado de audio en OBS.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function setInputVolume(req, res) {
  const { inputName, volumeDb } = req.body || {};

  if (typeof inputName !== 'string' || !inputName.trim()) {
    return res.status(400).json({
      error: 'Debes enviar inputName.',
    });
  }

  if (typeof volumeDb !== 'number' || !Number.isFinite(volumeDb)) {
    return res.status(400).json({
      error: 'Debes enviar volumeDb como número.',
    });
  }

  /*
   * Limitamos deliberadamente el rango que exponemos
   * desde nuestra aplicación.
   */
  if (volumeDb < -60 || volumeDb > 0) {
    return res.status(400).json({
      error: 'volumeDb debe estar entre -60 y 0 dB.',
    });
  }

  const cleanInputName = inputName.trim();

  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    await obs.call('SetInputVolume', {
      inputName: cleanInputName,
      inputVolumeDb: volumeDb,
    });

    /*
     * No confiamos solamente en que SetInputVolume
     * haya terminado correctamente.
     *
     * Volvemos a consultar OBS para devolver el
     * valor realmente aplicado.
     */
    const result = await obs.call('GetInputVolume', {
      inputName: cleanInputName,
    });

    res.json({
      ok: true,
      inputName: cleanInputName,
      volumeDb: result.inputVolumeDb,
      volumeMul: result.inputVolumeMul,
    });
  } catch (error) {
    const message =
      error?.message || 'No se pudo cambiar el volumen de la fuente en OBS.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function getOutputStatus(_req, res) {
  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    const [stream, record] = await Promise.all([
      obs.call('GetStreamStatus'),
      obs.call('GetRecordStatus'),
    ]);

    res.json({
      ok: true,

      stream: {
        active: stream.outputActive,
        reconnecting: stream.outputReconnecting,
        timecode: stream.outputTimecode,
        durationMs: stream.outputDuration,
        congestion: stream.outputCongestion,
        delaySeconds: config.obsStreamDelaySeconds,
      },

      record: {
        active: record.outputActive,
        paused: record.outputPaused,
        timecode: record.outputTimecode,
        durationMs: record.outputDuration,
      },
    });
  } catch (error) {
    const message =
      error?.message || 'No se pudo obtener el estado de emisión de OBS.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function startStream(_req, res) {
  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    const current = await obs.call('GetStreamStatus');

    if (current.outputActive) {
      return res.status(409).json({
        error: 'La transmisión ya está activa.',
      });
    }

    await obs.call('StartStream');

    const result = await obs.call('GetStreamStatus');

    res.json({
      ok: true,
      active: result.outputActive,
      reconnecting: result.outputReconnecting,
      timecode: result.outputTimecode,
      durationMs: result.outputDuration,
      congestion: result.outputCongestion,
    });
  } catch (error) {
    const message = error?.message || 'No se pudo iniciar la transmisión.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function stopStream(_req, res) {
  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    const current = await obs.call('GetStreamStatus');

    if (!current.outputActive) {
      return res.status(409).json({
        error: 'La transmisión no está activa.',
      });
    }

    await obs.call('StopStream');

    const result = await obs.call('GetStreamStatus');

    res.json({
      ok: true,
      active: result.outputActive,
      reconnecting: result.outputReconnecting,
      timecode: result.outputTimecode,
      durationMs: result.outputDuration,
      congestion: result.outputCongestion,
    });
  } catch (error) {
    const message = error?.message || 'No se pudo detener la transmisión.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function startRecord(_req, res) {
  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    const current = await obs.call('GetRecordStatus');

    if (current.outputActive) {
      return res.status(409).json({
        error: 'La grabación ya está activa.',
      });
    }

    await obs.call('StartRecord');

    const result = await obs.call('GetRecordStatus');

    res.json({
      ok: true,
      active: result.outputActive,
      paused: result.outputPaused,
      timecode: result.outputTimecode,
      durationMs: result.outputDuration,
    });
  } catch (error) {
    const message = error?.message || 'No se pudo iniciar la grabación.';

    res.status(502).json({
      error: message,
    });
  }
}

export async function stopRecord(_req, res) {
  if (!obsConnected) {
    return res.status(503).json({
      error: 'OBS no está conectado. Usa primero /api/obs/connect.',
    });
  }

  try {
    const current = await obs.call('GetRecordStatus');

    if (!current.outputActive) {
      return res.status(409).json({
        error: 'La grabación no está activa.',
      });
    }

    const stopped = await obs.call('StopRecord');

    const result = await obs.call('GetRecordStatus');

    res.json({
      ok: true,
      active: result.outputActive,
      paused: result.outputPaused,
      timecode: result.outputTimecode,
      durationMs: result.outputDuration,
      outputPath: stopped.outputPath || null,
    });
  } catch (error) {
    const message = error?.message || 'No se pudo detener la grabación.';

    res.status(502).json({
      error: message,
    });
  }
}
