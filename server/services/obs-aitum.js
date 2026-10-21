import { AITUM_VENDOR } from '../constants/obs.js';
import { obsClient } from '../obs/client.js';

async function callAitum(requestType, requestData = {}) {
  const result = await obsClient.call('CallVendorRequest', {
    vendorName: AITUM_VENDOR,
    requestType,
    requestData,
  });

  return result.responseData;
}

export async function getVersion() {
  return callAitum('version');
}

export async function getOutputs() {
  return callAitum('get_outputs');
}

export async function startAllStreams() {
  return callAitum('start_all_streams');
}

export async function stopAllStreams() {
  return callAitum('stop_all_streams');
}
