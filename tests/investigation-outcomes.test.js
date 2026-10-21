import test from 'node:test';
import assert from 'node:assert/strict';
import { investigate } from '../src/worker.js';

test('generic network and parser errors are attributed to the attempted source', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Network unavailable'); });
  const result = await investigate('Synthetic');
  assert.equal(result.coverageStatus, 'failed');
  assert.equal(result.sourceStatus[0].status, 'failed');
  assert.match(result.errors[0], /^GLEIF public LEI registry: Network unavailable$/);
});

test('successful empty responses differ from unavailable sources', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: [] }));
  const result = await investigate('Synthetic');
  assert.equal(result.coverageStatus, 'completed');
  assert.deepEqual(result.records, []);
  assert.deepEqual(result.errors, []);
  assert.equal(result.sourceStatus[0].records, 0);
});

test('partial results retain explicit independent source outcomes', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.includes('gleif.org')) return Response.json({ data: [{ attributes: { lei: 'SYNTHETIC', entity: { legalName: { name: 'Synthetic University' } } } }] });
    if (url.includes('openalex.org')) throw new DOMException('Synthetic timeout', 'AbortError');
    if (url.includes('usaspending.gov')) return Response.json({ results: [] });
    throw new Error('Unexpected upstream');
  });
  const result = await investigate('Synthetic University');
  assert.equal(result.coverageStatus, 'partial');
  assert.equal(result.records.length, 1);
  assert.deepEqual(result.sourceStatus.map(x => x.status), ['completed', 'failed', 'completed']);
  assert.match(result.errors[0], /^OpenAlex research institution directory:/);
});

test('institution candidates must contain every query word', async t => {
  t.mock.method(globalThis, 'fetch', async url => {
    if (url.includes('gleif.org')) return Response.json({ data: [] });
    if (url.includes('openalex.org')) return Response.json({ results: [
      { id: 'https://openalex.org/I1', display_name: 'Synthetic University', works_count: 0 },
      { id: 'https://openalex.org/I2', display_name: 'Unrelated University' }
    ] });
    if (url.includes('usaspending.gov')) return Response.json({ results: [] });
    throw new Error('Unexpected upstream');
  });
  const result = await investigate('Synthetic University');
  assert.deepEqual(result.records.map(x => x.name), ['Synthetic University']);
  assert.equal(result.sourceStatus[1].records, 1);
});

test('unsupported identifiers and property addresses do not query organization providers', async t => {
  let calls = 0;
  t.mock.method(globalThis, 'fetch', async () => { calls++; throw new Error('Must not fetch'); });
  for (const query of ['audit@example.invalid', '123 Example LLC Road', '+1 555 010 0200']) {
    const result = await investigate(query);
    assert.equal(result.coverageStatus, 'unsupported');
    assert.deepEqual(result.searched, []);
    assert.ok(result.unsupported.length);
  }
  assert.equal(calls, 0);
});

test('malformed successful upstream payloads are not reported as completed empty searches', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ unexpected: true }));
  const result = await investigate('Synthetic');
  assert.equal(result.coverageStatus, 'failed');
  assert.match(result.errors[0], /Invalid registry response/);
});
