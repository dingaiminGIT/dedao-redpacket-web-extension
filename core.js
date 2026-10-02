(function (root) {
  'use strict';
  const clean = (value, max = 300) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/\u0000/g, '').trim().slice(0, max);
  const enid = value => typeof value === 'string' && /^[A-Za-z0-9]{8,100}$/.test(value);
  const articleId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : 0;
  const itemKey = item => articleId(item.articleId) ? `article:${item.articleId}` : enid(item.enid) ? item.enid : '';
  function received(row, now = Date.now()) {
    const a = row.article_item;
    if (a?.product_type !== 65 || !articleId(a.id)) return null;
    const rights = row.authority_intro?.red_packet_rights;
    if (typeof rights !== 'boolean') throw Error('红包权益字段缺失，请稍后刷新');
    return { articleId: articleId(a.id), enid: enid(a.enid) ? a.enid : '', title: clean(a.product_title), course: clean(row.product_title), seenAt: Number(row.collection_timestamp) || 0, completed: a.is_finished === 1 || row.is_finished === 1 || Number((a.progress_intro || row.progress_intro || {}).progress) >= 100, learningCheckedAt: now, checkedAt: now, status: rights ? 'active' : 'expired' };
  }
  function receivedPage(data) {
    if (!Array.isArray(data?.list) || typeof data.is_more !== 'boolean') throw Error('已领取红包列表格式已变化');
    const stamps = data.list.map(row => Number(row.collection_timestamp));
    return { items: data.list.map(row => received(row)).filter(Boolean), count: data.list.length, has_more: data.is_more, timestamp: stamps.length && stamps.every(n => Number.isFinite(n) && n > 0) ? Math.min(...stamps) : 0 };
  }
  function article(data, seed = {}, now = Date.now()) {
    if (!enid(seed.enid)) throw Error('文章标识无效');
    if (typeof data?.is_red_packet_try !== 'boolean') throw Error('文章权益字段缺失，请稍后刷新');
    const rawExpiry = Date.parse(data.article_info?.red_packet_expire_time || '');
    const expireAt = Number.isFinite(rawExpiry) ? rawExpiry : 0;
    const active = data.is_red_packet_try === true && (!expireAt || expireAt > now);
    return {
      articleId: articleId(data.article_id || seed.articleId), enid: seed.enid, title: clean(data.article_title || seed.title || '未命名文章'),
      course: clean(data.class_title || data.class_info?.name || seed.course || '未分类课程'),
      completed: seed.completed === true || data.article_info?.audio?.listen_finished === true ? true : seed.completed === false || data.article_info?.audio?.listen_finished === false ? false : null,
      learningCheckedAt: now,
      expiresOn: clean(data.red_packet_expire_day, 40), expireAt,
      status: active ? 'active' : 'expired', checkedAt: now,
      seenAt: Number(seed.seenAt) || now, manual: seed.manual === true
    };
  }
  function merge(items, incoming, now = Date.now()) {
    const result = new Map();
    for (const item of [...items, ...incoming]) {
      const key = itemKey(item);
      if (!key) continue;
      const sameEnid = enid(item.enid) ? [...result.keys()].find(k => result.get(k).enid === item.enid) : null;
      const old = result.get(key) || result.get(sameEnid);
      if (sameEnid && sameEnid !== key) result.delete(sameEnid);
      const newest = old?.checkedAt > (item.checkedAt || 0) ? { ...item, ...old } : { ...old, ...item };
      // A list row may omit the web ID; preserve an already verified mapping.
      newest.enid = enid(item.enid) ? item.enid : old?.enid || '';
      // A renewed grant must not inherit an elapsed deadline from an earlier grant.
      if (newest.status === 'active' && newest.expireAt && newest.expireAt <= now && item.status === 'active' && item.checkedAt >= (old?.checkedAt || 0) && !item.expireAt) {
        newest.expireAt = 0; newest.expiresOn = '';
      }
      const progress = (item.learningCheckedAt || 0) >= (old?.learningCheckedAt || 0) ? item : old;
      result.set(key, { ...newest, completed: progress?.completed ?? newest.completed ?? null, learningCheckedAt: progress?.learningCheckedAt || 0, manual: Boolean(old?.manual || item.manual) });
    }
    return [...result.values()].slice(-5000);
  }

  function cachedItem(i, now = Date.now()) {
    if (!i || !itemKey(i)) return null;
    const number = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
    const expireAt = number(i.expireAt);
    return {
      articleId: articleId(i.articleId), enid: enid(i.enid) ? i.enid : '', title: clean(i.title), course: clean(i.course), expiresOn: clean(i.expiresOn, 40),
      completed: typeof i.completed === 'boolean' ? i.completed : null, learningCheckedAt: number(i.learningCheckedAt),
      expireAt, checkedAt: number(i.checkedAt), seenAt: number(i.seenAt), manual: i.manual === true,
      status: i.status === 'expired' || (expireAt && expireAt <= now) ? 'expired' : i.status === 'active' ? 'active' : 'unknown'
    };
  }
  function filter(items, { query = '', course = '', status = 'active', sort = 'expiry', learning = 'all' } = {}) {
    const term = query.trim().toLocaleLowerCase();
    return items.filter(i => (learning === 'all' || (learning === 'completed' ? i.completed === true : i.completed === false)) && (!course || i.course === course) && (status === 'all' || i.status === status) && (!term || `${i.title} ${i.course}`.toLocaleLowerCase().includes(term)))
      .sort((a, b) => sort === 'recent' ? b.seenAt - a.seenAt : (a.expireAt || Infinity) - (b.expireAt || Infinity) || b.seenAt - a.seenAt);
  }
  function nextCursor(response, previous, visited) {
    if (!response.has_more) return null;
    const next = response.timestamp;
    if ((typeof next !== 'number' && typeof next !== 'string') || !Number.isFinite(Number(next)) || Number(next) <= 0 || String(next) === String(previous) || visited.has(String(next))) throw Error('红包列表分页游标异常，已停止继续读取');
    return next;
  }
  async function runLimited(list, limit, work, stopped = () => false) {
    let next = 0;
    const worker = async () => {
      while (!stopped() && next < list.length) {
        const index = next++;
        await work(list[index], index);
      }
    };
    await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), list.length) }, worker));
  }
  // Only successful refresh batches make the list fresh.
  function shouldAutoRefresh(syncedAt = 0, attemptedAt = 0, now = Date.now()) {
    const recent = (stamp, interval) => Number.isFinite(stamp) && stamp > 0 && stamp <= now && now - stamp < interval;
    return !recent(syncedAt, 300000) && !recent(attemptedAt, 60000);
  }
  const api = { clean, enid, articleId, received, receivedPage, article, merge, cachedItem, filter, nextCursor, runLimited, shouldAutoRefresh };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DDRedpacketCore = Object.freeze(api);
})(globalThis);
