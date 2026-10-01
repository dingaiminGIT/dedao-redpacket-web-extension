(() => {
  'use strict';
  if (document.getElementById('dd-redpacket-companion')) return;
  const C = globalThis.DDRedpacketCore;
  const pending = new Map();
  function rpc(command, args = {}) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => { pending.delete(id); reject(Error('请求超时，请刷新网页后重试')); }, 18000);
      pending.set(id, { resolve, reject, timer });
      window.postMessage({ channel: 'dd-redpacket-request-v1', id, command, args }, location.origin);
    });
  }
  window.addEventListener('message', e => {
    if (e.source !== window || e.origin !== location.origin || e.data?.channel !== 'dd-redpacket-response-v1') return;
    const request = pending.get(e.data.id);
    if (!request) return;
    clearTimeout(request.timer); pending.delete(e.data.id);
    if (e.data.error) request.reject(Error(e.data.error)); else request.resolve(e.data.result);
  });
  const host = document.createElement('div'); host.id = 'dd-redpacket-companion';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{all:initial;--orange:#ff6b00;--soft-orange:#fff7f2;--ink:#1d1f24;--muted:#70747e;--line:#e8e9ec;color-scheme:light;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;font-size:13px;color:var(--ink);line-height:1.5}
    *{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{cursor:wait;opacity:.55}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--orange);outline-offset:2px}
    .launch{position:fixed;right:20px;top:84px;z-index:2147483645;border:1px solid #ffd4bf;background:var(--soft-orange);color:#ae3d0c;padding:7px 13px;border-radius:18px;box-shadow:0 3px 12px #38221412;font-weight:650;min-height:34px}.launch[aria-expanded="true"]{border-color:var(--orange)}
    dialog{position:fixed;inset:auto;top:126px;right:20px;z-index:2147483645;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100dvh - 142px));max-width:none;max-height:none;margin:0;padding:0;border:1px solid #f0d9cc;border-radius:14px;background:#fafafa;color:var(--ink);box-shadow:0 8px 32px #38221424;overflow:hidden}
    .shell{height:100%;display:flex;flex-direction:column}header{padding:12px 14px 10px;border-bottom:1px solid var(--line);background:#fff;flex-shrink:0}
    .top,.actions,.summary,.footer,.meta{display:flex;align-items:center;gap:8px}.top,.summary,.footer{justify-content:space-between}h1{margin:0;font-size:18px;font-weight:650}.intro{color:var(--muted);font-size:11px;margin:1px 0 0}
    .close{border:0;border-radius:6px;width:30px;height:30px;background:var(--soft-orange);color:#a44217;font-size:22px;line-height:1;flex-shrink:0}.actions{flex-wrap:wrap;margin-top:9px;gap:6px}
    .primary{border:1px solid var(--orange);background:var(--orange);color:#fff;font-weight:500}.secondary{border:1px solid #f0d9cc;background:var(--soft-orange);color:#aa3d0e}.actions button,.add button,.empty button,.filter-toggle{padding:5px 10px;border-radius:7px;min-height:32px}
    .quiet{border:0;background:none;color:#a44217;padding:4px 2px;text-decoration:underline;text-underline-offset:3px}.stamp{font-size:11px;color:var(--muted)}
    .tools{padding:10px 14px 4px;flex-shrink:0;max-height:50%;overflow:auto}.search-row{display:flex;gap:6px}.search{flex:1}.filter-toggle{white-space:nowrap}.filter-toggle[aria-expanded="true"]{border-color:var(--orange)}
    .filters{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.course-filter{grid-column:1/-1}.search,.filters select,.add input{min-width:0;width:100%;border:1px solid #dddfe3;border-radius:7px;background:#fff;padding:7px 9px;color:var(--ink)}input::placeholder{color:var(--muted)}
    .add-wrap{margin-top:8px;padding:10px;background:var(--soft-orange);border-radius:8px}.add{display:flex;flex-wrap:wrap;gap:7px}.add input{flex-basis:100%}.add button{margin-left:auto}.link-hint,.link-error{font-size:11px;margin:6px 0 0}.link-hint{color:#825844}.link-error{color:#a33327}.link[aria-invalid="true"]{border-color:#a33327}
    .status{font-size:11px;color:#747079;margin-top:7px;min-height:17px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.status.error{color:#a33327}
    .summary{padding:3px 14px 8px;font-size:11px;color:var(--muted);flex-shrink:0;gap:5px;flex-wrap:wrap}.summary b{color:var(--ink);font-size:15px;margin-right:3px;font-variant-numeric:tabular-nums}.summary .reset-filters{font-size:11px}.list{flex:1;min-height:0;overflow:auto;padding:0 10px 6px;overscroll-behavior:contain}
    .card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;background:#fff;border:1px solid var(--line);border-radius:9px;padding:10px;margin-bottom:6px}.course{font-size:11px;color:var(--muted);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title{font-size:14px;font-weight:550;line-height:1.5;margin:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .meta{flex-wrap:wrap;margin-top:6px;font-size:11px;gap:5px;color:var(--muted)}.expiry{color:#aa3d0e;background:var(--soft-orange);padding:2px 5px;border-radius:4px}.urgent{color:#a33327;background:#ffebe0;font-weight:600}.muted{color:var(--muted)}
    .card button{align-self:center;border:1px solid #ffd4bf;background:var(--soft-orange);color:#aa3d0e;border-radius:7px;padding:6px 8px;white-space:nowrap;min-height:32px;font-size:12px}.empty{text-align:center;padding:24px 12px;color:var(--muted);font-size:12px}.empty strong{display:block;color:var(--ink);font-size:15px;font-weight:550;margin-bottom:6px}.empty button{margin-top:10px}
    .footer{border-top:1px solid var(--line);padding:8px 12px;font-size:11px;color:var(--muted);flex-shrink:0;flex-wrap:wrap;gap:5px}.footer .quiet{font-size:11px;color:var(--muted)}.footer .more{width:100%;font-size:12px;padding:5px 8px;border-radius:6px;order:-1}.clear-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%;padding:6px 0}.clear-confirm span{width:100%}.confirm-clear{border:1px solid #a33327;color:#a33327;background:#fff;padding:5px 9px;border-radius:6px}
    [hidden]{display:none!important}
    @media(max-width:420px){.launch{right:12px}dialog{right:12px}.actions button{padding-left:8px;padding-right:8px}}
    @media(max-height:540px){.launch{top:12px}dialog{top:54px;height:calc(100dvh - 66px);overflow:auto}.shell{height:auto;min-height:100%}.tools{max-height:none;overflow:visible}.list{flex:none;min-height:120px;max-height:240px}}
  </style>
  <button class="launch" aria-haspopup="dialog" aria-controls="dd-rp-dialog" aria-expanded="false">知识红包</button>
  <dialog aria-modal="false" id="dd-rp-dialog" aria-labelledby="dd-rp-title"><div class="shell">
    <header><div class="top"><div><h1 id="dd-rp-title">知识红包</h1><p class="intro">已领取 · 课程红包</p></div><button class="close" aria-label="关闭知识红包">×</button></div>
    <div class="actions"><button class="primary refresh">刷新红包</button><button class="secondary toggle-add" aria-expanded="false" aria-controls="dd-rp-add">添加链接</button><button class="secondary collect" hidden>收录当前文章</button><button class="quiet cancel" hidden>停止</button></div></header>
    <div class="tools"><div class="search-row"><input class="search" type="search" aria-label="搜索文章或课程" placeholder="搜索文章或课程" autofocus><button class="secondary filter-toggle" aria-expanded="false" aria-controls="dd-rp-filters">筛选</button></div><div class="filters" id="dd-rp-filters" hidden><select class="course-filter" aria-label="筛选课程"><option value="">全部课程</option></select><select class="status-filter" aria-label="筛选状态"><option value="active">有效红包</option><option value="all">全部记录</option><option value="unknown">待核验</option><option value="expired">权益已失效</option></select><select class="sort" aria-label="排序"><option value="expiry">即将到期优先</option><option value="recent">最近领取优先</option></select></div>
    <div class="add-wrap" id="dd-rp-add" hidden><form class="add" novalidate><input class="link" type="url" aria-label="得到分享链接" aria-describedby="dd-rp-link-hint dd-rp-link-error" placeholder="粘贴得到红包分享链接" required><button class="secondary" type="submit">打开并收录 ↗</button></form><p id="dd-rp-link-hint" class="link-hint">支持得到短链接、分享页和文章链接；在新标签页核验并收录已领取的红包。</p><p id="dd-rp-link-error" class="link-error" role="alert" hidden></p></div>
    <div class="status" role="status" aria-live="polite">打开后自动读取已领取的课程红包。</div></div>
    <div class="summary"><span><b class="count">0</b>篇<span class="count-context">有效红包</span></span><button class="quiet reset-filters" hidden>重置筛选</button><span class="stamp">尚未刷新</span></div><div class="list" aria-label="知识红包列表"></div>
    <div class="footer"><span title="来自官方已领取列表，不要求先学习。更多历史领取记录可继续加载。">已领取即可发现，无需先学习。</span><button class="secondary more" hidden>加载更早领取的红包</button><button class="quiet clear" aria-label="清除本账号缓存">清缓存</button><div class="clear-confirm" hidden><span>仅清除本机列表，得到账号中的内容会保留。</span><button class="confirm-clear">确认清除</button><button class="quiet cancel-clear">取消</button></div></div>
  </div></dialog>`;
  document.documentElement.append(host);
  const $ = selector => shadow.querySelector(selector);
  let account = '', items = [], updatedAt = 0, cursor = 0, hasMore = false, busy = false, cancelled = false, opening = false;
  let visited = new Set();
  let syncedAt = 0;
  const autoAttempts = new Map();
  const key = id => `redpacket:v2:${id}`;
  const formatTime = value => new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  function status(message, error = false) { $('.status').textContent = message; $('.status').title = message; $('.status').classList.toggle('error', error); }
  function setBusy(value, allowCancel = false) {
    busy = value;
    for (const el of shadow.querySelectorAll('.refresh,.more,.collect,.add button,.clear,.confirm-clear,.read')) el.disabled = value;
    $('.cancel').hidden = !value || !allowCancel;
    $('.list').setAttribute('aria-busy', String(value));
  }
  function resetFilters() {
    $('.search').value = ''; $('.course-filter').value = ''; $('.status-filter').value = 'active'; $('.sort').value = 'expiry';
    draw(); $('.search').focus();
  }
  function showFilters(show) {
    $('.filters').hidden = !show; $('.filter-toggle').setAttribute('aria-expanded', String(show));
    if (show) { showAdd(false); $('.course-filter').focus(); }
  }
  function closePanel(restoreFocus = true) {
    $('dialog').close(); $('.launch').setAttribute('aria-expanded', 'false');
    if (restoreFocus) $('.launch').focus();
  }
  function showAdd(show) {
    $('.add-wrap').hidden = !show; $('.toggle-add').setAttribute('aria-expanded', String(show));
    if (show) { showFilters(false); $('.link').focus(); }
  }
  function draw() {
    const filtered = Boolean($('.search').value.trim() || $('.course-filter').value || $('.status-filter').value !== 'active');
    $('.reset-filters').hidden = !filtered;
    $('.filter-toggle').textContent = ($('.course-filter').value || $('.status-filter').value !== 'active' || $('.sort').value !== 'expiry') ? '筛选 · 已选' : '筛选';
    $('.count-context').textContent = filtered ? '筛选结果' : '有效红包';
    $('.collect').hidden = !['/course/article', '/share/trialReading'].includes(location.pathname);
    const selected = $('.course-filter').value;
    $('.course-filter').replaceChildren(new Option('全部课程', ''));
    for (const name of [...new Set(items.map(i => i.course))].sort()) $('.course-filter').append(new Option(name, name));
    $('.course-filter').value = selected;
    const rows = C.filter(items, { query: $('.search').value, course: $('.course-filter').value, status: $('.status-filter').value, sort: $('.sort').value });
    $('.count').textContent = String(rows.length); $('.list').replaceChildren();
    $('.more').hidden = !hasMore;
    $('.stamp').textContent = updatedAt ? `上次核验 ${formatTime(updatedAt)}` : '尚未刷新';
    if (!rows.length) {
      const box = document.createElement('div'); box.className = 'empty';
      const title = document.createElement('strong'); title.textContent = items.length ? '这个筛选下还没有文章' : '等一篇值得读的好内容';
      const text = document.createElement('div'); text.textContent = items.length ? '试试其他关键词、课程或状态。' : '刷新已领取列表，或添加一个红包链接。';
      box.append(title, text);
      const action = document.createElement('button'); action.className = 'secondary';
      action.textContent = filtered ? '重置筛选' : '添加红包链接';
      action.addEventListener('click', filtered ? resetFilters : () => showAdd(true));
      box.append(action); $('.list').append(box);
    }
    for (const item of rows) {
      const card = document.createElement('article'); card.className = 'card';
      const info = document.createElement('div'), course = document.createElement('div'), title = document.createElement('h2'), meta = document.createElement('div'), expiry = document.createElement('span');
      course.className = 'course'; course.textContent = item.course; course.title = item.course; title.className = 'title'; title.textContent = item.title; title.title = item.title;
      meta.className = 'meta'; expiry.className = item.status === 'active' ? 'expiry' : 'muted';
      expiry.textContent = item.status === 'active' ? (item.expiresOn ? `有效至 ${item.expiresOn}` : '有效期未返回') : item.status === 'unknown' ? '暂未核验，请刷新重试' : '红包权益已失效';
      if (item.status === 'active' && item.expireAt > Date.now() && item.expireAt - Date.now() <= 86400000) {
        expiry.classList.add('urgent'); expiry.textContent += ' · 24小时内到期';
      }
      meta.append(expiry);
      if (item.manual) { const source = document.createElement('span'); source.textContent = '手动收录'; meta.append(source); }
      info.append(course, title, meta); card.append(info);
      if (item.status === 'active') { const read = document.createElement('button'); read.className = 'read'; read.textContent = '阅读 ↗'; read.setAttribute('aria-label', `阅读《${item.title}》（新标签页）`); read.disabled = busy; read.addEventListener('click', () => readArticle(item)); card.append(read); }
      $('.list').append(card);
    }
  }
  async function loadAccount() {
    const ctx = await rpc('context');
    if (account !== ctx.account) { account = ctx.account; items = []; cursor = 0; hasMore = false; visited.clear(); updatedAt = 0; syncedAt = 0; }
    let saved = (await chrome.storage.local.get(key(account)))[key(account)];
    if (!saved) {
      const legacyKey = `redpacket:v1:${account}`;
      const legacy = (await chrome.storage.local.get(legacyKey))[legacyKey];
      if (Array.isArray(legacy?.items)) saved = { version: 1, items: legacy.items.filter(i => i.manual === true), syncedAt: 0 };
    }
    if (saved?.version === 1 && Array.isArray(saved.items)) {
      items = saved.items.slice(0, 5000).map(i => C.cachedItem(i)).filter(Boolean);
      updatedAt = Number(saved.updatedAt) || 0;
      cursor = Number(saved.cursor) || 0; hasMore = saved.hasMore === true;
      syncedAt = Number.isFinite(saved.syncedAt) ? saved.syncedAt : 0;
    } else { items = []; updatedAt = 0; syncedAt = 0; }
  }
  async function save(expectedAccount) {
    if ((await rpc('context')).account !== expectedAccount) {
      account = ''; items = []; updatedAt = 0; hasMore = false; cursor = 0;
      throw Error('检测到账号切换，已清空当前显示，请重新打开面板');
    }
    // Retain articles collected in another tab while this panel was open.
    const latest = (await chrome.storage.local.get(key(expectedAccount)))[key(expectedAccount)];
    const previous = Array.isArray(latest?.items) ? latest.items.map(i => C.cachedItem(i)).filter(Boolean) : [];
    items = C.merge(previous, items).map(i => C.cachedItem(i)).filter(Boolean);
    syncedAt = Math.max(syncedAt, Number.isFinite(latest?.syncedAt) ? latest.syncedAt : 0);
    await chrome.storage.local.set({ [key(expectedAccount)]: { version: 1, items, updatedAt, syncedAt, cursor, hasMore } });
  }
  async function open({ autoRefresh = true } = {}) {
    if (opening) return;
    $('.clear-confirm').hidden = true;
    if (! $('dialog').open) $('dialog').show();
    $('.launch').setAttribute('aria-expanded', 'true');
    if (busy) return;
    opening = true; setBusy(true);
    let loaded = false;
    try { await loadAccount(); loaded = true; draw(); status(items.length ? '已载入缓存，最近更新仍有效。' : '已连接当前得到账号。'); }
    catch (e) { account = ''; items = []; updatedAt = 0; hasMore = false; draw(); status(e.message, true); }
    finally { opening = false; setBusy(false); }
    if (loaded && autoRefresh && $('dialog').open) {
      if (C.shouldAutoRefresh(syncedAt, autoAttempts.get(account))) {
        autoAttempts.set(account, Date.now());
        await sync(false, true);
      } else if (!syncedAt || Date.now() - syncedAt >= 300000) {
        status('刚刚已尝试自动更新，可点击刷新重试。');
      }
    }
  }
  async function sync(more = false, automatic = false) {
    if (busy) return;
    setBusy(true, true); cancelled = false;
    $('.refresh').textContent = automatic ? '自动刷新中…' : '刷新中…';
    const originalAccount = account;
    try {
      const ctx = await rpc('context');
      if (!account || ctx.account !== account) { await loadAccount(); more = false; }
      const expectedAccount = account;
      const inbox = await rpc('inbox-context', { account });
      let seeds = more ? [] : items.map(i => ({ ...i })), examined = 0;
      if (!more) { cursor = 0; visited = new Set(); hasMore = false; }
      let pagingError = '';
      for (let n = 0; n < 5 && !cancelled; n++) {
        status(`正在读取已领取红包，第 ${n + 1} 页…`);
        try {
          const reply = await chrome.runtime.sendMessage({ type: 'received-list', uid: inbox.uid, cursor });
          if (reply?.error || !reply?.result) throw Error(reply?.error || '红包列表读取失败');
          if ((await rpc('context')).account !== expectedAccount) throw Error('账号已切换，请重新打开面板');
          const page = reply.result;
          seeds = C.merge(seeds, page.items); examined += page.count;
          const next = C.nextCursor(page, cursor, visited);
          hasMore = next !== null;
          if (next === null) break;
          visited.add(String(next)); cursor = next;
        } catch (e) { pagingError = e.message; break; }
      }
      let failures = 0, verified = 0;
      const results = [];
      for (const seed of seeds) {
        if (cancelled) break;
        status(`正在核验红包 ${verified + 1} / ${seeds.length}…`);
        try { results.push(await rpc('article', seed)); }
        catch { failures++; results.push({ ...seed, status: 'unknown', checkedAt: Date.now() }); }
        verified++;
      }
      // Keep discovered but unchecked entries so stopping does not lose a page.
      items = C.merge(items, seeds.map(s => ({ ...s, status: 'unknown' })));
      items = C.merge(items, results); updatedAt = Date.now();
      if (!more && !cancelled && !pagingError && !failures) syncedAt = updatedAt;
      await save(expectedAccount); draw();
      status(`${cancelled ? '已停止。' : automatic ? '自动刷新完成。' : '刷新完成。'}读取 ${examined} 条领取记录，核验 ${verified} 篇；${items.filter(i => i.status === 'active').length} 篇红包有效。${failures ? ` ${failures} 篇待重试。` : ''}${hasMore ? ' 可加载更早领取的红包。' : ''}${pagingError ? ` ${pagingError}` : ''}`, Boolean(pagingError || failures));
    } catch (e) { if (originalAccount !== account) draw(); status(e.message, true); }
    finally { setBusy(false); $('.refresh').textContent = '刷新红包'; draw(); }
  }
  async function collect() {
    if (busy) return;
    setBusy(true);
    try {
      if (!account) await loadAccount();
      const expectedAccount = account;
      const current = await rpc('current');
      const item = await rpc('article', { ...current, manual: true });
      if (item.status !== 'active') throw Error('这篇文章当前没有有效红包权益，未收录');
      items = C.merge(items, [item]); updatedAt = Date.now(); await save(expectedAccount); draw();
      status(`已收录「${item.title}」${item.expiresOn ? `，有效至 ${item.expiresOn}` : ''}。`);
    } catch (e) { status(e.message, true); }
    finally { setBusy(false); draw(); }
  }
  async function readArticle(item) {
    if (busy) return;
    // Open during the click to avoid popup blockers, and close if rights fail.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    setBusy(true);
    try {
      const expectedAccount = account;
      const verified = await rpc('article', item);
      items = C.merge(items, [verified]); await save(expectedAccount); draw();
      if (verified.status !== 'active') throw Error('该红包权益已失效，列表已更新');
      const url = `https://www.dedao.cn/course/article?id=${encodeURIComponent(verified.enid)}`;
      if (tab) tab.location.href = url; else location.href = url;
    } catch (e) { if (tab) tab.close(); status(e.message, true); }
    finally { setBusy(false); draw(); }
  }
  $('.launch').addEventListener('click', () => $('dialog').open ? closePanel() : open());
  $('.close').addEventListener('click', () => closePanel());
  $('.filter-toggle').addEventListener('click', () => showFilters($('.filters').hidden));
  document.addEventListener('pointerdown', e => {
    if ($('dialog').open && !e.composedPath().includes(host)) closePanel(false);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('dialog').open) { closePanel(); e.preventDefault(); }
  });
  $('.refresh').addEventListener('click', () => sync()); $('.more').addEventListener('click', () => sync(true));
  $('.cancel').addEventListener('click', () => { cancelled = true; status('正在停止，将保留已完成的核验结果…'); });
  $('.collect').addEventListener('click', collect);
  $('.toggle-add').addEventListener('click', () => showAdd($('.add-wrap').hidden));
  $('.reset-filters').addEventListener('click', resetFilters);
  $('.link').addEventListener('input', () => { $('.link-error').hidden = true; $('.link').removeAttribute('aria-invalid'); });
  for (const selector of ['.search', '.course-filter', '.status-filter', '.sort']) $(selector).addEventListener('input', draw);
  $('.add').addEventListener('submit', async e => {
    e.preventDefault(); if (busy) return;
    const url = C.allowedLink($('.link').value);
    if (!url) {
      $('.link-error').textContent = '请粘贴 https://d.dedao.cn/ 短链接，或得到官方文章、分享页链接。';
      $('.link-error').hidden = false; $('.link').setAttribute('aria-invalid', 'true'); $('.link').focus(); return;
    }
    setBusy(true); $('.add button').textContent = '正在打开…';
    try {
      const reply = await chrome.runtime.sendMessage({ type: 'import-link', url });
      if (!reply?.ok) throw Error(reply?.error || '打开链接失败，请重试');
      status('已在新标签页打开链接，正在核验并收录红包。'); $('.link').value = ''; showAdd(false);
    } catch (error) { $('.link-error').textContent = error.message || '无法打开链接'; $('.link-error').hidden = false; }
    finally { setBusy(false); $('.add button').textContent = '打开并收录 ↗'; }
  });
  $('.clear').addEventListener('click', () => { $('.clear-confirm').hidden = false; $('.cancel-clear').focus(); });
  $('.cancel-clear').addEventListener('click', () => { $('.clear-confirm').hidden = true; $('.clear').focus(); });
  $('.confirm-clear').addEventListener('click', async () => {
    if (busy || !account) return;
    setBusy(true);
    try { await chrome.storage.local.remove([key(account), `redpacket:v1:${account}`]); items = []; updatedAt = 0; hasMore = false; cursor = 0; visited.clear(); syncedAt = 0; autoAttempts.delete(account); draw(); status('已清除本账号的本地列表。得到账号中的内容不受影响。'); }
    catch { status('清除缓存失败，请重试', true); }
    finally { $('.clear-confirm').hidden = true; setBusy(false); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && account && changes[key(account)] && !busy && $('dialog').open) status('其他页面已更新红包列表，重新打开面板即可载入。');
  });
  draw();
  chrome.runtime.sendMessage({ type: 'consume-import' }).then(async response => {
    if (response?.pending) { await open({ autoRefresh: false }); await collect(); }
    else if (location.hash === '#dd-redpacket') await open();
  }).catch(() => { if (location.hash === '#dd-redpacket') open(); });
})();
