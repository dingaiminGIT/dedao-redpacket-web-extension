const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const base = path.join(__dirname, '../..');
function fixture({ account = 'account-one', logged = true, fail = false, header = { c: 0 }, respond } = {}) {
  const calls = [], replies = [];
  let listener;
  const win = { __INITIAL_STATE__: { uid: logged ? 123 : 0 }, addEventListener(name, fn) { listener = fn; }, postMessage(value) { replies.push(value); } };
  const context = vm.createContext({ window: win, document: { cookie: '' }, location: { origin: 'https://www.dedao.cn', href: 'https://www.dedao.cn/' }, URL, AbortSignal, console,
    async fetch(url, options) {
      calls.push({ url, options });
      const data = respond ? respond(url, JSON.parse(options.body || '{}')) : url.endsWith('/user/info') ? { uid_hazy: account } : url.endsWith('/has') ? { uid: 321 } : { is_red_packet_try: true, article_title: '文章', red_packet_expire_day: '10月4日', dd_article_token: 'SECRET', audio: { url: 'SECRET' } };
      return { ok: !fail, status: fail ? 401 : 200, async json() { return { h: header, c: data }; } };
    }
  });
  vm.runInContext(fs.readFileSync(path.join(base, 'core.js'), 'utf8'), context);
  win.DDRedpacketCore = context.DDRedpacketCore;
  vm.runInContext(fs.readFileSync(path.join(base, 'bridge.js'), 'utf8'), context);
  return { calls, replies, win, async send(command, args = {}) { await listener({ source: win, origin: 'https://www.dedao.cn', data: { channel: 'dd-redpacket-request-v1', id: 'test-id', command, args } }); return replies.at(-1); } };
}
test('account mismatch stops the received-list context before reading a list', async () => {
  const f = fixture(); const r = await f.send('inbox-context', { account: 'another-account' });
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

test('received context obtains the numeric ID from the signed-in group endpoint', async () => {
  const f = fixture(); const reply = await f.send('inbox-context', { account: 'account-one' });
  assert.equal(reply.result.uid, 321);
  assert.equal(f.calls[1].url, '/api/hades/v1/group/has');
  assert.equal(JSON.parse(f.calls[1].options.body).category, 'bauhinia');
});
test('a mapped article with a different numeric identity is rejected', async () => {
  const f = fixture(); const r = await f.send('article', { enid: 'abcdefgh12345678', articleId: 123 });
  assert.match(r.error, /编号不匹配/);
});

test('same-title search results are accepted only after the numeric article ID matches', async () => {
  const f = fixture({ respond(url, body) {
    if (url.includes('searchallarticle')) return { list: [
      { title: '<hl>同名文章</hl>', extra: { token: 'WrongArticle1234' } },
      { title: '同名文章', extra: { token: 'CorrectArticle1234' } }
    ] };
    return { article_id: body.detail_id === 'CorrectArticle1234' ? 3543 : 999, article_title: '同名文章', is_red_packet_try: true };
  } });
  const r = await f.send('article', { articleId: 3543, enid: '', title: '同名文章' });
  assert.equal(r.result.enid, 'CorrectArticle1234'); assert.equal(r.result.articleId, 3543);
  assert.equal(f.calls.length, 3);
});
test('no exact search result leaves the received article unresolved', async () => {
  const f = fixture({ respond() { return { list: [{ title: '不同文章', extra: { token: 'WrongArticle1234' } }] }; } });
  const r = await f.send('article', { articleId: 3543, title: '目标文章' });
  assert.match(r.error, /权益状态不受影响/); assert.equal(f.calls.length, 1);
});

test('explicit no-full-text response is expired rather than a retry, and still checks identity', async () => {
  const f = fixture({ header: { c: 4000, e: '无阅读全文权限' }, respond() { return { article_id: 123, is_red_packet_try: false, dd_article_token: 'SECRET' }; } });
  const reply = await f.send('article', { articleId: 123, enid: 'abcdefgh12345678' });
  assert.equal(reply.result.status, 'expired'); assert.equal(JSON.stringify(reply).includes('SECRET'), false);
  assert.match((await f.send('article', { articleId: 456, enid: 'abcdefgh12345678' })).error, /编号不匹配/);
});
test('other business failures and malformed permission responses cannot revoke rights', async () => {
  for (const [code, data] of [[4000, {}], [4000, { article_id: 123, is_red_packet_try: true }], [5000, { article_id: 123, is_red_packet_try: false }], [0, { article_id: 123 }]]) {
    const f = fixture({ header: { c: code }, respond() { return data; } });
    const reply = await f.send('article', { articleId: 123, enid: 'abcdefgh12345678' });
    assert.ok(reply.error); assert.equal(reply.result, undefined);
  }
  const f = fixture({ header: { c: 4000 }, respond() { return { article_id: 123, is_red_packet_try: false }; } });
  assert.ok((await f.send('context')).error);
});
