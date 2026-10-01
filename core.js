(function (root) {
  'use strict';
  const clean = (value, max = 300) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/\u0000/g, '').trim().slice(0, max);
  const enid = value => typeof value === 'string' && /^[A-Za-z0-9]{8,100}$/.test(value);
  function allowedLink(text) {
    try {
      const u = new URL(text.trim());
      if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
      if (u.hostname === 'd.dedao.cn' && /^\/[A-Za-z0-9]{4,100}$/.test(u.pathname)) return u.href;
      if (u.hostname !== 'www.dedao.cn') return null;
      if (u.pathname === '/course/article' && enid(u.searchParams.get('id'))) return u.href;
      if (u.pathname === '/share/trialReading' && /^[A-Za-z0-9]{8,200}$/.test(u.searchParams.get('trialReadingId') || '')) return u.href;
    } catch {}
    return null;
  }
  function candidate(row) {
    const id = row.ext?.ariticle_id_hazy;
    if (!enid(id) || row.authority_intro?.is_red_packet_try !== true || row.authority_intro?.has_authority !== true) return null;
    if (Number(row.resource?.resource_type) !== 65) return null;
    return { enid: id, title: clean(row.resource?.title).replace(/^继续学习[：:]\s*/, ''), course: clean(row.title), seenAt: Number(row.timestamp) || 0 };
  }
  function article(data, seed = {}, now = Date.now()) {
    if (!enid(seed.enid)) throw Error('文章标识无效');
    const rawExpiry = Date.parse(data.article_info?.red_packet_expire_time || '');
    const expireAt = Number.isFinite(rawExpiry) ? rawExpiry : 0;
    const active = data.is_red_packet_try === true && (!expireAt || expireAt > now);
    return {
      enid: seed.enid, title: clean(data.article_title || seed.title || '未命名文章'),
      course: clean(data.class_title || data.class_info?.name || seed.course || '未分类课程'),
      expiresOn: clean(data.red_packet_expire_day, 40), expireAt,
      status: active ? 'active' : 'expired', checkedAt: now,
      seenAt: Number(seed.seenAt) || now, manual: seed.manual === true
    };
  }
  function merge(items, incoming) {
    const result = new Map(items.filter(i => enid(i.enid)).map(i => [i.enid, i]));
    for (const item of incoming) {
      if (!enid(item.enid)) continue;
      const old = result.get(item.enid);
      const newest = old?.checkedAt > (item.checkedAt || 0) ? { ...item, ...old } : { ...old, ...item };
      result.set(item.enid, { ...newest, manual: Boolean(old?.manual || item.manual) });
    }
    return [...result.values()].slice(-500);
  }
  function cachedItem(i, now = Date.now()) {
    if (!i || !enid(i.enid)) return null;
    const number = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
    const expireAt = number(i.expireAt);
    return {
      enid: i.enid, title: clean(i.title), course: clean(i.course), expiresOn: clean(i.expiresOn, 40),
      expireAt, checkedAt: number(i.checkedAt), seenAt: number(i.seenAt), manual: i.manual === true,
      status: i.status === 'expired' || (expireAt && expireAt <= now) ? 'expired' : i.status === 'active' ? 'active' : 'unknown'
    };
  }
  function filter(items, { query = '', course = '', status = 'active', sort = 'expiry' } = {}) {
    const term = query.trim().toLocaleLowerCase();
    return items.filter(i => (!course || i.course === course) && (status === 'all' || i.status === status) && (!term || `${i.title} ${i.course}`.toLocaleLowerCase().includes(term)))
      .sort((a, b) => sort === 'recent' ? b.seenAt - a.seenAt : (a.expireAt || Infinity) - (b.expireAt || Infinity) || b.seenAt - a.seenAt);
  }
  function nextCursor(response, previous, visited) {
    if (!response.has_more) return null;
    const next = response.timestamp;
    if ((typeof next !== 'number' && typeof next !== 'string') || !Number.isFinite(Number(next)) || Number(next) <= 0 || String(next) === String(previous) || visited.has(String(next))) throw Error('学习记录分页游标异常，已停止继续读取');
    return next;
  }
  // Only successful full scans make the list fresh; collecting one article does not.
  function shouldAutoRefresh(syncedAt = 0, attemptedAt = 0, now = Date.now()) {
    const recent = (stamp, interval) => Number.isFinite(stamp) && stamp > 0 && stamp <= now && now - stamp < interval;
    return !recent(syncedAt, 300000) && !recent(attemptedAt, 60000);
  }
  const api = { clean, enid, allowedLink, candidate, article, merge, cachedItem, filter, nextCursor, shouldAutoRefresh };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DDRedpacketCore = Object.freeze(api);
})(globalThis);
