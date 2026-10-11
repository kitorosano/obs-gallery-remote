import { obsClient } from '../obs/client.js';

export async function listAudioInputs() {
  const { inputs } = await obsClient.call('GetInputList');
  const audioInputs = [];

  for (const input of inputs) {
    try {
      const [{ inputMuted }, volume] = await Promise.all([
        obsClient.call('GetInputMute', { inputName: input.inputName }),
        obsClient.call('GetInputVolume', { inputName: input.inputName }),
      ]);

      audioInputs.push({
        inputName: input.inputName,
        inputKind: input.inputKind,
        muted: inputMuted,
        volumeDb: volume.inputVolumeDb,
        volumeMul: volume.inputVolumeMul,
      });
    } catch {
      // Los inputs sin capacidad de audio no forman parte de este listado.
    }
  }

  return audioInputs;
}

export async function changeInputMute(inputName, muted) {
  await obsClient.call('SetInputMute', { inputName, inputMuted: muted });
  const result = await obsClient.call('GetInputMute', { inputName });
  return { inputName, muted: result.inputMuted };
}

export async function changeInputVolume(inputName, volumeDb) {
  await obsClient.call('SetInputVolume', {
    inputName,
    inputVolumeDb: volumeDb,
  });
  const result = await obsClient.call('GetInputVolume', { inputName });
  return {
    inputName,
    volumeDb: result.inputVolumeDb,
    volumeMul: result.inputVolumeMul,
  };
}
