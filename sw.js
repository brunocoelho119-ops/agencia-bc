/* Service worker da Agência BC.
   - A página (index.html) vem sempre da internet primeiro; se estiver sem rede, abre a última versão guardada.
   - Bibliotecas e fontes com versão fixa ficam guardadas no aparelho.
   - Dados do Supabase NUNCA passam pelo cache: sempre direto da internet.
   Ao publicar uma mudança grande, aumente a VERSAO para limpar o cache antigo. */
var VERSAO = 'bc-v1';
var BASE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function guardar(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { var copia = res.clone(); caches.open(VERSAO).then(function (c) { c.put(req, copia); }); }
  return res;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Supabase e qualquer API: sem cache
  if (/supabase\.(co|in)$/.test(url.hostname) || url.pathname.indexOf('/rest/') === 0 || url.pathname.indexOf('/auth/') === 0) return;

  // Páginas: internet primeiro, cache se estiver offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(function (r) { return guardar('./index.html', r); }).catch(function () {
      return caches.match('./index.html');
    }));
    return;
  }

  // Bibliotecas com versão na URL e arquivos de fonte: cache primeiro
  if (/cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.gstatic\.com/.test(url.hostname)) {
    e.respondWith(caches.match(req).then(function (c) { return c || fetch(req).then(function (r) { return guardar(req, r); }); }));
    return;
  }

  // CSS das fontes e arquivos do próprio site: usa o guardado e atualiza por trás
  if (url.hostname === 'fonts.googleapis.com' || url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(function (c) {
      var rede = fetch(req).then(function (r) { return guardar(req, r); }).catch(function () { return c; });
      return c || rede;
    }));
  }
});
