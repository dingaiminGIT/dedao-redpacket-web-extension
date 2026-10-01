const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '../..');
function fixture({ account = 'account-one', logged = true, fail = false } = {}) {
  const calls = [], replies = [];
  let listener;
  const win = { __INITIAL_STATE__: { uid: logged ? 123 : 0 }, addEventListener(name, fn) { listener = fn; }, postMessage(value) { replies.push(value); } };
  const context = vm.createContext({ window: win, document: { cookie: '' }, location: { origin: 'https://www.dedao.cn', href: 'https://www.dedao.cn/' }, URL, AbortSignal, console,
    async fetch(url, options) {
      calls.push({ url, options });
      const data = url.endsWith('/user/info') ? { uid_hazy: account } : url.endsWith('/recent') ? { list: [], has_more: false } : { is_red_packet_try: true, article_title: '文章', red_packet_expire_day: '10月4日', dd_article_token: 'SECRET', audio: { url: 'SECRET' } };
      return { ok: !fail, status: fail ? 401 : 200, async json() { return { h: { c: 0 }, c: data }; } };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(base, 'core.js'), 'utf8'), context);
  win.DDRedpacketCore = context.DDRedpacketCore;
  vm.runInContext(fs.readFileSync(path.join(base, 'bridge.js'), 'utf8'), context);
  return { calls, replies, win, async send(command, args = {}) { await listener({ source: win, origin: 'https://www.dedao.cn', data: { channel: 'dd-redpacket-request-v1', id: 'test-id', command, args } }); return replies.at(-1); } };
}
test('account mismatch stops the recent request before reading a list', async () => {
  const f = fixture(); const r = await f.send('recent', { account: 'another-account' });
  assert.match(r.error, /账号已切换/); assert.equal(f.calls.length, 1);
});
test('signed-out and HTTP login errors produce actionable errors', async () => {
  assert.match((await fixture({ logged: false }).send('context')).error, /登录/);
  assert.match((await fixture({ fail: true }).send('context')).error, /登录已失效/);
});
test('article responses expose only sanitized metadata, never tokens or media', async () => {
  const f = fixture(); const r = await f.send('article', { enid: 'abcdefgh12345678' });
  assert.equal(r.result.title, '文章'); assert.equal(r.result.status, 'active');
  assert.equal(JSON.stringify(r).includes('SECRET'), false);
  assert.equal(f.calls[0].url, '/pc/bauhinia/pc/article/info');
});
test('unsupported command and invalid article identity do not issue requests', async () => {
  const f = fixture(); assert.ok((await f.send('fetch-anything', { url: 'https://evil.test' })).error);
  assert.ok((await f.send('article', { enid: '../anything' })).error);
  assert.equal(f.calls.length, 0);
});
