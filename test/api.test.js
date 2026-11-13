import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { createApp } from '../src/app.js';
import { createTodoStore } from '../src/store.js';

let app;
let baseUrl;

before(async () => {
  app = createApp(createTodoStore());
  await new Promise((resolve, reject) => {
    app.once('error', reject);
    app.listen(0, '127.0.0.1', resolve);
  });
  const { port } = app.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

after(() => app.close());

describe('GET /health', () => {
  test('reports that the API is healthy', async () => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });
});

describe('todos', () => {
  test('lists the seeded todos', async () => {
    const response = await fetch(`${baseUrl}/todos`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.length, 3);
  });

  test('creates a todo', async () => {
    const response = await fetch(`${baseUrl}/todos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Write a regression test' })
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.data.title, 'Write a regression test');
    assert.equal(body.data.completed, false);
  });

  test('rejects malformed JSON', async () => {
    const response = await fetch(`${baseUrl}/todos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{'
    });

    assert.equal(response.status, 400);
  });

  test.todo('filters incomplete todos with ?completed=false');
  test.todo('rejects whitespace-only todo titles');
  test.todo('keeps todo IDs unique after a deletion');
});

describe('GET /todos pagination', () => {
  let paginatedApp;
  let paginatedUrl;

  before(async () => {
    paginatedApp = createApp(createTodoStore());
    await new Promise((resolve) => paginatedApp.listen(0, '127.0.0.1', resolve));
    paginatedUrl = `http://127.0.0.1:${paginatedApp.address().port}`;
  });

  after(() => paginatedApp.close());

  const get = async (query) => {
    const response = await fetch(`${paginatedUrl}/todos${query}`);
    return { status: response.status, body: await response.json() };
  };

  test('uses page=1 and limit=10 by default', async () => {
    const { status, body } = await get('');

    assert.equal(status, 200);
    assert.equal(body.data.length, 3);
    assert.deepEqual(body.meta, { page: 1, limit: 10, total: 3, totalPages: 1 });
  });

  test('returns the requested page with its metadata', async () => {
    const first = await get('?page=1&limit=2');
    const second = await get('?page=2&limit=2');

    assert.deepEqual(first.body.data.map((todo) => todo.id), [1, 2]);
    assert.deepEqual(first.body.meta, { page: 1, limit: 2, total: 3, totalPages: 2 });
    assert.deepEqual(second.body.data.map((todo) => todo.id), [3]);
    assert.deepEqual(second.body.meta, { page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  test('returns an empty page beyond the last one', async () => {
    const { status, body } = await get('?page=5&limit=2');

    assert.equal(status, 200);
    assert.deepEqual(body.data, []);
    assert.equal(body.meta.total, 3);
  });

  test('applies the completed filter before paginating', async () => {
    const { body } = await get('?completed=true&page=1&limit=1');

    assert.deepEqual(body.data.map((todo) => todo.id), [1]);
    assert.deepEqual(body.meta, { page: 1, limit: 1, total: 1, totalPages: 1 });
  });

  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=', 'limit=0', 'limit=-2', 'limit=x', 'limit=1e1']) {
    test(`rejects ?${query} with a JSON 400`, async () => {
      const { status, body } = await get(`?${query}`);

      assert.equal(status, 400);
      assert.equal(typeof body.error, 'string');
    });
  }
});
