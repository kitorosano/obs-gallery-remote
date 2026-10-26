import {
  DEFAULT_SCREENSHOT_PROFILE,
  SCREENSHOT_PROFILES,
} from '../constants/obs.js';
import { obsClient } from '../obs/client.js';

export async function getProgramScreenshot(
  profileName = DEFAULT_SCREENSHOT_PROFILE,
) {
  const profile =
    SCREENSHOT_PROFILES[profileName] ??
    SCREENSHOT_PROFILES[DEFAULT_SCREENSHOT_PROFILE];

  const sceneResult = await obsClient.call('GetCurrentProgramScene');

  const sceneName = sceneResult.currentProgramSceneName;

  const screenshot = await obsClient.call('GetSourceScreenshot', {
    sourceName: sceneName,
    imageFormat: 'jpg',
    imageWidth: profile.width,
    imageHeight: profile.height,
    imageCompressionQuality: profile.quality,
  });

  return {
    sceneName,
    imageData: screenshot.imageData,
  };
}
