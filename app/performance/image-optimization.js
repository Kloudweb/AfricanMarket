
// Image optimization configuration for AfricanMarket
// Implements responsive images, lazy loading, and format optimization

const ImageOptimization = {
  // Cloudinary transformation presets
  cloudinaryPresets: {
    // Product images
    product: {
      thumbnail: 'w_150,h_150,c_fill,f_auto,q_auto',
      small: 'w_300,h_300,c_fill,f_auto,q_auto',
      medium: 'w_600,h_600,c_fill,f_auto,q_auto',
      large: 'w_1200,h_1200,c_fill,f_auto,q_auto'
    },
    
    // Vendor banners
    banner: {
      mobile: 'w_375,h_200,c_fill,f_auto,q_auto',
      tablet: 'w_768,h_300,c_fill,f_auto,q_auto',
      desktop: 'w_1200,h_400,c_fill,f_auto,q_auto'
    },
    
    // Profile avatars
    avatar: {
      small: 'w_40,h_40,c_fill,f_auto,q_auto,r_max',
      medium: 'w_80,h_80,c_fill,f_auto,q_auto,r_max',
      large: 'w_150,h_150,c_fill,f_auto,q_auto,r_max'
    },
    
    // Hero images
    hero: {
      mobile: 'w_375,h_250,c_fill,f_auto,q_auto',
      tablet: 'w_768,h_400,c_fill,f_auto,q_auto',
      desktop: 'w_1920,h_600,c_fill,f_auto,q_auto'
    }
  },

  // Responsive image sizes
  responsiveSizes: {
    product: '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw',
    banner: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw',
    hero: '100vw',
    avatar: '(max-width: 768px) 40px, 80px'
  },

  // Image format priority
  formatPriority: ['avif', 'webp', 'jpg'],

  // Lazy loading configuration
  lazyLoading: {
    rootMargin: '50px',
    threshold: 0.1,
    fadeInDuration: 300
  },

  // Image compression settings
  compression: {
    quality: {
      low: 60,
      medium: 75,
      high: 85,
      lossless: 95
    },
    formats: {
      avif: { quality: 70, effort: 4 },
      webp: { quality: 75, effort: 4 },
      jpg: { quality: 80, progressive: true },
      png: { compressionLevel: 6, adaptiveFiltering: true }
    }
  },

  // Generate responsive image URLs
  generateResponsiveUrls(baseUrl, preset, sizes = ['small', 'medium', 'large']) {
    const urls = {};
    
    sizes.forEach(size => {
      if (this.cloudinaryPresets[preset] && this.cloudinaryPresets[preset][size]) {
        const transformation = this.cloudinaryPresets[preset][size];
        urls[size] = `${baseUrl}/${transformation}`;
      }
    });
    
    return urls;
  },

  // Generate srcSet for responsive images
  generateSrcSet(baseUrl, preset) {
    const presetConfig = this.cloudinaryPresets[preset];
    if (!presetConfig) return '';

    const srcSetEntries = Object.entries(presetConfig).map(([size, transformation]) => {
      const width = transformation.match(/w_(\d+)/)?.[1];
      if (width) {
        return `${baseUrl}/${transformation} ${width}w`;
      }
      return null;
    }).filter(Boolean);

    return srcSetEntries.join(', ');
  },

  // Optimize image based on device capabilities
  getOptimalFormat(userAgent, supportsAvif = false, supportsWebp = false) {
    // Check for modern format support
    if (supportsAvif) return 'avif';
    if (supportsWebp) return 'webp';
    
    // Fallback to traditional formats
    return 'jpg';
  },

  // Image placeholder generation
  generatePlaceholder(width, height, color = '#f0f0f0') {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.3em" fill="#999" font-size="14">
          Loading...
        </text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  },

  // Image loading strategies
  loadingStrategies: {
    // Critical images (above the fold)
    critical: {
      loading: 'eager',
      fetchPriority: 'high',
      decoding: 'sync'
    },
    
    // Non-critical images
    lazy: {
      loading: 'lazy',
      fetchPriority: 'low',
      decoding: 'async'
    },
    
    // Interactive images
    interactive: {
      loading: 'eager',
      fetchPriority: 'high',
      decoding: 'async'
    }
  },

  // Performance monitoring
  trackImagePerformance() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.initiatorType === 'img') {
            // Track image loading metrics
            const metrics = {
              name: entry.name,
              duration: entry.duration,
              transferSize: entry.transferSize,
              decodedBodySize: entry.decodedBodySize
            };
            
            // Send to analytics
            if (window.gtag) {
              window.gtag('event', 'image_load', {
                event_category: 'Performance',
                event_label: entry.name,
                value: Math.round(entry.duration)
              });
            }
          }
        });
      });
      
      observer.observe({ entryTypes: ['resource'] });
    }
  },

  // Critical image preloader
  preloadCriticalImages(urls) {
    if (typeof document !== 'undefined') {
      urls.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
      });
    }
  }
};

module.exports = ImageOptimization;
