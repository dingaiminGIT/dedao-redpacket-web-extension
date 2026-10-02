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
    .dock{position:fixed;right:20px;top:84px;z-index:2147483645;width:52px;border:1px solid #f0d9cc;border-radius:22px;background:#fffaf6;box-shadow:0 4px 20px #38221418;overflow:hidden;text-align:center}
    .launch{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%;border:0;background:transparent;color:#ae3d0c;padding:12px 4px 5px;font-size:12px;font-weight:600;line-height:1.4}.launch:hover,.collapse:hover{background:#ffebdd}.launch svg{width:20px;height:20px}.dock-label{font-size:11px;letter-spacing:1px}.dock-count{font-size:13px;font-variant-numeric:tabular-nums}
    .drag-handle{border:0;background:none;color:#bda394;cursor:grab;touch-action:none;user-select:none;padding:6px;line-height:1}.drag-handle svg{width:18px;height:14px;display:block}.dock .drag-handle{display:flex;justify-content:center;width:100%;padding:7px 0 10px}.drag-handle:hover{color:#a44217}.heading{display:flex;align-items:center;gap:7px;min-width:0}.heading .drag-handle{padding:6px 0;margin-left:-5px}.dragging,.dragging *{cursor:grabbing!important;user-select:none!important}
    dialog{position:fixed;inset:auto;top:84px;right:20px;z-index:2147483645;width:min(380px,calc(100vw - 24px));height:min(560px,calc(100dvh - 24px));max-width:none;max-height:none;margin:0;padding:0;border:1px solid #f0d9cc;border-radius:16px;background:#fafafa;color:var(--ink);box-shadow:0 8px 32px #38221424;overflow:hidden}
    .shell{height:100%;display:flex;flex-direction:column}header{padding:12px 16px;border-bottom:1px solid var(--line);background:#fff;flex-shrink:0;cursor:grab;touch-action:none;user-select:none}
    .top,.actions,.summary,.footer,.meta{display:flex;align-items:center;gap:8px}.top,.summary,.footer{justify-content:space-between}h1{margin:0;font-size:17px;font-weight:650}.intro{color:var(--muted);font-size:11px;margin:1px 0 0}
    .collapse{display:grid;place-items:center;border:0;border-radius:8px;width:30px;height:32px;background:transparent;color:#a44217;flex-shrink:0}.collapse svg{width:20px;height:20px}.actions{flex-shrink:0;gap:8px}
    .primary{border:1px solid var(--orange);background:var(--orange);color:#fff;font-weight:500}.secondary{border:1px solid #f0d9cc;background:var(--soft-orange);color:#aa3d0e}.actions .refresh,.empty button{padding:6px 11px;border-radius:8px;min-height:32px}.actions .cancel{font-size:12px;white-space:nowrap}
    .quiet{border:0;background:none;color:#a44217;padding:4px 2px;text-decoration:underline;text-underline-offset:3px}.stamp{font-size:11px;color:var(--muted)}
    .tools{padding:12px 16px 8px;flex-shrink:0;max-height:55%;overflow:auto}.search-row{display:flex}.search{flex:1;min-height:36px}
    .search{min-width:0;width:100%;border:1px solid #dddfe3;border-radius:8px;background:#fff;padding:7px 9px;color:var(--ink)}input::placeholder{color:var(--muted)}
    .filters{margin-top:10px}.course-filter{height:36px;min-width:0;width:100%;font-size:12px;border:1px solid #e4e1de;border-radius:8px;background:#fff;padding:7px 10px;color:#55545a;text-overflow:ellipsis;cursor:pointer}.course-filter:hover{border-color:#e3bda6}.course-filter:focus-visible{outline:2px solid #ffb486;outline-offset:1px}.course-filter.is-filtered{border-color:#f1cbb5;color:#a44217;background:#fffaf6}
    .sort-row{display:flex;align-items:center;gap:12px;margin-top:10px;min-height:32px}.sort-label{font-size:11px;color:var(--muted);flex-shrink:0}.sort-options{display:flex;gap:6px;flex-wrap:wrap}.sort-choice{position:relative;cursor:pointer}.sort-choice input{position:absolute;opacity:0;width:1px;height:1px;margin:0}.sort-choice span{display:block;padding:5px 10px;border:1px solid transparent;border-radius:16px;font-size:12px;line-height:20px;color:#747079}.sort-choice:hover span{color:#a44217;background:#fff7f2}.sort-choice input:checked+span{background:#fff0e5;border-color:#f6d7c2;color:#a44217;font-weight:500}.sort-choice input:focus-visible+span{outline:2px solid var(--orange);outline-offset:1px}
    .filter-options{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;min-height:32px}.learning-check{display:flex;align-items:center;gap:7px;min-height:32px;color:#66636a;font-size:12px;cursor:pointer;width:fit-content}.learning-check input{width:15px;height:15px;margin:0;accent-color:var(--orange);cursor:pointer}.filter-options .reset-filters{font-size:11px;text-decoration:none;white-space:nowrap}.filter-options .reset-filters:hover{text-decoration:underline}
    .status{font-size:11px;color:#747079;margin-top:7px;min-height:17px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.status.error{color:#a33327}.status.quiet-status{position:absolute;width:1px;height:1px;min-height:0;margin:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    .summary{padding:5px 16px 10px;font-size:11px;color:var(--muted);flex-shrink:0;gap:5px;flex-wrap:wrap}.summary b{color:var(--ink);font-size:15px;margin-right:3px;font-variant-numeric:tabular-nums}.summary .reset-filters{font-size:11px}.list{flex:1;min-height:0;overflow:auto;padding:0 12px 8px;overscroll-behavior:contain}
    .card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:8px}.course{font-size:11px;color:var(--muted);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.title{font-size:14px;font-weight:550;line-height:1.5;margin:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .meta{flex-wrap:wrap;margin-top:6px;font-size:11px;gap:5px;color:var(--muted)}.expiry{color:#aa3d0e;background:var(--soft-orange);padding:2px 5px;border-radius:4px}.urgent{color:#a33327;background:#ffebe0;font-weight:600}.muted{color:var(--muted)}
    .card button{align-self:center;border:1px solid #ffd4bf;background:var(--soft-orange);color:#aa3d0e;border-radius:7px;padding:6px 8px;white-space:nowrap;min-height:32px;font-size:12px}.empty{text-align:center;padding:24px 12px;color:var(--muted);font-size:12px}.empty strong{display:block;color:var(--ink);font-size:15px;font-weight:550;margin-bottom:6px}.empty button{margin-top:10px}
    .footer{border-top:1px solid var(--line);padding:8px 12px;font-size:11px;color:var(--muted);flex-shrink:0;flex-wrap:wrap;gap:5px}.footer .quiet{font-size:11px;color:var(--muted)}.footer .more{font-size:12px;padding:6px 10px;border-radius:7px;margin-right:auto}.footer .clear{margin-left:auto}.clear-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%;padding:6px 0}.clear-confirm span{width:100%}.confirm-clear{border:1px solid #a33327;color:#a33327;background:#fff;padding:5px 9px;border-radius:6px}
    [hidden]{display:none!important}
    @media(max-width:420px){.actions button{padding-left:8px;padding-right:8px}}
    @media(max-height:540px){dialog{overflow:auto}.shell{height:auto;min-height:100%}.tools{max-height:none;overflow:visible}.list{flex:none;min-height:120px;max-height:240px}}
  </style>
  <div class="dock"><button class="launch" aria-label="展开知识红包" title="展开知识红包" aria-haspopup="dialog" aria-controls="dd-rp-dialog" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg><span class="dock-label">知识<br>红包</span><span class="dock-count" hidden></span></button><button class="drag-handle" aria-label="移动知识红包位置" title="拖动移动 · 方向键微调 · Home 恢复位置"><svg viewBox="0 0 18 14" fill="currentColor" aria-hidden="true"><circle cx="5" cy="3" r="1.5"/><circle cx="12" cy="3" r="1.5"/><circle cx="5" cy="7" r="1.5"/><circle cx="12" cy="7" r="1.5"/><circle cx="5" cy="11" r="1.5"/><circle cx="12" cy="11" r="1.5"/></svg></button></div>
  <dialog aria-modal="false" id="dd-rp-dialog" aria-labelledby="dd-rp-title"><div class="shell">
    <header><div class="top"><div class="heading"><button class="drag-handle" aria-label="移动知识红包位置" title="拖动移动 · 方向键微调 · Home 恢复位置"><svg viewBox="0 0 18 14" fill="currentColor" aria-hidden="true"><circle cx="5" cy="3" r="1.5"/><circle cx="12" cy="3" r="1.5"/><circle cx="5" cy="7" r="1.5"/><circle cx="12" cy="7" r="1.5"/><circle cx="5" cy="11" r="1.5"/><circle cx="12" cy="11" r="1.5"/></svg></button><div><h1 id="dd-rp-title">知识红包</h1><p class="intro">已领取 · 课程红包</p></div></div><div class="actions"><button class="primary refresh" aria-label="刷新红包">刷新</button><button class="quiet cancel" hidden>停止</button><button class="collapse" aria-label="收起知识红包" title="收起为浮条"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div></div></header>
    <div class="tools"><div class="search-row"><input class="search" type="search" aria-label="搜索文章或课程" placeholder="搜索文章或课程" autofocus></div>
    <div class="filters" id="dd-rp-filters"><select class="course-filter" aria-label="筛选课程"><option value="">全部课程</option></select></div>
    <div class="sort-row"><span class="sort-label" id="dd-sort-label">排序</span><div class="sort-options" role="radiogroup" aria-labelledby="dd-sort-label">
      <label class="sort-choice"><input type="radio" name="dd-sort" value="expiry" checked><span>即将到期</span></label>
      <label class="sort-choice"><input type="radio" name="dd-sort" value="recent"><span>最近领取</span></label>
    </div></div>
    <div class="filter-options"><label class="learning-check"><input class="hide-completed" type="checkbox">隐藏已学完</label><button class="quiet reset-filters" aria-label="重置筛选" hidden>重置</button></div>
    <div class="status quiet-status" role="status" aria-live="polite">打开后自动读取已领取的课程红包。</div></div>
    <div class="summary"><span><b class="count">0</b>篇<span class="count-context">有效红包</span></span><span class="stamp">尚未刷新</span></div><div class="list" aria-label="知识红包列表"></div>
    <div class="footer"><button class="secondary more" hidden>加载更早的红包</button><button class="quiet clear" aria-label="清除本账号缓存">清缓存</button><div class="clear-confirm" hidden><span>仅清除本机列表，得到账号中的内容会保留。</span><button class="confirm-clear">确认清除</button><button class="quiet cancel-clear">取消</button></div></div>
  </div></dialog>`;
  document.documentElement.append(host);
  const $ = selector => shadow.querySelector(selector);
  let account = '', items = [], updatedAt = 0, cursor = 0, hasMore = false, busy = false, reading = false, cancelled = false, opening = false;
  let visited = new Set();
  let syncedAt = 0, sortOrder = 'expiry';
  const autoAttempts = new Map();
  const key = id => `redpacket:v2:${id}`;
  const positionKey = 'redpacket:widget-position';
  let position = { right: 20, top: 84 }, positionChanged = false;
  function placeWidget() {
    const el = $('dialog').open ? $('dialog') : $('.dock');
    const rect = el.getBoundingClientRect();
    const point = C.widgetPosition(position, { width: innerWidth, height: innerHeight }, { width: rect.width, height: rect.height });
    el.style.right = `${point.right}px`; el.style.top = `${point.top}px`;
    return point;
  }
  function persistPosition() {
    positionChanged = true;
    chrome.storage.local.set({ [positionKey]: position }).catch(() => status('位置保存失败，本次移动仍有效', true));
  }
  const positionReady = chrome.storage.local.get(positionKey).then(saved => {
    if (!positionChanged && saved[positionKey]) position = saved[positionKey];
    placeWidget();
  }).catch(() => placeWidget());
  window.addEventListener('resize', placeWidget);
  function makeDraggable(surface) {
    let drag = null, suppressUntil = 0;
    surface.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !e.isPrimary || e.target.closest('button:not(.drag-handle),input,select,a')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: placeWidget(), original: position, moved: false };
      positionChanged = true;
      surface.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.target.closest('.drag-handle')?.focus({ preventScroll: true });
    });
    surface.addEventListener('dragstart', e => e.preventDefault());
    surface.addEventListener('pointermove', e => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 5) return;
      drag.moved = true; surface.classList.add('dragging'); e.preventDefault();
      position = { right: drag.start.right - dx, top: drag.start.top + dy };
      position = placeWidget();
    });
    const finish = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const current = drag; drag = null; surface.classList.remove('dragging');
      if (e.type === 'pointercancel') { position = current.original; placeWidget(); }
      else if (current.moved) { suppressUntil = performance.now() + 300; persistPosition(); }
      if (surface.hasPointerCapture(e.pointerId)) surface.releasePointerCapture(e.pointerId);
    };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) surface.addEventListener(event, finish);
    surface.addEventListener('click', e => { if (performance.now() < suppressUntil && !e.target.closest('button:not(.drag-handle)')) { e.preventDefault(); e.stopPropagation(); } }, true);
  }
  makeDraggable($('header')); makeDraggable($('.dock .drag-handle'));
  for (const handle of shadow.querySelectorAll('.drag-handle')) {
    handle.addEventListener('keydown', e => {
      const directions = { ArrowLeft: [1, 0], ArrowRight: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (e.key === 'Home') position = { right: 20, top: 84 };
      else if (directions[e.key]) { const p = placeWidget(), [x, y] = directions[e.key], step = e.shiftKey ? 40 : 10; position = { right: p.right + x * step, top: p.top + y * step }; }
      else return;
      e.preventDefault(); position = placeWidget(); persistPosition();
    });
    handle.addEventListener('dblclick', () => { position = { right: 20, top: 84 }; placeWidget(); persistPosition(); });
  }
  const formatTime = value => new Date(value).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  function status(message, error = false) { $('.status').textContent = message; $('.status').title = message; $('.status').classList.toggle('error', error); $('.status').classList.toggle('quiet-status', !error && !busy); }
  function setBusy(value, allowCancel = false) {
    busy = value;
    $('.status').classList.toggle('quiet-status', !value && !$('.status').classList.contains('error'));
    for (const el of shadow.querySelectorAll('.refresh,.more,.clear,.confirm-clear')) el.disabled = value;
    $('.cancel').hidden = !value || !allowCancel;
    $('.list').setAttribute('aria-busy', String(value));
  }
  function resetFilters() {
    $('.search').value = ''; $('.course-filter').value = ''; sortOrder = 'expiry'; $('.hide-completed').checked = false; persistLearningFilter();
    $('.list').scrollTop = 0; draw(); $('.search').focus();
  }
  function closePanel(restoreFocus = true) {
    $('dialog').close(); $('.dock').hidden = false; $('.launch').setAttribute('aria-expanded', 'false'); placeWidget();
    if (restoreFocus) $('.launch').focus();
  }
  function draw() {
    const scrollTop = $('.list').scrollTop;
    const validCount = items.filter(i => i.status === 'active').length;
    $('.dock-count').hidden = !account; $('.dock-count').textContent = `${validCount} 篇`;
    $('.launch').setAttribute('aria-label', account ? `展开知识红包，${validCount} 篇有效` : '展开知识红包');
    const selected = $('.course-filter').value;
    const courses = [...new Set(items.filter(i => i.status === 'active').map(i => i.course))].sort();
    $('.course-filter').replaceChildren(new Option('全部课程', ''));
    for (const name of courses) $('.course-filter').append(new Option(name, name));
    $('.course-filter').value = courses.includes(selected) ? selected : '';
    const course = $('.course-filter').value;
    if (course) $('.course-filter').title = course; else $('.course-filter').removeAttribute('title');
    $('.course-filter').classList.toggle('is-filtered', Boolean(course));
    for (const radio of shadow.querySelectorAll('[name="dd-sort"]')) radio.checked = radio.value === sortOrder;
    const filtered = Boolean($('.search').value.trim() || course || $('.hide-completed').checked || sortOrder !== 'expiry');
    $('.reset-filters').hidden = !filtered;
    $('.count-context').textContent = filtered ? '筛选结果' : '有效红包';
    const rows = C.filter(items, { query: $('.search').value, course: $('.course-filter').value, status: 'active', sort: sortOrder, hideCompleted: $('.hide-completed').checked });
    $('.count').textContent = String(rows.length); $('.list').replaceChildren();
    $('.more').hidden = !hasMore;
    $('.stamp').textContent = updatedAt ? `上次核验 ${formatTime(updatedAt)}` : '尚未刷新';
    if (!rows.length) {
      const box = document.createElement('div'); box.className = 'empty';
      const title = document.createElement('strong'); title.textContent = busy ? '正在加载红包…' : items.length ? '这个筛选下还没有文章' : '等一篇值得读的好内容';
      const text = document.createElement('div'); text.textContent = busy ? '已领取的红包会陆续显示，无需等全部结束。' : items.length ? '试试其他关键词、课程或状态。' : '请刷新已领取列表；历史红包可继续加载。';
      box.append(title, text);
      const action = document.createElement('button'); action.className = 'secondary';
      action.textContent = filtered ? '重置筛选' : '刷新红包';
      action.addEventListener('click', filtered ? resetFilters : () => sync());
      if (!busy) box.append(action); $('.list').append(box);
    }
    for (const item of rows) {
      const card = document.createElement('article'); card.className = 'card';
      const info = document.createElement('div'), course = document.createElement('div'), title = document.createElement('h2'), meta = document.createElement('div'), expiry = document.createElement('span');
      course.className = 'course'; course.textContent = item.course; course.title = item.course; title.className = 'title'; title.textContent = item.title; title.title = item.title;
      meta.className = 'meta'; expiry.className = item.status === 'active' ? 'expiry' : 'muted';
      expiry.textContent = item.status === 'active' ? (item.expiresOn ? `有效至 ${item.expiresOn}` : '红包有效') : item.status === 'unknown' ? '权益状态暂未获取' : '红包权益已失效';
      if (item.status === 'active' && item.expireAt > Date.now() && item.expireAt - Date.now() <= 86400000) {
        expiry.classList.add('urgent'); expiry.textContent += ' · 24小时内到期';
      }
      meta.append(expiry);
      if (item.completed === true) { const learned = document.createElement('span'); learned.textContent = '已学完'; meta.append(learned); }
      info.append(course, title, meta); card.append(info);
      if (item.status === 'active') { const read = document.createElement('button'); read.className = 'read'; read.textContent = '阅读 ↗'; read.setAttribute('aria-label', `阅读《${item.title}》（新标签页）`); read.disabled = reading; read.addEventListener('click', () => readArticle(item)); card.append(read); }
      $('.list').append(card);
    }
    $('.list').scrollTop = scrollTop;
    if (!$('dialog').open) placeWidget();
  }
  const preferenceKey = id => `redpacket:preferences:${id}`;
  function persistLearningFilter() {
    if (account) chrome.storage.local.set({ [preferenceKey(account)]: { hideCompleted: $('.hide-completed').checked } }).catch(() => status('学习筛选设置保存失败，请重试', true));
  }
  async function loadAccount() {
    const ctx = await rpc('context');
    if (account !== ctx.account) { account = ctx.account; items = []; cursor = 0; hasMore = false; visited.clear(); updatedAt = 0; syncedAt = 0; }
    const stored = await chrome.storage.local.get([key(account), preferenceKey(account)]);
    $('.hide-completed').checked = C.hideCompletedPreference(stored[preferenceKey(account)]);
    let saved = stored[key(account)];
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
    // Retain articles updated in another tab while this panel was open.
    const latest = (await chrome.storage.local.get(key(expectedAccount)))[key(expectedAccount)];
    const previous = Array.isArray(latest?.items) ? latest.items.map(i => C.cachedItem(i)).filter(Boolean) : [];
    items = C.merge(previous, items).map(i => C.cachedItem(i)).filter(Boolean);
    syncedAt = Math.max(syncedAt, Number.isFinite(latest?.syncedAt) ? latest.syncedAt : 0);
    await chrome.storage.local.set({ [key(expectedAccount)]: { version: 1, items, updatedAt, syncedAt, cursor, hasMore } });
  }
  async function open() {
    if (opening) return;
    $('.clear-confirm').hidden = true;
    if (! $('dialog').open) $('dialog').show();
    $('.dock').hidden = true; $('.launch').setAttribute('aria-expanded', 'true'); placeWidget();
    if (busy) return;
    opening = true; setBusy(true);
    let loaded = false;
    try { await loadAccount(); loaded = true; draw(); status(items.length ? '已载入缓存，最近更新仍有效。' : '已连接当前得到账号。'); }
    catch (e) { account = ''; items = []; updatedAt = 0; hasMore = false; draw(); status(e.message, true); }
    finally { opening = false; setBusy(false); }
    if (loaded && $('dialog').open) {
      if (C.shouldAutoRefresh(syncedAt, autoAttempts.get(account))) {
        autoAttempts.set(account, Date.now());
        await sync(false, true);
      } else if (!syncedAt || Date.now() - syncedAt >= 300000) {
        status('刚刚已尝试自动更新，可点击刷新重试。');
      }
    }
  }
  async function sync(more = false, automatic = false) {
    if (busy || reading) return;
    setBusy(true, true); draw(); cancelled = false;
    $('.refresh').textContent = '更新中…';
    const originalAccount = account;
    try {
      const ctx = await rpc('context');
      if (!account || ctx.account !== account) { await loadAccount(); more = false; }
      const expectedAccount = account;
      const inbox = await rpc('inbox-context', { account });
      let examined = 0, failures = 0, verified = 0, pagingError = '';
      const checked = new Set();
      const identity = item => item.articleId ? `article:${item.articleId}` : item.enid;
      const verify = async batch => {
        const fresh = batch.filter(seed => seed.status !== 'expired' && !checked.has(identity(seed)));
        fresh.forEach(seed => checked.add(identity(seed)));
        await C.runLimited(fresh, 4, async seed => {
          let result;
          try { result = await rpc('article', seed); }
          catch { failures++; result = C.cachedItem(seed); }
          items = C.merge(items, [result]); updatedAt = Date.now(); verified++;
          draw();
          status(`已更新 ${verified} 篇文章详情，${items.filter(i => i.status === 'active').length} 篇有效红包${cancelled ? '，正在停止…' : '，继续加载中…'}`);
        }, () => cancelled);
      };
      if (!more) { cursor = 0; visited = new Set(); hasMore = false; }
      for (let n = 0; n < 5 && !cancelled; n++) {
        status(`正在读取已领取红包，第 ${n + 1} 页…`);
        try {
          const reply = await chrome.runtime.sendMessage({ type: 'received-list', uid: inbox.uid, cursor });
          if (reply?.error || !reply?.result) throw Error(reply?.error || '红包列表读取失败');
          if ((await rpc('context')).account !== expectedAccount) throw Error('账号已切换，请重新打开面板');
          const page = reply.result;
          examined += page.count;
          // Rights come directly from the received list; article requests enrich metadata.
          items = C.merge(items, page.items);
          draw();
          const pageKeys = new Set(page.items.map(identity));
          const next = C.nextCursor(page, cursor, visited);
          hasMore = next !== null;
          if (next !== null) { visited.add(String(next)); cursor = next; }
          await verify(items.filter(item => pageKeys.has(identity(item))));
          if (next === null) break;
        } catch (e) { pagingError = e.message; break; }
      }
      if (!more && !cancelled) await verify(items);
      updatedAt = Date.now();
      if (!more && !cancelled && !pagingError) syncedAt = updatedAt;
      await save(expectedAccount); draw();
      status(`${cancelled ? '已停止更新。' : '已更新。'}${items.filter(i => i.status === 'active').length} 篇有效红包。${failures ? ` ${failures} 篇文章详情暂未更新，已保留红包权益状态。` : ''}${hasMore ? ' 可加载更早领取的红包。' : ''}${pagingError ? ` ${pagingError}` : ''}`, Boolean(pagingError || failures));
    } catch (e) { if (originalAccount !== account) draw(); status(e.message, true); }
    finally { setBusy(false); $('.refresh').textContent = '刷新'; draw(); }
  }
  async function readArticle(item) {
    if (reading) return;
    const syncing = busy;
    reading = true;
    // Open during the click to avoid popup blockers, and close if rights fail.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;
    if (!syncing) setBusy(true);
    draw();
    try {
      const expectedAccount = account;
      const verified = await rpc('article', item);
      items = C.merge(items, [verified]); await save(expectedAccount); draw();
      if (verified.status !== 'active') throw Error('该红包权益已失效，列表已更新');
      const url = `https://www.dedao.cn/course/article?id=${encodeURIComponent(verified.enid)}`;
      if (tab) tab.location.href = url; else location.href = url;
    } catch (e) { if (tab) tab.close(); status(e.message, true); }
    finally { reading = false; if (!syncing) setBusy(false); draw(); }
  }
  $('.launch').addEventListener('click', () => $('dialog').open ? closePanel() : open());
  $('.collapse').addEventListener('click', () => closePanel());
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('dialog').open) { closePanel(); e.preventDefault(); }
  });
  $('.refresh').addEventListener('click', () => sync()); $('.more').addEventListener('click', () => sync(true));
  $('.cancel').addEventListener('click', () => { cancelled = true; status('正在停止，将保留已完成的核验结果…'); });
  $('.reset-filters').addEventListener('click', resetFilters);
  $('.hide-completed').addEventListener('change', () => { persistLearningFilter(); $('.list').scrollTop = 0; draw(); });
  for (const radio of shadow.querySelectorAll('[name="dd-sort"]')) radio.addEventListener('change', () => {
    if (radio.checked) { sortOrder = radio.value; $('.list').scrollTop = 0; draw(); }
  });
  for (const selector of ['.search', '.course-filter']) $(selector).addEventListener('input', () => { $('.list').scrollTop = 0; draw(); });
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
  positionReady.then(() => { if (location.hash === '#dd-redpacket') open(); });
})();
