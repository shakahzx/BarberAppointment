const assert = require('node:assert/strict');
const { once } = require('node:events');
const test = require('node:test');
const { app } = require('../server');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  server.close();
  await once(server, 'close');
});

test('health route reports API and actual database connection state', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.database, 'disconnected');
  assert.ok(body.timestamp);
});

test('private appointments reject requests without a JWT', async () => {
  const response = await fetch(`${baseUrl}/api/appointments/my`);
  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, 'Please log in to continue.');
});

test('admin catalog management rejects requests without a JWT', async () => {
  const response = await fetch(`${baseUrl}/api/services/manage`);
  assert.equal(response.status, 401);
});

test('unknown API paths return a JSON not-found response', async () => {
  const response = await fetch(`${baseUrl}/api/not-a-route`);
  assert.equal(response.status, 404);
  assert.equal((await response.json()).message, 'Route not found.');
});