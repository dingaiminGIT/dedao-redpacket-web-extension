importScripts('core.js');
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: 'https://www.dedao.cn/#dd-redpacket' }));
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab?.id || !sender.url?.startsWith('https://www.dedao.cn/')) return;
  if (message.type === 'received-list') {
    const uid = DDRedpacketCore.articleId(message.uid);
    const cursor = Number(message.cursor || 0);
    if (!uid || !Number.isSafeInteger(cursor) || cursor < 0) { reply({ error: '红包列表参数无效' }); return; }
    (async () => {
      const response = await fetch('https://m.igetget.com/native/api/redPacket/products', {
        method: 'POST', credentials: 'omit', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, count: 20, type: 0, ...(cursor ? { max_timestamp: cursor } : {}) }),
        signal: AbortSignal.timeout(12000)
      });
      if (!response.ok) throw Error(`红包列表暂不可用（HTTP ${response.status}）`);
      const result = await response.json();
      if (result.h?.c !== 0) throw Error('红包列表接口暂不可用，请稍后重试');
      reply({ result: DDRedpacketCore.receivedPage(result.c) });
    })().catch(error => reply({ error: DDRedpacketCore.clean(error.message) }));
    return true;
  }
  if (message.type === 'import-link') {
    const url = DDRedpacketCore.allowedLink(message.url || '');
    if (!url) { reply({ error: '请使用得到课程文章、分享页或 d.dedao.cn 短链接' }); return; }
    (async () => {
      const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
      await chrome.storage.session.set({ [`import:${tab.id}`]: Date.now() });
      await chrome.tabs.update(tab.id, { url, active: true });
      reply({ ok: true });
    })().catch(() => reply({ error: '打开分享链接失败，请重试' }));
    return true;
  }
  if (message.type === 'consume-import') {
    const key = `import:${sender.tab.id}`;
    chrome.storage.session.get(key).then(async value => {
      await chrome.storage.session.remove(key);
      reply({ pending: Boolean(value[key] && Date.now() - value[key] < 120000) });
    }).catch(() => reply({ pending: false }));
    return true;
  }
});
chrome.tabs.onRemoved.addListener(id => chrome.storage.session.remove(`import:${id}`));
