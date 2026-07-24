import { createServer } from 'node:http';
import { URL } from 'node:url';

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

export function createApp(store) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');

    if (request.method === 'GET' && url.pathname === '/health') {
      return sendJson(response, 200, { status: 'ok' });
    }

    if (request.method === 'GET' && url.pathname === '/todos') {
      let todos = store.list();

      if (url.searchParams.has('completed')) {
        const rawCompleted = url.searchParams.get('completed');

        if (rawCompleted !== 'true' && rawCompleted !== 'false') {
          return sendJson(response, 400, { error: 'completed must be "true" or "false"' });
        }

        const completed = rawCompleted === 'true';
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

    return sendJson(response, 404, { error: 'route not found' });
  });
}
