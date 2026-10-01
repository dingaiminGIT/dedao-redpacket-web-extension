const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../core.js');
const id = 'ExampleArticle12345678';
test('only supported official HTTPS links can be imported', () => {
  assert.ok(C.allowedLink('https://d.dedao.cn/ExamplePacket1234'));
  assert.ok(C.allowedLink(`https://www.dedao.cn/course/article?id=${id}`));
  assert.ok(C.allowedLink('https://www.dedao.cn/share/trialReading?trialReadingId=abcdefgh12345678&type=65'));
  for (const url of ['javascript:alert(1)', 'http://www.dedao.cn/course/article?id=abcdefgh', 'https://www.dedao.cn.evil.test/course/article?id=abcdefgh', 'https://evil@www.dedao.cn/course/article?id=abcdefgh', 'https://www.dedao.cn:444/course/article?id=abcdefgh', 'https://www.dedao.cn/logout', 'https://d.dedao.cn/../logout/now']) assert.equal(C.allowedLink(url), null, url);
});
test('recent candidates require both explicit redpacket rights and course article identity', () => {
  const row = { ext: { ariticle_id_hazy: id }, authority_intro: { is_red_packet_try: true, has_authority: true }, resource: { resource_type: 65, title: '<hl>继续学习：</hl>安全标题' }, title: '课程' };
  assert.equal(C.candidate(row).title, '安全标题');
  assert.equal(C.candidate({ ...row, authority_intro: { has_authority: true } }), null);
  assert.equal(C.candidate({ ...row, resource: { resource_type: 13 } }), null);
  assert.equal(C.candidate({ ...row, ext: { ariticle_id_hazy: '../bad' } }), null);
});
test('purchased or trial-only content never masquerades as an active redpacket', () => {
  for (const raw of [{ is_buy: 1 }, { is_user_free_try: true }, { is_red_packet_try: false }]) assert.equal(C.article(raw, { enid: id }).status, 'expired');
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
test('manual imports use class_info.name when the API returns an empty class_title', () => {
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
  assert.equal(C.cachedItem(page.items[0]).status, 'unknown');
  assert.equal(C.received({ ...row, authority_intro: { red_packet_rights: false } }), null);
  assert.equal(C.received({ ...row, article_item: { ...row.article_item, product_type: 1013 } }), null);
});
test('resolving a received article and reloading its numeric seed never creates duplicates', () => {
  const raw = { articleId: 3543, enid: '', title: '文章', status: 'unknown' };
  const resolved = { ...raw, enid: 'abcdefgh12345678', status: 'active', checkedAt: 100 };
  const list = C.merge(C.merge([raw], [resolved]), [raw]);
  assert.equal(list.length, 1); assert.equal(list[0].enid, resolved.enid); assert.equal(list[0].status, 'active');
  assert.equal(C.merge([{ enid: resolved.enid, manual: true }], [resolved]).length, 1);
});
