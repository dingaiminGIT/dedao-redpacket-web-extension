(() => {
  'use strict';
  if (window.__ddRedpacketBridge) return;
  window.__ddRedpacketBridge = true;
  const C = window.DDRedpacketCore;
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
    return { account: String(user.uid_hazy) };
  }
  async function execute(command, args) {
    if (command === 'context') return { account: (await context()).account };
    if (command === 'inbox-context') {
      const ctx = await context();
      if (ctx.account !== args.account) throw Error('账号已切换，请重新打开知识红包');
      const group = await request('/api/hades/v1/group/has', { category: 'bauhinia' });
      if (!C.articleId(group.uid)) throw Error('无法取得当前账号标识，请重新登录得到网页');
      if ((await context()).account !== ctx.account) throw Error('账号已切换，请重新打开知识红包');
      return { account: ctx.account, uid: group.uid };
    }
    if (command === 'article') {
      let token = args.enid;
      if (!C.enid(token)) {
        if (!C.articleId(args.articleId) || !C.clean(args.title)) throw Error('文章标识无效');
        const search = await request('/api/search/v2/pc/searchallarticle', { content: C.clean(args.title), hl_num: 0, page: 1, size: 20, type: 0, request_id: '' });
        const matches = (search.list || []).filter(row => C.clean(row.title) === C.clean(args.title) && C.enid(row.extra?.token));
        for (const match of matches.slice(0, 5)) {
          const data = await request(articlePath, { detail_id: match.extra.token, with_perm_info: true });
          if (Number(data.article_id) === Number(args.articleId)) return C.article(data, { ...args, enid: match.extra.token });
        }
        throw Error('暂未匹配到对应网页文章，已保留为待核验');
      }
      const data = await request(articlePath, { detail_id: token, with_perm_info: true });
      if (C.articleId(args.articleId) && Number(data.article_id) !== Number(args.articleId)) throw Error('文章编号不匹配，已停止打开');
      return C.article(data, args);
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
