import { createServer } from 'node:http';
import { URL } from 'node:url';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const MAX_BODY_BYTES = 1024 * 1024; // ponytail: fixed cap, raise/config if a real use case needs bigger payloads

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, JSON_HEADERS);
  response.end(JSON.stringify(body));
}

class PayloadTooLargeError extends Error {}

async function readJson(request) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > MAX_BODY_BYTES) {
      throw new PayloadTooLargeError();
    }

    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createApp(store) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { status: 'ok' });
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

        // Known bug: a whitespace-only title passes this validation.
        if (typeof body.title !== 'string' || !body.title) {
          return sendJson(response, 400, { error: 'title is required' });
        }

        return sendJson(response, 201, { data: store.create(body.title) });
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          return sendJson(response, 413, { error: 'request body too large' });
        }

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

    if (request.method === 'PATCH' && todoMatch) {
      try {
        const body = await readJson(request);

        if (typeof body.completed !== 'boolean') {
          return sendJson(response, 400, { error: 'completed must be a boolean' });
        }

        const updated = store.update(Number(todoMatch[1]), body.completed);

        if (!updated) {
          return sendJson(response, 404, { error: 'todo not found' });
        }

        return sendJson(response, 200, { data: updated });
      } catch (error) {
        if (error instanceof PayloadTooLargeError) {
          return sendJson(response, 413, { error: 'request body too large' });
        }

        return sendJson(response, 400, { error: 'invalid JSON body' });
      }
    }

    return sendJson(response, 404, { error: 'route not found' });
  });
}
