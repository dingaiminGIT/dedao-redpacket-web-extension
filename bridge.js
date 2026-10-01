(() => {
  'use strict';
  if (window.__ddRedpacketBridge) return;
  window.__ddRedpacketBridge = true;
  const C = window.DDRedpacketCore;
  const recentPath = '/api/pc/blade/v2/recent';
  const articlePath = '/pc/bauhinia/pc/article/info';
  async function request(path, data) {
    const csrf = document.cookie.split('; ').find(s => s.startsWith('csrfToken='))?.slice(10) || '';
    const r = await fetch(path, {
      method: data ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'Xi-DT': 'web', 'Xi-Csrf-Token': decodeURIComponent(csrf) },
      body: data ? JSON.stringify(data) : undefined, signal: AbortSignal.timeout(12000)
    });
    if (r.status === 401) throw Error('登录已失效，请先在得到网页重新登录');
    if (!r.ok) throw Error(`官方接口暂不可用（HTTP ${r.status}）`);
    const result = await r.json();
    if (result.h?.c !== 0) throw Error(`官方接口未通过核验（${result.h?.c ?? '响应格式变化'}）`);
    return result.c;
  }
  async function context() {
    const user = await request('/api/pc/user/info');
    const state = window.__INITIAL_STATE__ || {};
    if (!user.uid_hazy || !state.uid) throw Error('请先登录得到网页版，再打开知识红包');
    return { account: String(user.uid_hazy), uid: Number(state.uid) };
  }
  async function execute(command, args) {
    if (command === 'context') return { account: (await context()).account };
    if (command === 'recent') {
      const ctx = await context();
      if (ctx.account !== args.account) throw Error('账号已切换，请重新打开知识红包');
      const data = await request(recentPath, { page_size: 20, max_id: args.cursor || 0, product_type: '', filter_product_type: true, uid: ctx.uid, uid_hazy: ctx.account });
      if (!Array.isArray(data.list)) throw Error('学习记录格式已变化');
      return { items: data.list.map(C.candidate).filter(Boolean), count: data.list.length, has_more: data.has_more, timestamp: data.timestamp };
    }
    if (command === 'article') {
      if (!C.enid(args.enid)) throw Error('文章链接无效');
      const data = await request(articlePath, { detail_id: args.enid, with_perm_info: true });
      return C.article(data, args);
    }
    if (command === 'current') {
      const u = new URL(location.href);
      if (u.pathname === '/course/article' && C.enid(u.searchParams.get('id'))) return { enid: u.searchParams.get('id') };
      const packet = window.__INITIAL_STATE__?.packetInfo;
      if (u.pathname === '/share/trialReading' && packet?.has_authority === true && C.enid(packet.enid)) return { enid: packet.enid };
      throw Error('当前不是已有阅读权限的课程文章，请先登录并打开已领取的红包分享页');
    }
    throw Error('不支持的操作');
  }
  // Fixed read-only commands; neither session secrets nor raw API responses cross worlds.
  window.addEventListener('message', async event => {
    const m = event.data;
    if (event.source !== window || event.origin !== location.origin || m?.channel !== 'dd-redpacket-request-v1' || typeof m.id !== 'string') return;
    try {
      const result = await execute(m.command, m.args || {});
      window.postMessage({ channel: 'dd-redpacket-response-v1', id: m.id, result }, location.origin);
    } catch (e) {
      window.postMessage({ channel: 'dd-redpacket-response-v1', id: m.id, error: C.clean(e.message || '请求失败') }, location.origin);
    }
  });
})();
