// La versión anterior guardaba respuestas autenticadas en una caché compartida.
// Se elimina solo esa caché; los registros pendientes de IndexedDB se conservan.
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all(['apis', 'jirah-campo-pages-v1', 'jirah-campo-rsc-v1', 'jirah-campo-assets-v1'].map(name => caches.delete(name))));
});
