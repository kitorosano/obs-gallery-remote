import assert from 'node:assert/strict';

import { obsClient } from '../server/obs/client.js';

export function response() {
  const result = {
    statusCode: 200,
    body: undefined,
    headers: {},
    ended: false,
  };
  return {
    result,
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(value) {
      result.body = value;
      return this;
    },
    sendFile(file, options) {
      result.file = file;
      result.options = options;
      return this;
    },
    end() {
      result.ended = true;
      return this;
    },
    cookie(name, value, options) {
      result.cookie = { name, value, options };
      return this;
    },
    clearCookie(name, options) {
      result.clearedCookie = { name, options };
      return this;
    },
    setHeader(name, value) {
      result.headers[name] = value;
    },
    flushHeaders() {
      result.flushed = true;
    },
    write(value) {
      result.writes = [...(result.writes || []), value];
    },
  };
}

export function request(overrides = {}) {
  const listeners = {};
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: 'controller-test',
    on(event, listener) {
      listeners[event] = listener;
    },
    close() {
      listeners.close?.();
    },
    ...overrides,
  };
}

export function connectObsForTests() {
  obsClient.emit('ConnectionOpened');
}

export function assertStatus(result, status, body) {
  assert.equal(result.statusCode, status);
  if (body !== undefined) assert.deepEqual(result.body, body);
}
