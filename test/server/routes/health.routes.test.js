import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const calls = [];
const router = {
  get(...args) {
    calls.push(['get', ...args]);
  },
};

const getHealth = () => {};

mock.module('express', {
  namedExports: { Router: () => router },
});
mock.module(
  new URL('../../../server/controllers/health.controller.js', import.meta.url),
  {
    namedExports: { getHealth },
  },
);

describe('health.routes', () => {
  test('registra la ruta de health', async () => {
    const { default: routes } =
      await import('../../../server/routes/health.routes.js');

    assert.equal(routes, router);
    assert.deepEqual(calls, [['get', '/', getHealth]]);
  });
});
