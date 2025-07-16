
// Analytics configuration for AfricanMarket
// Implements Google Analytics, custom metrics, and business intelligence

const AnalyticsConfig = {
  // Google Analytics 4 configuration
  googleAnalytics: {
    measurementId: process.env.GOOGLE_ANALYTICS_ID,
    config: {
      page_title: 'AfricanMarket',
      page_location: typeof window !== 'undefined' ? window.location.href : '',
      send_page_view: true,
      anonymize_ip: true,
      cookie_flags: 'SameSite=Strict;Secure',
      custom_parameters: {
        environment: process.env.NODE_ENV,
        app_version: require('../package.json').version,
      }
    }
  },

  // Custom events configuration
  events: {
    // E-commerce events
    ecommerce: {
      purchase: 'purchase',
      add_to_cart: 'add_to_cart',
      remove_from_cart: 'remove_from_cart',
      view_item: 'view_item',
      view_item_list: 'view_item_list',
      begin_checkout: 'begin_checkout',
      add_payment_info: 'add_payment_info',
      add_shipping_info: 'add_shipping_info',
    },
    
    // User engagement events
    engagement: {
      login: 'login',
      sign_up: 'sign_up',
      search: 'search',
      share: 'share',
      page_view: 'page_view',
      scroll: 'scroll',
      file_download: 'file_download',
      video_play: 'video_play',
    },
    
    // Business-specific events
    business: {
      vendor_registration: 'vendor_registration',
      driver_registration: 'driver_registration',
      order_placed: 'order_placed',
      order_delivered: 'order_delivered',
      payment_completed: 'payment_completed',
      support_contact: 'support_contact',
      feature_used: 'feature_used',
    }
  },

  // Enhanced e-commerce tracking
  ecommerce: {
    currency: 'USD',
    trackPurchases: true,
    trackCartActions: true,
    trackProductViews: true,
    trackSearches: true,
    trackPromotions: true,
  },

  // User segmentation
  userSegments: {
    role: ['customer', 'vendor', 'driver', 'admin'],
    registrationDate: ['new', 'returning', 'loyal'],
    orderFrequency: ['first_time', 'occasional', 'frequent'],
    location: 'auto-detect',
    device: 'auto-detect',
  },

  // Custom dimensions and metrics
  customDimensions: {
    user_role: 'custom_dimension_1',
    vendor_category: 'custom_dimension_2',
    order_value_range: 'custom_dimension_3',
    payment_method: 'custom_dimension_4',
    delivery_method: 'custom_dimension_5',
  },

  customMetrics: {
    cart_value: 'custom_metric_1',
    time_to_checkout: 'custom_metric_2',
    search_results_count: 'custom_metric_3',
    delivery_time: 'custom_metric_4',
  },

  // Privacy and compliance
  privacy: {
    anonymizeIp: true,
    respectDoNotTrack: true,
    cookieConsent: true,
    dataRetention: 26, // months
    allowAdPersonalization: false,
  }
};

// Analytics service class
class AnalyticsService {
  constructor() {
    this.isInitialized = false;
    this.queue = [];
    this.userProperties = {};
  }

  // Initialize analytics
  init() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    const { measurementId } = AnalyticsConfig.googleAnalytics;
    
    if (!measurementId) {
      console.warn('Google Analytics measurement ID not configured');
      return;
    }

    // Load Google Analytics
    this.loadGoogleAnalytics(measurementId);
    
    // Initialize custom analytics
    this.initCustomAnalytics();
    
    // Process queued events
    this.processQueue();
    
    this.isInitialized = true;
    console.log('Analytics initialized');
  }

  // Load Google Analytics script
  loadGoogleAnalytics(measurementId) {
    // Create script tag for Google Analytics
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId, AnalyticsConfig.googleAnalytics.config);
  }

  // Initialize custom analytics
  initCustomAnalytics() {
    // Track initial page load
    this.trackPageView();
    
    // Set up automatic scroll tracking
    this.setupScrollTracking();
    
    // Set up form interaction tracking
    this.setupFormTracking();
    
    // Set up error tracking
    this.setupErrorTracking();
  }

  // Track page views
  trackPageView(page) {
    const event = {
      event_name: 'page_view',
      page_title: document.title,
      page_location: page || window.location.href,
      timestamp: Date.now(),
    };

    this.sendEvent(event);
  }

  // Track custom events
  trackEvent(eventName, parameters = {}) {
    const event = {
      event_name: eventName,
      timestamp: Date.now(),
      user_properties: this.userProperties,
      ...parameters,
    };

    this.sendEvent(event);
  }

  // Track e-commerce events
  trackEcommerce(action, data) {
    const event = {
      event_name: action,
      currency: AnalyticsConfig.ecommerce.currency,
      timestamp: Date.now(),
      ...data,
    };

    // Enhanced e-commerce data
    if (data.items) {
      event.items = data.items.map(item => ({
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        quantity: item.quantity,
        price: item.price,
        item_brand: item.brand || 'AfricanMarket',
        item_variant: item.variant,
      }));
    }

    this.sendEvent(event);
    
    // Also send to Google Analytics if available
    if (window.gtag) {
      window.gtag('event', action, event);
    }
  }

  // Track user properties
  setUserProperties(properties) {
    this.userProperties = { ...this.userProperties, ...properties };
    
    if (window.gtag) {
      window.gtag('set', 'user_properties', properties);
    }
  }

  // Track user ID for cross-device tracking
  setUserId(userId) {
    this.userProperties.user_id = userId;
    
    if (window.gtag) {
      window.gtag('config', AnalyticsConfig.googleAnalytics.measurementId, {
        user_id: userId,
      });
    }
  }

  // Track business metrics
  trackBusinessMetric(metric, value, context = {}) {
    this.trackEvent('business_metric', {
      metric_name: metric,
      metric_value: value,
      context,
    });
  }

  // Track performance metrics
  trackPerformance(metric, value, context = {}) {
    this.trackEvent('performance_metric', {
      metric_name: metric,
      metric_value: value,
      context,
    });
  }

  // Track search events
  trackSearch(query, results = 0, category = null) {
    this.trackEvent(AnalyticsConfig.events.engagement.search, {
      search_term: query,
      search_results: results,
      search_category: category,
    });
  }

  // Track cart events
  trackAddToCart(item, quantity = 1) {
    this.trackEcommerce(AnalyticsConfig.events.ecommerce.add_to_cart, {
      currency: AnalyticsConfig.ecommerce.currency,
      value: item.price * quantity,
      items: [{
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        quantity: quantity,
        price: item.price,
      }],
    });
  }

  // Track purchase events
  trackPurchase(order) {
    this.trackEcommerce(AnalyticsConfig.events.ecommerce.purchase, {
      transaction_id: order.id,
      value: order.total,
      currency: order.currency || AnalyticsConfig.ecommerce.currency,
      items: order.items,
      shipping: order.shipping,
      tax: order.tax,
      coupon: order.coupon,
    });
  }

  // Setup scroll tracking
  setupScrollTracking() {
    let scrolled25 = false, scrolled50 = false, scrolled75 = false, scrolled100 = false;

    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );

      if (scrollPercent >= 25 && !scrolled25) {
        this.trackEvent('scroll', { percent: 25 });
        scrolled25 = true;
      } else if (scrollPercent >= 50 && !scrolled50) {
        this.trackEvent('scroll', { percent: 50 });
        scrolled50 = true;
      } else if (scrollPercent >= 75 && !scrolled75) {
        this.trackEvent('scroll', { percent: 75 });
        scrolled75 = true;
      } else if (scrollPercent >= 100 && !scrolled100) {
        this.trackEvent('scroll', { percent: 100 });
        scrolled100 = true;
      }
    });
  }

  // Setup form tracking
  setupFormTracking() {
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (form.tagName === 'FORM') {
        this.trackEvent('form_submit', {
          form_id: form.id,
          form_name: form.name,
          form_action: form.action,
        });
      }
    });

    // Track form field interactions
    document.addEventListener('focus', (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        this.trackEvent('form_interaction', {
          field_type: event.target.type,
          field_name: event.target.name,
          action: 'focus',
        });
      }
    });
  }

  // Setup error tracking
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackEvent('javascript_error', {
        error_message: event.message,
        error_filename: event.filename,
        error_line: event.lineno,
        error_column: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('promise_rejection', {
        error_message: event.reason?.message || 'Unhandled promise rejection',
        error_stack: event.reason?.stack,
      });
    });
  }

  // Send event to analytics backend
  sendEvent(event) {
    if (!this.isInitialized) {
      this.queue.push(event);
      return;
    }

    // Send to Google Analytics
    if (window.gtag) {
      window.gtag('event', event.event_name, event);
    }

    // Send to custom analytics endpoint
    this.sendToCustomAnalytics(event);
  }

  // Send to custom analytics backend
  async sendToCustomAnalytics(event) {
    try {
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      });
    } catch (error) {
      console.error('Failed to send custom analytics event:', error);
    }
  }

  // Process queued events
  processQueue() {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      this.sendEvent(event);
    }
  }

  // Get user insights (for dashboard)
  async getUserInsights(userId) {
    try {
      const response = await fetch(`/api/analytics/insights/${userId}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get user insights:', error);
      return null;
    }
  }

  // Get business metrics (for admin dashboard)
  async getBusinessMetrics(timeRange = '7d') {
    try {
      const response = await fetch(`/api/analytics/metrics?range=${timeRange}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get business metrics:', error);
      return null;
    }
  }
}

// Create global analytics instance
const analytics = new AnalyticsService();

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => analytics.init());
  } else {
    analytics.init();
  }
}

module.exports = {
  AnalyticsConfig,
  AnalyticsService,
  analytics,
};
