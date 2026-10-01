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
});
