import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { obsClient } from '../../../server/obs/client.js';
import { AITUM_VENDOR } from '../../../server/constants/obs.js';
import {
  getOutputs,
  getVersion,
  startAllStreams,
  stopAllStreams,
} from '../../../server/services/obs-aitum.js';

const originalCall = obsClient.call;

afterEach(() => {
  obsClient.call = originalCall;
});

describe('obs aitum service', () => {
  test('envía todas las solicitudes vendor y devuelve responseData', async () => {
    const calls = [];
    obsClient.call = async (...args) => {
      calls.push(args);
      return { responseData: { request: args[1].requestType } };
    };

    assert.deepEqual(await Promise.all([getVersion(), getOutputs(), startAllStreams(), stopAllStreams()]), [
      { request: 'version' },
      { request: 'get_outputs' },
      { request: 'start_all_streams' },
      { request: 'stop_all_streams' },
    ]);
    assert.deepEqual(calls, [
      ['CallVendorRequest', { vendorName: AITUM_VENDOR, requestType: 'version', requestData: {} }],
      ['CallVendorRequest', { vendorName: AITUM_VENDOR, requestType: 'get_outputs', requestData: {} }],
      ['CallVendorRequest', { vendorName: AITUM_VENDOR, requestType: 'start_all_streams', requestData: {} }],
      ['CallVendorRequest', { vendorName: AITUM_VENDOR, requestType: 'stop_all_streams', requestData: {} }],
    ]);
  });
});