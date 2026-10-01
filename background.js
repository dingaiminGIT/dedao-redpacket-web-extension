importScripts('core.js');
chrome.action.onClicked.addListener(() => chrome.tabs.create({ url: 'https://www.dedao.cn/#dd-redpacket' }));
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab?.id || !sender.url?.startsWith('https://www.dedao.cn/')) return;
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
