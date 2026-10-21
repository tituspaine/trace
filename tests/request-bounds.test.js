import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';

const endpoint = 'https://trace.example/api/investigate';
test('rejects oversized streamed JSON even without or with a false Content-Length', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('Must not fetch'); });
  for (const declared of [null, '0']) {
    const bytes = new TextEncoder().encode(JSON.stringify({ q: 'audit@example.invalid', padding: 'x'.repeat(2500) }));
    const body = new ReadableStream({ start(controller) { controller.enqueue(bytes.slice(0,100)); controller.enqueue(bytes.slice(100)); controller.close(); } });
    const headers = { 'content-type': 'application/json' };
    if (declared !== null) headers['content-length'] = declared;
    const response = await worker.fetch(new Request(endpoint, { method: 'POST', headers, body, duplex: 'half' }));
    assert.equal(response.status, 413);
  }
  assert.equal(calls, 0);
});

test('counts UTF-8 bytes rather than characters', async () => {
  const response = await worker.fetch(new Request(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: 'audit@example.invalid', padding: '😀'.repeat(550) }) }));
  assert.equal(response.status, 413);
});

test('preserves bounded valid requests and rejects malformed JSON', async () => {
  const request = body => new Request(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
  const valid = await worker.fetch(request(JSON.stringify({ q: 'audit@example.invalid' })));
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).coverageStatus, 'unsupported');
  assert.equal((await worker.fetch(request('{invalid'))).status, 400);
});
