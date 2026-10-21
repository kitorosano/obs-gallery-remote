import { obsClient } from '../obs/client.js';

export async function listAudioInputs() {
  const { inputs } = await obsClient.call('GetInputList');
  const { currentProgramSceneName } = await obsClient.call(
    'GetCurrentProgramScene',
  );
  const sceneInputNames = await getSceneInputNames(currentProgramSceneName);
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
        activeInProgram: sceneInputNames.has(input.inputName),
      });
    } catch {
      // Los inputs sin capacidad de audio no forman parte de este listado.
    }
  }

  return {
    sceneName: currentProgramSceneName,
    inputs: audioInputs,
  };
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

async function getSceneInputNames(sceneName, visitedScenes = new Set()) {
  if (!sceneName || visitedScenes.has(sceneName)) {
    return new Set();
  }
  visitedScenes.add(sceneName);

  const names = new Set();
  let sceneItems;

  try {
    const result = await obsClient.call('GetSceneItemList', {
      sceneName,
    });

    sceneItems = result.sceneItems;
  } catch {
    return names;
  }

  for (const item of sceneItems) {
    if (!item.sceneItemEnabled) continue;

    names.add(item.sourceName);

    /*
     * Si el elemento es otra escena,
     * recorremos también su contenido.
     */
    if (item.sourceType === 'OBS_SOURCE_TYPE_SCENE') {
      const nestedNames = await getSceneInputNames(
        item.sourceName,
        visitedScenes,
      );

      for (const name of nestedNames) {
        names.add(name);
      }

      continue;
    }

    /*
     * Los grupos necesitan una llamada
     * específica en obs-websocket.
     */
    if (item.isGroup) {
      try {
        const groupResult = await obsClient.call('GetGroupSceneItemList', {
          sceneName: item.sourceName,
        });

        for (const groupItem of groupResult.sceneItems) {
          if (groupItem.sceneItemEnabled) {
            names.add(groupItem.sourceName);
          }
        }
      } catch {
        // Un grupo que no pueda consultarse
        // no debe romper todo el mixer.
      }
    }
  }

  return names;
}
