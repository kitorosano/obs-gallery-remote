import { obsClient } from '../obs/client.js';

export async function listProgramSources() {
  const sceneResult = await obsClient.call('GetCurrentProgramScene');
  const sceneName = sceneResult.currentProgramSceneName;
  const result = await obsClient.call('GetSceneItemList', {
    sceneName,
  });

  return {
    sceneName,
    sources: result.sceneItems
      .map((item) => ({
        sceneItemId: item.sceneItemId,
        sourceName: item.sourceName,
        sourceType: item.sourceType,
        inputKind: item.inputKind ?? null,
        enabled: item.sceneItemEnabled,
        isGroup: item.isGroup ?? false,
      }))
      .reverse(),
  };
}

export async function setSourceVisibility({ sceneName, sceneItemId, enabled }) {
  await obsClient.call('SetSceneItemEnabled', {
    sceneName,
    sceneItemId,
    sceneItemEnabled: enabled,
  });

  const result = await obsClient.call('GetSceneItemEnabled', {
    sceneName,
    sceneItemId,
  });

  return {
    sceneName,
    sceneItemId,
    enabled: result.sceneItemEnabled,
  };
}
