const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '../..');
function fixture({ response, httpStatus = 200 } = {}) {
  const state = {}, calls = [];
  let receive, action, removed;
  const context = vm.createContext({ URL, Date, console, AbortSignal, async fetch(url, options) {
    calls.push(['fetch', url, options]);
    return { ok: httpStatus === 200, status: httpStatus, async json() { return response || { h: { c: 0 }, c: { list: [], is_more: false } }; } };
  } });
  context.importScripts = name => vm.runInContext(fs.readFileSync(path.join(base, name), 'utf8'), context);
  context.chrome = {
    action: { onClicked: { addListener(fn) { action = fn; } } },
    runtime: { onMessage: { addListener(fn) { receive = fn; } } },
    tabs: { async create(options) { calls.push(['create', options]); return { id: 7 }; }, async update(id, options) { calls.push(['update', id, options, Boolean(state['import:7'])]); }, onRemoved: { addListener(fn) { removed = fn; } } },
    storage: { session: { async get(key) { return { [key]: state[key] }; }, async set(data) { Object.assign(state, data); }, async remove(key) { delete state[key]; } } }
  };
  vm.runInContext(fs.readFileSync(path.join(base, 'background.js'), 'utf8'), context);
  const sender = { url: 'https://www.dedao.cn/', tab: { id: 7 } };
  return { state, calls, send: message => new Promise(resolve => receive(message, sender, resolve)), receive, action, removed };
}
test('messages from another origin or without a tab are ignored', () => {
  const f = fixture();
  for (const sender of [{ url: 'https://evil.test/', tab: { id: 7 } }, { url: 'https://www.dedao.cn/' }]) {
    assert.equal(f.receive({ type: 'received-list', uid: 321 }, sender, () => assert.fail('must not respond')), undefined);
  }
  assert.equal(f.calls.length, 0);
});

test('received list uses only the fixed official URL and returns sanitized metadata', async () => {
  const f = fixture({ response: { h: { c: 0 }, c: { list: [{
    authority_intro: { red_packet_rights: true }, article_item: { id: 3543, product_type: 65, product_title: '文章', resource: { secret: 'SECRET' } }, collection_timestamp: 123
  }], is_more: true } } });
  const reply = await f.send({ type: 'received-list', uid: 321, cursor: 456, url: 'https://evil.test' });
  assert.equal(f.calls[0][1], 'https://m.igetget.com/native/api/redPacket/products');
  assert.equal(f.calls[0][2].credentials, 'omit');
  assert.deepEqual(JSON.parse(f.calls[0][2].body), { uid: 321, count: 20, type: 0, max_timestamp: 456 });
  assert.equal(reply.result.items[0].articleId, 3543);
  assert.equal(JSON.stringify(reply).includes('SECRET'), false);
});
test('invalid list context and API failures never become a successful empty list', async () => {
  const f = fixture(); assert.ok((await f.send({ type: 'received-list', uid: '../bad' })).error); assert.equal(f.calls.length, 0);
  assert.ok((await fixture({ httpStatus: 503 }).send({ type: 'received-list', uid: 321 })).error);
  assert.ok((await fixture({ response: { h: { c: 4000 } } }).send({ type: 'received-list', uid: 321 })).error);
});

test('toolbar opens the received list and removed import commands do nothing', async () => {
  const f = fixture(); await f.action();
  assert.equal(f.calls[0][1].url, 'https://www.dedao.cn/#dd-redpacket');
  const count = f.calls.length;
  assert.equal(f.receive({ type: 'import-link', url: 'https://d.dedao.cn/ExamplePacket1234' }, { url: 'https://www.dedao.cn/', tab: { id: 7 } }, () => assert.fail('removed command')), undefined);
  assert.equal(f.calls.length, count);
});
