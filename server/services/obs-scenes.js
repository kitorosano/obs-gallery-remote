import { obsClient } from '../obs/client.js';

export async function listScenes() {
  const result = await obsClient.call('GetSceneList');
  return {
    currentScene: result.currentProgramSceneName,
    scenes: result.scenes.map((scene) => scene.sceneName).reverse(),
  };
}

export async function changeScene(sceneName) {
  await obsClient.call('SetCurrentProgramScene', { sceneName });
  return sceneName;
}
