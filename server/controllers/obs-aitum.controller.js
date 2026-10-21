import { obsClient } from '../obs/client.js';
import {
  getOutputs,
  getVersion,
  startAllStreams,
  stopAllStreams,
} from '../services/obs-aitum.js';

export async function getAitumInfo(req, res) {
  try {
    const [version, outputs] = await Promise.all([getVersion(), getOutputs()]);

    res.json({
      available: true,
      version,
      outputs,
    });
  } catch (error) {
    console.error('Error consultando Aitum Multistream:', error);

    res.status(502).json({
      available: false,
      error: error.message,
    });
  }
}

export async function startAllAitumStreams(req, res, next) {
  try {
    const result = await startAllStreams();

    if (!result?.success) {
      const error = new Error(
        result?.error || 'No se pudieron iniciar las transmisiones.',
      );
      error.status = 502;
      throw error;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function stopAllAitumStreams(req, res, next) {
  try {
    const result = await stopAllStreams();

    if (!result?.success) {
      const error = new Error(
        result?.error || 'No se pudieron detener las transmisiones.',
      );
      error.status = 502;
      throw error;
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function getObsOutputList(req, res) {
  try {
    const result = await obsClient.call('GetOutputList');

    res.json(result);
  } catch (error) {
    console.error('Error consultando outputs de OBS:', error);

    res.status(502).json({
      success: false,
      error: error.message,
    });
  }
}
