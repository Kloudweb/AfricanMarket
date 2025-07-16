
// Service Worker for AfricanMarket Application
// Implements caching strategies, offline support, and performance optimization

const CACHE_NAME = 'africanmarket-v1.0.0';
const STATIC_CACHE = 'africanmarket-static-v1.0.0';
const DYNAMIC_CACHE = 'africanmarket-dynamic-v1.0.0';
const IMAGE_CACHE = 'africanmarket-images-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/marketplace',
  '/cart',
  '/_next/static/css/',
  '/_next/static/js/',
  '/manifest.json'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Cache first for static assets
  CACHE_FIRST: 'cache-first',
  // Network first for dynamic content
  NETWORK_FIRST: 'network-first',
  // Stale while revalidate for semi-static content
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  // Network only for critical real-time data
  NETWORK_ONLY: 'network-only'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static assets', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  event.respondWith(
    handleRequest(request, url)
  );
});

// Main request handler
async function handleRequest(request, url) {
  try {
    // API requests - Network first strategy
    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest(request, url);
    }
    
    // Static assets - Cache first strategy
    if (url.pathname.startsWith('/_next/static/') || 
        url.pathname.includes('.js') || 
        url.pathname.includes('.css')) {
      return await handleStaticAsset(request);
    }
    
    // Images - Cache first with fallback
    if (url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      return await handleImageRequest(request);
    }
    
    // External resources (Cloudinary, etc.)
    if (url.origin !== location.origin) {
      return await handleExternalResource(request);
    }
    
    // Pages - Stale while revalidate
    return await handlePageRequest(request);
    
  } catch (error) {
    console.error('Service Worker: Error handling request', error);
    return await handleFallback(request);
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request, url) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  // Critical real-time endpoints - always use network
  if (url.pathname.includes('/orders/') || 
      url.pathname.includes('/payments/') ||
      url.pathname.includes('/auth/')) {
    return fetch(request);
  }
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Network failed, try cache
    console.log('Service Worker: Network failed, trying cache for:', url.pathname);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback
    return new Response(
      JSON.stringify({ 
        error: 'Network unavailable', 
        offline: true 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // Return cached version immediately
    return cachedResponse;
  }
  
  try {
    // Fetch from network and cache
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.error('Service Worker: Failed to fetch static asset', error);
    throw error;
  }
}

// Handle images with cache-first and optimization
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Only cache images under 5MB
      const contentLength = networkResponse.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 5 * 1024 * 1024) {
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
    
  } catch (error) {
    // Return placeholder image for failed requests
    return new Response(
      generateImagePlaceholder(),
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
}

// Handle external resources
async function handleExternalResource(request) {
  try {
    // Set shorter timeout for external resources
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000);
    
    return await fetch(request, { signal: controller.signal });
    
  } catch (error) {
    console.log('Service Worker: External resource failed:', request.url);
    throw error;
  }
}

// Handle page requests with stale-while-revalidate
async function handlePageRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Start network request (don't await)
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(error => {
      console.log('Service Worker: Network request failed', error);
      return null;
    });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Wait for network if no cache
  return networkPromise || handleFallback(request);
}

// Fallback handler for failed requests
async function handleFallback(request) {
  const url = new URL(request.url);
  
  // Return offline page for navigation requests
  if (request.mode === 'navigate') {
    return new Response(
      generateOfflinePage(),
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
  
  // Return error response for other requests
  return new Response(
    'Resource not available offline',
    { status: 503, statusText: 'Service Unavailable' }
  );
}

// Generate placeholder image
function generateImagePlaceholder() {
  return `
    <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#999" font-size="14">
        Image unavailable
      </text>
    </svg>
  `;
}

// Generate offline page
function generateOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - AfricanMarket</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex; 
          flex-direction: column;
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          margin: 0;
          background: #f5f5f5;
          color: #333;
        }
        .container {
          text-align: center;
          max-width: 400px;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #e74c3c; margin-bottom: 1rem; }
        button {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 1rem;
        }
        button:hover { background: #2980b9; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>You're offline</h1>
        <p>Please check your internet connection and try again.</p>
        <button onclick="window.location.reload()">Retry</button>
      </div>
    </body>
    </html>
  `;
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Handle background sync
async function handleBackgroundSync() {
  console.log('Service Worker: Handling background sync');
  // Implement offline action synchronization here
}

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('AfricanMarket', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/marketplace')
    );
  }
});
