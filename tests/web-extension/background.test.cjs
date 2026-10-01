const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '../..');
function fixture() {
  const state = {}, calls = [];
  let receive, action, removed;
  const context = vm.createContext({ URL, Date, console });
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
test('import marks tab before navigation, and import intent is consumed once', async () => {
  const f = fixture();
  const reply = await f.send({ type: 'import-link', url: 'https://d.dedao.cn/ExamplePacket1234' });
  assert.equal(reply.ok, true);
  assert.equal(f.calls[0][1].url, 'about:blank');
  assert.equal(f.calls[1][3], true);
  assert.equal((await f.send({ type: 'consume-import' })).pending, true);
  assert.equal((await f.send({ type: 'consume-import' })).pending, false);
});
test('invalid URL opens nothing; stale intents and closed tabs are cleared', async () => {
  const f = fixture();
  assert.ok((await f.send({ type: 'import-link', url: 'https://evil.test/' })).error);
  assert.equal(f.calls.length, 0);
  f.state['import:7'] = Date.now() - 130000;
  assert.equal((await f.send({ type: 'consume-import' })).pending, false);
  assert.equal(f.state['import:7'], undefined);
  f.state['import:7'] = Date.now(); await f.removed(7);
  assert.equal(f.state['import:7'], undefined);
});
test('messages from another origin or without a tab are ignored', () => {
  const f = fixture();
  for (const sender of [{ url: 'https://evil.test/', tab: { id: 7 } }, { url: 'https://www.dedao.cn/' }]) {
    assert.equal(f.receive({ type: 'import-link', url: 'https://d.dedao.cn/ExamplePacket1234' }, sender, () => assert.fail('must not respond')), undefined);
  }
  assert.equal(f.calls.length, 0);
});
