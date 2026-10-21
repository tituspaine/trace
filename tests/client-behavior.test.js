import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../src/worker.js';

class Element {
  constructor(tag = 'div') {
    this.tag = tag; this.children = []; this.textContent = ''; this.value = ''; this.attributes = {};
    const classes = new Set();
    this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c), toggle(c, force) { const on = force ?? !classes.has(c); if(on) classes.add(c); else classes.delete(c); } };
  }
  append(...elements) { this.children.push(...elements); }
  replaceChildren(...elements) { this.children = elements; }
  setAttribute(name, value) { this.attributes[name] = value; }
  focus() {}
  scrollIntoView() {}
}
const contents = element => [element.textContent, ...element.children.map(contents)].join(' ');
const descendants = element => [element, ...element.children.flatMap(descendants)];
const tick = () => new Promise(resolve => setImmediate(resolve));
function result(overrides = {}) {
  return { query: 'Synthetic', type: 'name', records: [], searched: ['Synthetic registry'], sourceStatus: [{ name: 'Synthetic registry', status: 'completed', records: 0 }], errors: [], limitations: [], unsupported: [], coverageStatus: 'completed', ...overrides };
}
async function app(responseData, navigator = {}) {
  const html = await (await worker.fetch(new Request('https://trace.example/'))).text();
  const nodes = new Map([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new Element()]));
  nodes.get('exportPanel').classList.add('hidden');
  let calls = 0;
  const context = vm.createContext({ document: { getElementById: id => nodes.get(id), createElement: tag => new Element(tag) }, navigator, File, Blob, URL, AbortController, setTimeout, window: { print() {} }, fetch: async () => { calls++; return Response.json(responseData); } });
  new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]).runInContext(context);
  return { nodes, get calls() { return calls; }, async search(query = responseData.query) { nodes.get('q').value = query; nodes.get('search').onsubmit({ preventDefault() {} }); await tick(); } };
}

test('unsupported search is not presented as a completed no-match result', async () => {
  const client = await app(result({ query: 'audit@example.invalid', type: 'email', searched: [], sourceStatus: [], unsupported: ['No collector exists'], coverageStatus: 'unsupported' }));
  await client.search();
  assert.match(contents(client.nodes.get('records')), /This search is not supported/);
  assert.match(client.nodes.get('summary').textContent, /no sources queried/);
  assert.doesNotMatch(contents(client.nodes.get('records')), /No candidate matches/);
});

test('zero values survive rendering and partial results remain retryable', async () => {
  const client = await app(result({ records: [{ name: 'Synthetic University', type: 'organization', worksCount: 0, amount: 0, source: { name: 'Synthetic registry', url: 'https://example.invalid/record' } }], errors: ['Other registry: Synthetic timeout'], coverageStatus: 'partial' }));
  await client.search();
  const rendered = contents(client.nodes.get('records'));
  assert.match(rendered, /Research works\s+0/);
  assert.match(rendered, /Federal award amount\s+0/);
  assert.doesNotMatch(rendered, /Not provided/);
  const retry = descendants(client.nodes.get('records')).find(node => node.tag === 'button' && node.textContent === 'Retry search');
  assert.ok(retry);
  await retry.onclick();
  assert.equal(client.calls, 2);
  await client.search();
  assert.equal(client.calls, 3, 'partial results must not be reused as a complete cached search');
});

test('completed searches still reuse browser-session snapshots', async () => {
  const client = await app(result());
  await client.search(); await client.search();
  assert.equal(client.calls, 1);
});

test('native share cancellation exposes JSON and HTML export alternatives', async () => {
  const client = await app(result(), { canShare: () => true, share: async () => { throw new DOMException('Cancelled', 'AbortError'); } });
  await client.search();
  await client.nodes.get('share').onclick();
  assert.equal(client.nodes.get('exportPanel').classList.contains('hidden'), false);
});
