// 离线缓存：自己的文件先走网络（保证更新），断网时用缓存；CDN 和字体先用缓存。
// 改了要强制所有手机刷新时，把 VERSION 加一。
const VERSION = 'v23';
const SHELL = ['./', 'index.html', 'style.css', 'i18n.js', 'app.js', 'data/food-data.js', 'data/site-data.js', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // no-cache：每次都跟服务器确认有没有新版本（没变只回 304，很省流量），改完推送后手机马上能拿到
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
  } else if (/unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
  }
  // 地图瓦片不缓存，直接走网络
});

// 推送：GitHub Actions 每晚发「夜宵提醒」（scripts/push/send.mjs）
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {} } catch { d = { body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || '今天吃什么', {
    body: d.body || '🌙 今天要不要吃点夜宵？', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'night', data: { url: d.url || './?night=1' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || './?night=1', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    for (const w of ws) if ('focus' in w) { w.navigate(url); return w.focus() }
    return self.clients.openWindow(url);
  }));
});
