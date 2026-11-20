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

describe('GET /ping', () => {
  test('répond pong en JSON', async () => {
    const response = await fetch(`${baseUrl}/ping`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.equal(await response.text(), '{"message":"pong"}');
  });

  test('ignore la query string', async () => {
    const response = await fetch(`${baseUrl}/ping?x=1`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { message: 'pong' });
  });

  test('rejette POST et DELETE avec route not found', async () => {
    for (const method of ['POST', 'DELETE']) {
      const response = await fetch(`${baseUrl}/ping`, { method });

      assert.equal(response.status, 404, method);
      assert.deepEqual(await response.json(), { error: 'route not found' });
    }
  });

  test('ne route pas /ping/ avec un slash final', async () => {
    const response = await fetch(`${baseUrl}/ping/`);

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'route not found' });
  });
});

describe('GET /openapi.json', () => {
  test('expose la spécification OpenAPI 3.1', async () => {
    const response = await fetch(`${baseUrl}/openapi.json`);
    const spec = await response.json();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.match(spec.openapi, /^3\.1\.\d+$/);
    assert.deepEqual(Object.keys(spec.paths).sort(), ['/health', '/todos', '/todos/{id}']);
    assert.deepEqual(Object.keys(spec.paths['/todos']).sort(), ['get', 'post']);
    assert.deepEqual(Object.keys(spec.paths['/todos/{id}']), ['delete']);
    assert.equal(spec.paths['/docs'], undefined);
    assert.equal(spec.paths['/openapi.json'], undefined);

    const post = spec.paths['/todos'].post;
    assert.deepEqual(Object.keys(post.responses).sort(), ['201', '400']);
    const bodySchema = post.requestBody.content['application/json'].schema;
    assert.deepEqual(bodySchema.required, ['title']);
    assert.equal(bodySchema.properties.title.minLength, 1);

    const completed = spec.paths['/todos'].get.parameters.find((p) => p.name === 'completed');
    assert.equal(completed.in, 'query');
    assert.equal(completed.schema.type, 'boolean');
    assert.deepEqual(Object.keys(spec.paths['/todos/{id}'].delete.responses).sort(), ['204', '404']);
  });

  test('GET /health répond toujours ok', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(await response.text(), '{"status":"ok"}');
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
