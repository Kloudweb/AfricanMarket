
// Cache configuration for AfricanMarket application
// Implements multiple caching strategies for optimal performance

class CacheConfig {
  constructor() {
    this.strategies = {
      // Static assets - long-term caching
      static: {
        maxAge: 365 * 24 * 60 * 60, // 1 year
        staleWhileRevalidate: 60 * 60, // 1 hour
        paths: [
          '/_next/static/',
          '/images/',
          '/icons/',
          '/fonts/'
        ]
      },
      
      // API responses - short-term caching
      api: {
        maxAge: 5 * 60, // 5 minutes
        staleWhileRevalidate: 60, // 1 minute
        paths: [
          '/api/vendors',
          '/api/products',
          '/api/categories'
        ]
      },
      
      // Dynamic content - minimal caching
      dynamic: {
        maxAge: 0,
        staleWhileRevalidate: 30, // 30 seconds
        paths: [
          '/api/orders',
          '/api/cart',
          '/api/notifications'
        ]
      },
      
      // User-specific content - no caching
      private: {
        maxAge: 0,
        staleWhileRevalidate: 0,
        paths: [
          '/api/auth/',
          '/api/user/',
          '/api/payments/'
        ]
      }
    };
  }

  // Get cache headers for a given path
  getCacheHeaders(path) {
    for (const [strategy, config] of Object.entries(this.strategies)) {
      if (config.paths.some(p => path.startsWith(p))) {
        return this.generateHeaders(config);
      }
    }
    
    // Default headers for unmatched paths
    return this.generateHeaders({ maxAge: 60, staleWhileRevalidate: 30 });
  }

  // Generate cache headers based on strategy
  generateHeaders(config) {
    const headers = {};
    
    if (config.maxAge > 0) {
      headers['Cache-Control'] = `public, max-age=${config.maxAge}, s-maxage=${config.maxAge}`;
      
      if (config.staleWhileRevalidate > 0) {
        headers['Cache-Control'] += `, stale-while-revalidate=${config.staleWhileRevalidate}`;
      }
    } else {
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      headers['Pragma'] = 'no-cache';
      headers['Expires'] = '0';
    }
    
    return headers;
  }

  // Service Worker cache strategies
  getServiceWorkerConfig() {
    return {
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'cloudinary-images',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
            },
            cacheKeyWillBeUsed: async ({ request }) => {
              return `${request.url}?w=800&q=auto`; // Optimize images
            }
          }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
            }
          }
        },
        {
          urlPattern: /\.(?:js|css)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-resources'
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-stylesheets'
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 365 * 24 * 60 * 60 // 1 year
            }
          }
        },
        {
          urlPattern: /\/api\/vendors/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-vendors',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 5 * 60 // 5 minutes
            },
            networkTimeoutSeconds: 3
          }
        },
        {
          urlPattern: /\/api\/products/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-products',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 5 * 60 // 5 minutes
            },
            networkTimeoutSeconds: 3
          }
        }
      ]
    };
  }

  // Redis cache configuration
  getRedisConfig() {
    return {
      // Session cache
      session: {
        prefix: 'sess:',
        ttl: 24 * 60 * 60, // 24 hours
        maxMemoryPolicy: 'allkeys-lru'
      },
      
      // API cache
      api: {
        prefix: 'api:',
        ttl: 5 * 60, // 5 minutes
        maxMemoryPolicy: 'volatile-lru'
      },
      
      // Real-time data cache
      realtime: {
        prefix: 'rt:',
        ttl: 30, // 30 seconds
        maxMemoryPolicy: 'volatile-ttl'
      },
      
      // User data cache
      user: {
        prefix: 'user:',
        ttl: 60 * 60, // 1 hour
        maxMemoryPolicy: 'allkeys-lru'
      }
    };
  }

  // Database query cache settings
  getDatabaseCacheConfig() {
    return {
      // Vendor listings
      vendors: {
        ttl: 300, // 5 minutes
        tags: ['vendors', 'public']
      },
      
      // Product catalog
      products: {
        ttl: 300, // 5 minutes
        tags: ['products', 'public']
      },
      
      // Categories
      categories: {
        ttl: 1800, // 30 minutes
        tags: ['categories', 'public']
      },
      
      // User profiles
      profiles: {
        ttl: 900, // 15 minutes
        tags: ['users', 'private']
      },
      
      // Orders
      orders: {
        ttl: 60, // 1 minute
        tags: ['orders', 'private']
      }
    };
  }
}

module.exports = new CacheConfig();
