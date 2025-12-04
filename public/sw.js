const CACHE_VERSION = "v1"
const APP_CACHE = `app-cache-${CACHE_VERSION}`

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) =>
      cache.addAll([
        "/",
        "/favicon.ico",
        "/icons/kingdom-hall.svg",
      ])
    )
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== APP_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

function isNavigation(req) {
  return req.mode === "navigate"
}

function isStatic(req) {
  const d = req.destination
  return d === "style" || d === "script" || d === "image" || d === "font"
}

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (isNavigation(req)) {
    event.respondWith(
      fetch(req).catch(() => caches.match("/") || caches.match(req))
    )
    return
  }
  if (isStatic(req)) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req).then((resp) => {
          const copy = resp.clone()
          caches.open(APP_CACHE).then((cache) => cache.put(req, copy))
          return resp
        })
        return cached || fetched
      })
    )
    return
  }
})
