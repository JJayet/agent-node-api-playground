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

  test('paginates with default page and limit', async () => {
    const response = await fetch(`${baseUrl}/todos`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.meta, { page: 1, limit: 10, total: 3, totalPages: 1 });
  });

  test('paginates with explicit page and limit', async () => {
    const response = await fetch(`${baseUrl}/todos?page=1&limit=2`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.length, 2);
    assert.deepEqual(body.meta, { page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  test('returns the remaining items on the last page', async () => {
    const response = await fetch(`${baseUrl}/todos?page=2&limit=2`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.length, 1);
    assert.deepEqual(body.meta, { page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  test('applies the completed filter before paginating', async () => {
    const response = await fetch(`${baseUrl}/todos?completed=true&page=1&limit=10`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.meta.total, body.data.length);
    assert.ok(body.data.every((todo) => todo.completed === true));
  });

  test('rejects a non-integer page', async () => {
    const response = await fetch(`${baseUrl}/todos?page=abc`);

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /positive integer/);
  });

  test('rejects a zero or negative limit', async () => {
    const response = await fetch(`${baseUrl}/todos?limit=0`);

    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /positive integer/);
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
