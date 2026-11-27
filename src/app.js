import { createServer } from 'node:http';
import { URL } from 'node:url';

import { openApiSpec } from './openapi.js';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function decodeQueryComponent(raw) {
  // Décode strictement : lève une URIError si une séquence %XX n'est pas de l'UTF-8 valide.
  return raw
    .replaceAll('+', ' ')
    .replace(/(?:%[0-9A-Fa-f]{2})+/g, (sequence) => decodeURIComponent(sequence));
}

function readTextParam(search) {
  const values = [];

  for (const pair of search.replace(/^\?/, '').split('&')) {
    if (!pair) {
      continue;
    }

    const separator = pair.indexOf('=');
    const rawKey = separator === -1 ? pair : pair.slice(0, separator);
    const rawValue = separator === -1 ? '' : pair.slice(separator + 1);
    let key;

    try {
      key = decodeQueryComponent(rawKey);
    } catch {
      continue;
    }

    if (key === 'text') {
      values.push(rawValue);
    }
  }

  if (values.length > 1) {
    return { error: 'text must be provided only once' };
  }

  if (values.length === 0) {
    return { error: 'text is required' };
  }

  let text;

  try {
    text = decodeQueryComponent(values[0]);
  } catch {
    return { error: 'text must be valid UTF-8' };
  }

  return text === '' ? { error: 'text is required' } : { text };
}

export function isPalindrome(text) {
  const chars = Array.from(text);
  return chars.every((char, index) => char === chars[chars.length - 1 - index]);
}

export function createApp(store) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { status: 'ok' });
    }

    if (request.method === 'GET' && url.pathname === '/ping') {
      return sendJson(response, 200, { message: 'pong' });
    }

    if (request.method === 'GET' && url.pathname === '/palindrome') {
      const result = readTextParam(url.search);

      if (result.error) {
        return sendJson(response, 400, { error: result.error });
      }

      return sendJson(response, 200, { data: { palindrome: isPalindrome(result.text) } });
    }

    if (request.method === 'GET' && url.pathname === '/todos') {
      let todos = store.list();

      if (url.searchParams.has('completed')) {
        // Known bug: Boolean('false') is true.
        const completed = Boolean(url.searchParams.get('completed'));
        todos = todos.filter((todo) => todo.completed === completed);
      }

      return sendJson(response, 200, { data: todos });
    }

    if (request.method === 'POST' && url.pathname === '/todos') {
      try {
        const body = await readJson(request);

        if (typeof body.title !== 'string' || !body.title.trim()) {
          return sendJson(response, 400, { error: 'title is required' });
        }

        return sendJson(response, 201, { data: store.create(body.title) });
      } catch {
        return sendJson(response, 400, { error: 'invalid JSON body' });
      }
    }

    const todoMatch = url.pathname.match(/^\/todos\/(\d+)$/);

    if (request.method === 'DELETE' && todoMatch) {
      const removed = store.remove(Number(todoMatch[1]));

      if (!removed) {
        return sendJson(response, 404, { error: 'todo not found' });
      }

      response.writeHead(204);
      return response.end();
    }

    if (request.method === 'GET' && url.pathname === '/openapi.json') {
      return sendJson(response, 200, openApiSpec);
    }

    return sendJson(response, 404, { error: 'route not found' });
  });
}
