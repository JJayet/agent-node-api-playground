import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { createResendMailer } from '../src/mailer.js';

const apiKey = 're_test_secret_key';
const from = 'Playground <noreply@example.com>';
const email = { to: 'user@example.com', subject: 'Hello', text: 'Body' };

let originalFetch;
let originalTimeout;
let calls;

function mockFetch(handler) {
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return handler(url, options);
  };
}

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

beforeEach(() => {
  originalFetch = globalThis.fetch;
  originalTimeout = AbortSignal.timeout;
  calls = [];
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  AbortSignal.timeout = originalTimeout;
});

describe('createResendMailer', () => {
  test('returns an object with an async send method', () => {
    const mailer = createResendMailer({ apiKey, from });
    assert.equal(typeof mailer.send, 'function');
  });

  test('posts the email to Resend and resolves with the id', async () => {
    const timeoutCalls = [];
    let createdSignal;
    AbortSignal.timeout = (ms) => {
      timeoutCalls.push(ms);
      createdSignal = originalTimeout.call(AbortSignal, ms);
      return createdSignal;
    };
    mockFetch(() => jsonResponse(200, { id: 'abc' }));

    const mailer = createResendMailer({ apiKey, from });
    const id = await mailer.send({ ...email, extra: 'ignored' });

    assert.equal(id, 'abc');
    assert.equal(calls.length, 1);
    const [{ url, options }] = calls;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, `Bearer ${apiKey}`);
    assert.equal(options.headers['content-type'], 'application/json');
    assert.deepEqual(JSON.parse(options.body), { from, ...email });
    assert.deepEqual(timeoutCalls, [10000]);
    assert.equal(options.signal, createdSignal);
  });

  test('rejects with the HTTP status and Resend message on non-2xx', async () => {
    mockFetch(() =>
      jsonResponse(422, { statusCode: 422, name: 'validation_error', message: 'Invalid `to` field.' })
    );

    const mailer = createResendMailer({ apiKey, from });

    await assert.rejects(mailer.send(email), (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /422/);
      assert.match(error.message, /Invalid `to` field\./);
      assert.ok(!error.message.includes(apiKey));
      return true;
    });
    assert.equal(calls.length, 1);
  });

  test('never leaks the API key even if Resend echoes it', async () => {
    mockFetch(() => jsonResponse(401, { message: `API key ${apiKey} is invalid` }));

    const mailer = createResendMailer({ apiKey, from });

    await assert.rejects(mailer.send(email), (error) => {
      assert.match(error.message, /401/);
      assert.ok(!error.message.includes(apiKey));
      return true;
    });
  });

  test('rejects with the HTTP status when the error body is not JSON', async () => {
    mockFetch(() => new Response('Bad Gateway', { status: 502 }));

    const mailer = createResendMailer({ apiKey, from });

    await assert.rejects(mailer.send(email), /502/);
  });

  test('propagates network errors', async () => {
    const networkError = new TypeError('fetch failed');
    mockFetch(() => {
      throw networkError;
    });

    const mailer = createResendMailer({ apiKey, from });

    await assert.rejects(mailer.send(email), (error) => error === networkError);
  });

  test('propagates timeout aborts', async () => {
    const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    mockFetch(() => {
      throw timeoutError;
    });

    const mailer = createResendMailer({ apiKey, from });

    await assert.rejects(mailer.send(email), (error) => error.name === 'TimeoutError');
  });
});
