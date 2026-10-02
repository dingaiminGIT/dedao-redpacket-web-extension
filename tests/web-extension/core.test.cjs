const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../core.js');
const id = 'ExampleArticle12345678';
test('purchased or trial-only content never masquerades as an active redpacket', () => {
  for (const raw of [{ is_buy: 1, is_red_packet_try: false }, { is_user_free_try: true, is_red_packet_try: false }]) assert.equal(C.article(raw, { enid: id }).status, 'expired');
  for (const raw of [{ is_buy: 1 }, { is_user_free_try: true }, {}]) assert.throws(() => C.article(raw, { enid: id }), /权益字段缺失/);
});
test('official expiry label is preserved while a known elapsed deadline revokes active status', () => {
  const raw = { is_red_packet_try: true, red_packet_expire_day: '10月4日', article_info: { red_packet_expire_time: '2026-10-04T16:00:00Z' } };
  assert.equal(C.article(raw, { enid: id }, Date.parse('2026-10-01')).status, 'active');
  assert.equal(C.article(raw, { enid: id }, Date.parse('2026-10-05')).status, 'expired');
  assert.equal(C.article(raw, { enid: id }).expiresOn, '10月4日');
  assert.equal(C.article({ is_red_packet_try: true }, { enid: id }).expireAt, 0);
});
test('pagination stops at end and rejects repeated or malformed cursors', () => {
  assert.equal(C.nextCursor({ has_more: false }, 0, new Set()), null);
  assert.equal(C.nextCursor({ has_more: true, timestamp: 123 }, 0, new Set()), 123);
  for (const stamp of [0, -1, Infinity, undefined, {}, 123, '123']) assert.throws(() => C.nextCursor({ has_more: true, timestamp: stamp }, 123, new Set()));
  assert.throws(() => C.nextCursor({ has_more: true, timestamp: 123 }, 456, new Set(['123'])));
});
test('article metadata uses class_info.name when the API returns an empty class_title', () => {
  assert.equal(C.article({ is_red_packet_try: true, class_title: '', class_info: { name: '商业参考' } }, { enid: id }).course, '商业参考');
});
test('merging deduplicates articles and preserves manual provenance', () => {
  const result = C.merge([{ enid: id, manual: true, status: 'active' }], [{ enid: id, manual: false, status: 'expired' }]);
  assert.equal(result.length, 1); assert.equal(result[0].manual, true); assert.equal(result[0].status, 'expired');
});
test('stale panels do not overwrite newer verification, and cache drops unexpected fields', () => {
  const result = C.merge([{ enid: id, status: 'expired', checkedAt: 200 }], [{ enid: id, status: 'active', checkedAt: 100, manual: true }]);
  assert.equal(result[0].status, 'expired'); assert.equal(result[0].manual, true);
  const clean = C.cachedItem({ ...result[0], token: 'secret', html: '<div>secret</div>', expireAt: Infinity });
  assert.equal(clean.token, undefined); assert.equal(clean.html, undefined); assert.equal(clean.expireAt, 0);
  assert.equal(C.cachedItem({ enid: '../bad' }), null);
});
test('filtering and sorting handle unknown dates without pretending they expire first', () => {
  const rows = [{ enid: 'aaaaaaaa', title: 'AI', course: '商业', status: 'active', expireAt: 0, seenAt: 4 }, { enid: 'bbbbbbbb', title: 'AI模型', course: '商业', status: 'active', expireAt: 10, seenAt: 1 }, { enid: 'cccccccc', title: '心理', course: '心理学', status: 'expired', expireAt: 5, seenAt: 3 }];
  assert.deepEqual(C.filter(rows, { query: 'ai', course: '商业' }).map(r => r.enid), ['bbbbbbbb', 'aaaaaaaa']);
  assert.equal(C.filter(rows, { status: 'all' }).length, 3);
  assert.equal(C.filter(rows, { sort: 'recent' })[0].enid, 'aaaaaaaa');
});
test('auto refresh uses successful full scans with five-minute freshness and one-minute retry backoff', () => {
  const now = 1000000;
  assert.equal(C.shouldAutoRefresh(0, 0, now), true);
  assert.equal(C.shouldAutoRefresh(now - 299999, 0, now), false);
  assert.equal(C.shouldAutoRefresh(now - 300000, 0, now), true);
  assert.equal(C.shouldAutoRefresh(0, now - 59999, now), false);
  assert.equal(C.shouldAutoRefresh(0, now - 60000, now), true);
  assert.equal(C.shouldAutoRefresh(0, undefined, now), true);
  assert.equal(C.shouldAutoRefresh(Infinity, NaN, now), true);
  assert.equal(C.shouldAutoRefresh(now + 10000, now + 10000, now), true);
});

test('received list includes never-studied course redpackets and preserves unresolved identity', () => {
  const row = { authority_intro: { red_packet_rights: true }, product_title: '课程', collection_timestamp: 123,
    article_item: { id: 3543, product_type: 65, product_title: '文章', enid: '', progress_intro: { progress: 0 } } };
  const page = C.receivedPage({ list: [row], is_more: true });
  assert.equal(page.items.length, 1); assert.equal(page.items[0].articleId, 3543);
  assert.equal(page.timestamp, 123); assert.equal(page.has_more, true);
  assert.equal(C.cachedItem(page.items[0]).status, 'active');
  assert.equal(C.received({ ...row, authority_intro: { red_packet_rights: false } }).status, 'expired');
  assert.throws(() => C.received({ ...row, authority_intro: {} }), /权益字段缺失/);
  assert.equal(C.received({ ...row, article_item: { ...row.article_item, product_type: 1013 } }), null);
});
test('resolving a received article and reloading its numeric seed never creates duplicates', () => {
  const raw = { articleId: 3543, enid: '', title: '文章', status: 'unknown' };
  const resolved = { ...raw, enid: 'abcdefgh12345678', status: 'active', checkedAt: 100 };
  const list = C.merge(C.merge([raw], [resolved]), [raw]);
  assert.equal(list.length, 1); assert.equal(list[0].enid, resolved.enid); assert.equal(list[0].status, 'active');
  assert.equal(C.merge([{ enid: resolved.enid, manual: true }], [resolved]).length, 1);
});

test('bounded verification renders fast completions before a slow first request', async () => {
  const release = new Map(), completed = []; let active = 0, peak = 0;
  const running = C.runLimited([0, 1, 2, 3], 2, async id => {
    active++; peak = Math.max(peak, active);
    await new Promise(resolve => release.set(id, resolve));
    active--; completed.push(id);
  });
  assert.equal(active, 2);
  release.get(1)(); await new Promise(setImmediate);
  assert.deepEqual(completed, [1]); assert.equal(active, 2);
  release.get(2)(); await new Promise(setImmediate);
  release.get(3)(); release.get(0)(); await running;
  assert.equal(peak, 2); assert.equal(completed.length, 4);
});
test('stopping verification finishes in-flight work without launching the rest', async () => {
  let stop = false; const started = [], release = [];
  const running = C.runLimited([0, 1, 2, 3], 2, async id => {
    started.push(id); await new Promise(resolve => release.push(resolve));
  }, () => stop);
  stop = true; release.forEach(done => done()); await running;
  assert.deepEqual(started, [0, 1]);
});
test('completion follows App finished/progress fields and persists through article verification', () => {
  const row = { authority_intro: { red_packet_rights: true }, article_item: { id: 123, product_type: 65, product_title: '文章', is_finished: 0, progress_intro: { progress: 0 } } };
  assert.equal(C.received(row).completed, false);
  assert.equal(C.received({ ...row, is_finished: 1 }).completed, true);
  assert.equal(C.received({ ...row, article_item: { ...row.article_item, is_finished: 1 } }).completed, true);
  const seed = C.received({ ...row, article_item: { ...row.article_item, progress_intro: { progress: 100 } } });
  const item = C.article({ is_red_packet_try: true, article_info: { audio: { listen_finished: false } } }, { ...seed, enid: id });
  assert.equal(C.cachedItem(item).completed, true);
  assert.equal(C.article({ is_red_packet_try: true, article_info: { is_read: true } }, { enid: id }).completed, null);
  assert.equal(C.article({ is_red_packet_try: true, article_info: { audio: { listen_finished: true } } }, { enid: id }).completed, true);
});
test('learning filters combine with rights filters and do not label unknown progress incomplete', () => {
  const items = [{ title: 'done', course: 'A', status: 'active', completed: true }, { title: 'todo', course: 'A', status: 'active', completed: false }, { title: 'unknown', course: 'A', status: 'active', completed: null }, { title: 'expired', course: 'A', status: 'expired', completed: true }];
  assert.deepEqual(C.filter(items, { learning: 'completed' }).map(i => i.title), ['done']);
  assert.deepEqual(C.filter(items, { learning: 'incomplete' }).map(i => i.title), ['todo']);
  assert.equal(C.filter(items, { learning: 'all', status: 'all' }).length, 4);
});
test('fresh list progress replaces stale progress without discarding a verified web ID', () => {
  const old = { articleId: 123, enid: id, checkedAt: 500, completed: false, learningCheckedAt: 100 };
  const incoming = { articleId: 123, enid: '', completed: true, learningCheckedAt: 600 };
  const result = C.merge([old], [incoming])[0];
  assert.equal(result.completed, true); assert.equal(result.enid, id);
});

test('official list denial replaces stale valid and retry states while retaining web mapping', () => {
  const row = { authority_intro: { red_packet_rights: false }, article_item: { id: 123, product_type: 65, product_title: '文章' } };
  for (const status of ['active', 'unknown']) {
    const old = { articleId: 123, enid: id, status, checkedAt: 100, expireAt: 150 };
    const item = C.merge([old], [C.received(row, 200)], 200)[0];
    assert.equal(item.status, 'expired'); assert.equal(item.enid, id);
    assert.equal(C.cachedItem(item, 200).status, 'expired');
  }
});
test('detail failure preserves authoritative list rights and an explicit renewal drops stale expiry', () => {
  const row = { authority_intro: { red_packet_rights: true }, article_item: { id: 123, product_type: 65, product_title: '文章' } };
  const old = { articleId: 123, enid: id, status: 'expired', checkedAt: 100, expireAt: 150, expiresOn: '旧日期' };
  const fresh = C.merge([old], [C.received(row, 200)], 200)[0];
  assert.equal(fresh.expireAt, 0); assert.equal(fresh.expiresOn, '');
  // Sync uses cachedItem on a detail request failure, preserving the list's decision.
  assert.equal(C.cachedItem(fresh, 200).status, 'active'); assert.equal(fresh.enid, id);
  assert.equal(C.merge([fresh], [old], 200)[0].status, 'active');
});

test('hide completed mirrors App: only completed articles are hidden, with unknown progress retained', () => {
  const items = [{ title: 'done', status: 'active', completed: true }, { title: 'todo', status: 'active', completed: false }, { title: 'unknown', status: 'active', completed: null }];
  assert.deepEqual(C.filter(items, { hideCompleted: true }).map(i => i.title), ['todo', 'unknown']);
  assert.equal(C.filter(items, { hideCompleted: false }).length, 3);
  assert.equal(C.hideCompletedPreference({ learning: 'incomplete' }), true);
  assert.equal(C.hideCompletedPreference({ learning: 'completed' }), false);
  assert.equal(C.hideCompletedPreference({ hideCompleted: false, learning: 'incomplete' }), false);
  assert.equal(C.hideCompletedPreference(), false);
});
test('widget position stays reachable across dragging, resizing and expanding near screen edges', () => {
  const desktop = { width: 1440, height: 900 }, panel = { width: 380, height: 560 };
  assert.deepEqual(C.widgetPosition({ right: -100, top: 2000 }, desktop, panel), { right: 12, top: 328 });
  assert.deepEqual(C.widgetPosition({ right: 2000, top: -100 }, desktop, panel), { right: 1048, top: 12 });
  assert.deepEqual(C.widgetPosition({ right: NaN, top: Infinity }, desktop, panel), { right: 20, top: 84 });
  assert.deepEqual(C.widgetPosition({ right: 1048, top: 328 }, { width: 390, height: 500 }, { width: 366, height: 476 }), { right: 12, top: 12 });
});
