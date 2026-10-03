importScripts('core.js');
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: 'https://www.dedao.cn/#dd-redpacket' }));
chrome.tabs.onRemoved.addListener(id => chrome.storage.session.remove(`reading:${id}`));
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab?.id || !sender.url?.startsWith('https://www.dedao.cn/')) return;
  if (['reading-open', 'reading-get', 'reading-save', 'reading-clear'].includes(message.type)) {
    (async () => {
      const key = `reading:${sender.tab.id}`;
      if (message.type === 'reading-get') { reply({ result: (await chrome.storage.session.get(key))[key] || null }); return; }
      if (message.type === 'reading-clear') { await chrome.storage.session.remove(key); reply({ result: true }); return; }
      const queue = DDRedpacketCore.readingQueue(message.queue);
      if (message.type === 'reading-save') { await chrome.storage.session.set({ [key]: queue }); reply({ result: true }); return; }
      const current = queue.items.find(i => i.enid === message.enid && DDRedpacketCore.enid(i.enid));
      if (!current || current.status !== 'active') throw Error('文章不在有效阅读列表中');
      const tab = await chrome.tabs.create({ url: 'about:blank' });
      try {
        // Store before navigating so the new content script can restore immediately.
        await chrome.storage.session.set({ [`reading:${tab.id}`]: queue });
        await chrome.tabs.update(tab.id, { url: `https://www.dedao.cn/course/article?id=${encodeURIComponent(current.enid)}` });
      } catch (error) {
        await chrome.storage.session.remove(`reading:${tab.id}`);
        await chrome.tabs.remove(tab.id);
        throw error;
      }
      reply({ result: true });
    })().catch(error => reply({ error: DDRedpacketCore.clean(error.message) }));
    return true;
  }
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
