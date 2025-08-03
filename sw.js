// Service Worker for Matt's Fitness Assistant PWA
// Version 1.0

const CACHE_NAME = 'fitness-assistant-v1';
const STATIC_CACHE_NAME = 'fitness-static-v1';
const DYNAMIC_CACHE_NAME = 'fitness-dynamic-v1';

// Files to cache immediately (app shell)
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Files to cache dynamically (API responses, etc.)
const DYNAMIC_FILES = [
  'https://horoscope-app-api.vercel.app/',
  'https://api.sunrise-sunset.org/',
  'https://qwzyypcnxbfkqrxmgbsh.supabase.co/'
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('SW: Install event');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('SW: Caching app shell');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('SW: App shell cached successfully');
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Error caching app shell:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('SW: Activate event');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName.startsWith('fitness-')) {
              console.log('SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Old caches cleaned up');
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleOtherRequests(request));
  }
});

// Check if request is for static assets
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.ico') ||
         url.hostname === 'cdnjs.cloudflare.com' ||
         url.hostname === 'cdn.jsdelivr.net';
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.hostname === 'qwzyypcnxbfkqrxmgbsh.supabase.co' ||
         url.hostname === 'api.openai.com' ||
         url.hostname === 'horoscope-app-api.vercel.app' ||
         url.hostname === 'api.sunrise-sunset.org';
}

// Check if request is navigation
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// Handle static assets - cache first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('SW: Serving cached static asset:', request.url);
      return cachedResponse;
    }
    
    // If not in cache, fetch and cache
    console.log('SW: Fetching and caching static asset:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const responseClone = networkResponse.clone();
      cache.put(request, responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('SW: Error handling static asset:', error);
    // Return cached version if available, otherwise let request fail
    const cache = await caches.open(STATIC_CACHE_NAME);
    return await cache.match(request) || new Response('Asset not available offline', { status: 503 });
  }
}

// Handle API requests - network first, then cache
async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    
    // Try network first
    console.log('SW: Fetching API request:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Cache successful responses (except POST/PUT/DELETE)
      if (request.method === 'GET') {
        const responseClone = networkResponse.clone();
        cache.put(request, responseClone);
      }
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('SW: Network failed, trying cache for:', request.url);
    
    // If network fails, try cache
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('SW: Serving cached API response:', request.url);
      return cachedResponse;
    }
    
    // If it's a Supabase request and we have no cache, return offline message
    if (request.url.includes('supabase.co')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This feature requires an internet connection',
          offline: true 
        }), 
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For other APIs, let the request fail naturally
    throw error;
  }
}

// Handle navigation requests - always serve app shell
async function handleNavigationRequest(request) {
  try {
    console.log('SW: Handling navigation request:', request.url);
    
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('SW: Network failed for navigation, serving app shell');
    
    // If network fails, serve the cached app shell
    const cache = await caches.open(STATIC_CACHE_NAME);
    const appShell = await cache.match('/') || await cache.match('/index.html');
    
    if (appShell) {
      return appShell;
    }
    
    // Fallback offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fitness Assistant - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 20px;
          }
          .container { max-width: 400px; }
          h1 { margin-bottom: 20px; }
          p { margin-bottom: 30px; opacity: 0.9; }
          button { 
            background: white; 
            color: #667eea; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 8px; 
            font-weight: 600; 
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🏔️ Fitness Assistant</h1>
          <p>You're currently offline. The app will work when you're back online.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle other requests
async function handleOtherRequests(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('SW: Request failed:', request.url);
    return new Response('Request failed', { status: 503 });
  }
}

// Background sync for when the app comes back online
self.addEventListener('sync', (event) => {
  console.log('SW: Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('SW: Performing background sync');
  
  try {
    // Notify all clients that we're back online
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        message: 'App is back online!'
      });
    });
  } catch (error) {
    console.error('SW: Background sync failed:', error);
  }
}

// Handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('SW: Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(cacheUrls(event.data.urls));
  }
});

// Cache specific URLs (for dynamic caching)
async function cacheUrls(urls) {
  const cache = await caches.open(DYNAMIC_CACHE_NAME);
  
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (response && response.status === 200) {
        await cache.put(url, response);
        console.log('SW: Cached URL:', url);
      }
    } catch (error) {
      console.log('SW: Failed to cache URL:', url, error);
    }
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  console.log('SW: Periodic sync event:', event.tag);
  
  if (event.tag === 'fitness-data-sync') {
    event.waitUntil(syncFitnessData());
  }
});

async function syncFitnessData() {
  console.log('SW: Syncing fitness data in background');
  
  try {
    // This could sync with Supabase to get latest data
    // For now, just log that sync happened
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'DATA_SYNC',
        message: 'Fitness data synced in background'
      });
    });
  } catch (error) {
    console.error('SW: Data sync failed:', error);
  }
}

// Push notification handling (for future use)
self.addEventListener('push', (event) => {
  console.log('SW: Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Time for your workout!',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'log-workout',
        title: 'Log Workout',
        icon: '/icon-workout.png'
      },
      {
        action: 'log-weight',
        title: 'Log Weight',
        icon: '/icon-weight.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Fitness Assistant', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notification clicked:', event.action);
  
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll().then(clients => {
      // If app is already open, focus it
      if (clients.length > 0) {
        clients[0].focus();
        if (event.action) {
          clients[0].postMessage({
            type: 'NOTIFICATION_ACTION',
            action: event.action
          });
        }
      } else {
        // Open the app
        const urlToOpen = event.action ? `/?action=${event.action}` : '/';
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

console.log('SW: Service worker loaded successfully');