/* ============================================================
   Training 4M — Service Worker v5
   Background Sync · Smart Cache · Push · Offline Premium
   ============================================================ */

const APP_VERSION = "5.0.0";
const CACHE_STATIC = "t4m-static-v5";
const CACHE_DYNAMIC = "t4m-dynamic-v5";
const CACHE_IMAGES = "t4m-images-v5";

const STATIC_FILES = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"
];

/* ============================================================
   INSTALL — Pre-cache all static assets
   ============================================================ */
self.addEventListener("install", event => {
  console.log("[SW v5] Installing...");
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(STATIC_FILES).catch(err => {
        console.warn("[SW] Partial cache (some CDN files may be missing offline):", err);
        // Cache what we can, don't block install
        return Promise.allSettled(
          STATIC_FILES.map(url => cache.add(url).catch(() => {}))
        );
      });
    }).then(() => {
      console.log("[SW v5] Install complete");
      return self.skipWaiting();
    })
  );
});

/* ============================================================
   ACTIVATE — Clean old caches + claim clients
   ============================================================ */
self.addEventListener("activate", event => {
  console.log("[SW v5] Activating...");
  const currentCaches = [CACHE_STATIC, CACHE_DYNAMIC, CACHE_IMAGES];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !currentCaches.includes(k))
          .map(k => {
            console.log("[SW] Deleting old cache:", k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ============================================================
   FETCH — Strategy Router
   ============================================================ */
self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (!request.url.startsWith("http")) return;

  const url = new URL(request.url);

  // CDN (Chart.js etc.) → Cache First with long TTL
  if (url.hostname.includes("cdn.jsdelivr.net") ||
      url.hostname.includes("cdnjs.cloudflare.com") ||
      url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(cdnCacheFirst(request));
    return;
  }

  // Images → Cache First
  if (/\.(png|jpg|jpeg|gif|svg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(imageCacheFirst(request));
    return;
  }

  // HTML → Network First (always fresh)
  if (request.mode === "navigate" ||
      url.pathname.endsWith(".html") ||
      url.pathname === "/" ||
      url.pathname.endsWith("/Programme/")) {
    event.respondWith(networkFirstWithOffline(request));
    return;
  }

  // JS / CSS / JSON → Stale While Revalidate
  if (/\.(js|css|json|woff|woff2)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Default → Network First
  event.respondWith(networkFirstWithOffline(request));
});

/* ============================================================
   CACHE STRATEGIES
   ============================================================ */

// Cache First — for CDN assets
async function cdnCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("/* CDN unavailable */", {
      status: 503,
      headers: { "Content-Type": "application/javascript" }
    });
  }
}

// Image Cache First
async function imageCacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_IMAGES);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return 1x1 transparent PNG if image not available
    return new Response(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
      { status: 200, headers: { "Content-Type": "image/png" } }
    );
  }
}

// Network First with Offline Fallback
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await caches.match("./offline.html");
      return offline || new Response(offlineFallbackHTML(), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" }
      });
    }
    return new Response(JSON.stringify({ error: "offline", version: APP_VERSION }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}

// Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_STATIC);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || new Response("", { status: 503 });
}

/* ============================================================
   BACKGROUND SYNC
   ============================================================ */
self.addEventListener("sync", event => {
  console.log("[SW] Background sync:", event.tag);

  if (event.tag === "sync-sessions") {
    event.waitUntil(syncSessions());
  }
  if (event.tag === "sync-charges") {
    event.waitUntil(syncCharges());
  }
  if (event.tag === "sync-measurements") {
    event.waitUntil(syncMeasurements());
  }
});

async function syncSessions() {
  // Reads pending data from IndexedDB and syncs to server if available
  // Currently logs — ready for future backend integration (Firebase / Supabase)
  console.log("[SW] Syncing sessions...");
  try {
    const db = await openDB();
    const pending = await getAllFromStore(db, "pending_sessions");
    if (pending.length === 0) return;

    // TODO: Replace with actual API endpoint
    // await fetch('/api/sessions', { method: 'POST', body: JSON.stringify(pending) });

    console.log(`[SW] ${pending.length} sessions ready for sync`);
    await clearStore(db, "pending_sessions");

    // Notify client
    const clients = await self.clients.matchAll();
    clients.forEach(c => c.postMessage({
      type: "SYNC_COMPLETE",
      store: "sessions",
      count: pending.length
    }));
  } catch(err) {
    console.warn("[SW] Sync failed:", err);
    throw err; // Retry sync
  }
}

async function syncCharges() {
  console.log("[SW] Syncing charges...");
  // Ready for backend integration
}

async function syncMeasurements() {
  console.log("[SW] Syncing measurements...");
  // Ready for backend integration
}

/* ============================================================
   INDEXEDDB HELPERS (for Background Sync)
   ============================================================ */
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("training4m_sync", 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("pending_sessions")) {
        db.createObjectStore("pending_sessions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pending_charges")) {
        db.createObjectStore("pending_charges", { keyPath: "id" });
      }
    };
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function clearStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* ============================================================
   PERIODIC BACKGROUND SYNC (Chrome 80+)
   ============================================================ */
self.addEventListener("periodicsync", event => {
  if (event.tag === "daily-reminder") {
    event.waitUntil(sendDailyReminder());
  }
  if (event.tag === "weekly-report") {
    event.waitUntil(sendWeeklyReport());
  }
});

async function sendDailyReminder() {
  const hour = new Date().getHours();
  // Only notify between 4:00 and 5:00
  if (hour !== 4) return;

  return self.registration.showNotification("💪 Training 4M", {
    body: "C'est l'heure de ta séance ! 04:20 — Allez champion ! ⚡",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    vibrate: [200, 100, 200],
    tag: "daily-reminder",
    requireInteraction: false,
    data: { url: "./", type: "reminder" },
    actions: [
      { action: "start", title: "🏋️ Démarrer" },
      { action: "snooze", title: "⏰ +30min" }
    ]
  });
}

async function sendWeeklyReport() {
  return self.registration.showNotification("📊 Rapport Hebdo — Training 4M", {
    body: "Ton résumé de la semaine est prêt. Regarde ta progression !",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: "weekly-report",
    data: { url: "./#stats", type: "report" },
    actions: [
      { action: "view", title: "📊 Voir les stats" }
    ]
  });
}

/* ============================================================
   PUSH NOTIFICATIONS
   ============================================================ */
self.addEventListener("push", event => {
  let data = {
    title: "💪 Training 4M",
    body: "C'est l'heure de ta séance ! 04:20 ⚡",
    url: "./",
    type: "workout"
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch {}

  const options = {
    body: data.body,
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: data.type || "t4m-notif",
    requireInteraction: data.type === "pr" || data.type === "milestone",
    data: { url: data.url || "./" },
    actions: getNotifActions(data.type)
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

function getNotifActions(type) {
  switch(type) {
    case "workout": return [
      { action: "start", title: "🏋️ Démarrer la séance" },
      { action: "skip", title: "Passer aujourd'hui" }
    ];
    case "pr": return [
      { action: "view", title: "🏆 Voir les stats" }
    ];
    case "hydration": return [
      { action: "log", title: "💧 Enregistrer" }
    ];
    default: return [
      { action: "open", title: "📱 Ouvrir" }
    ];
  }
}

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || "./";

  if (action === "skip" || action === "snooze") {
    // Snooze: send message to client
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then(clients => {
        clients.forEach(c => c.postMessage({ type: "SNOOZE_REMINDER" }));
      })
    );
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
      // Focus existing window if available
      for (const client of clients) {
        if (client.url.includes("/Programme/") || client.url.includes("localhost")) {
          if ("focus" in client) return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

/* ============================================================
   MESSAGE HANDLER
   ============================================================ */
self.addEventListener("message", event => {
  const { data } = event;

  switch(data?.type || data) {
    case "skipWaiting":
      self.skipWaiting();
      break;

    case "clearCache":
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .then(() => {
          event.ports?.[0]?.postMessage({ success: true });
        });
      break;

    case "getCacheSize":
      getCacheSize().then(size => {
        event.ports?.[0]?.postMessage({ size });
      });
      break;

    case "getVersion":
      event.ports?.[0]?.postMessage({ version: APP_VERSION });
      break;

    case "prefetchWeek":
      // Pre-cache resources for the coming week's workouts
      prefetchWorkoutData(data.week);
      break;
  }
});

/* ============================================================
   UTILITIES
   ============================================================ */
async function getCacheSize() {
  let total = 0;
  const keys = await caches.keys();
  for (const key of keys) {
    const cache = await caches.open(key);
    const requests = await cache.keys();
    total += requests.length;
  }
  return total;
}

async function prefetchWorkoutData(week) {
  // Pre-warm cache for next week's exercises
  console.log("[SW] Prefetching data for week:", week);
}

function offlineFallbackHTML() {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Training 4M — Hors ligne</title>
    <style>
      body{background:#09092d;color:#fff;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}
      .icon{font-size:72px;margin-bottom:24px}
      h1{font-size:28px;font-weight:800;color:#4b4bf9;margin-bottom:8px}
      p{color:rgba(255,255,255,0.7);font-size:15px;max-width:300px;line-height:1.5;margin-bottom:24px}
      button{background:#4b4bf9;color:#fff;border:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer}
    </style></head>
    <body>
      <div class="icon">📵</div>
      <h1>Mode hors-ligne</h1>
      <p>Pas de connexion détectée. Tes données restent disponibles localement.</p>
      <button onclick="location.reload()">🔄 Réessayer</button>
    </body></html>`;
}