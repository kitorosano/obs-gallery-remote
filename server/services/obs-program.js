import {
  SCREENSHOT_HEIGHT,
  SCREENSHOT_QUALITY,
  SCREENSHOT_WIDTH,
} from '../constants/obs.js';
import { obsClient } from '../obs/client.js';

export async function getProgramScreenshot() {
  const sceneResult = await obsClient.call('GetCurrentProgramScene');

  const sceneName = sceneResult.currentProgramSceneName;

  const screenshot = await obsClient.call('GetSourceScreenshot', {
    sourceName: sceneName,
    imageFormat: 'jpg',
    imageWidth: SCREENSHOT_WIDTH,
    imageHeight: SCREENSHOT_HEIGHT,
    imageCompressionQuality: SCREENSHOT_QUALITY,
  });

  return {
    sceneName,
    imageData: screenshot.imageData,
  };
}
