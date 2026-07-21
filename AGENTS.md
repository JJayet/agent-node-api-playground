# Agent instructions

## Goal

This repository is a deliberately small Node.js playground for coding-agent exercises. Work on one GitHub issue at a time and keep changes focused.

## Quick start

- Requirements: Node.js 22 or newer; Node.js 24 LTS is the recommended local version. There are no runtime dependencies.
- Select the recommended version with `nvm use` when NVM is available.
- Run the API: `npm start`
- Run in watch mode: `npm run dev`
- Run all checks: `npm run check && npm test`
- CI covers Node.js 22 LTS, 24 LTS, and the Node.js 26 Current release line.

## Architecture

- `src/server.js` reads configuration and starts the HTTP server.
- `src/app.js` owns routing and HTTP input/output.
- `src/store.js` owns the in-memory todo collection.
- `test/api.test.js` contains black-box API tests using Node's built-in test runner and `fetch`.

## Working rules

1. Read the selected issue and inspect the relevant code before editing.
2. Add or update a regression test for every behavior change.
3. Prefer Node.js built-ins; do not add a dependency unless it clearly simplifies the issue.
4. Preserve the JSON response shapes unless the issue explicitly changes the API contract.
5. Do not fix unrelated intentional bugs while implementing another issue.
6. Run `npm run check && npm test` before handing off.

## Definition of done

- The issue's acceptance criteria are covered by tests.
- Existing tests still pass.
- Error responses remain JSON.
- The README is updated if an endpoint or setup command changes.
