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

  test('filters completed todos with ?completed=true', async () => {
    const all = await (await fetch(`${baseUrl}/todos`)).json();
    const expectedCount = all.data.filter((todo) => todo.completed === true).length;

    const response = await fetch(`${baseUrl}/todos?completed=true`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.length, expectedCount);
    assert.ok(body.data.every((todo) => todo.completed === true));
  });

  test('filters incomplete todos with ?completed=false', async () => {
    const all = await (await fetch(`${baseUrl}/todos`)).json();
    const expectedCount = all.data.filter((todo) => todo.completed === false).length;

    const response = await fetch(`${baseUrl}/todos?completed=false`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.data.length, expectedCount);
    assert.ok(body.data.every((todo) => todo.completed === false));
  });

  test('rejects an invalid completed value', async () => {
    const response = await fetch(`${baseUrl}/todos?completed=nope`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.ok(body.error);
  });

  test.todo('rejects whitespace-only todo titles');
  test.todo('keeps todo IDs unique after a deletion');
});
