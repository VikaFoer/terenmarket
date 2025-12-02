import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

// Get or create session ID
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Track page view
export const trackPageView = (path, title, userId = null) => {
  const sessionId = getSessionId();
  
  axios.post(`${API_URL}/analytics/track`, {
    sessionId,
    eventType: 'page_view',
    eventName: 'page_view',
    pagePath: path,
    pageTitle: title,
    userId
  }).catch(err => {
    // Silently fail - don't interrupt user experience
    console.error('Analytics tracking error:', err);
  });
};

// Track custom event
export const trackEvent = (eventName, options = {}) => {
  const sessionId = getSessionId();
  const {
    category,
    action,
    label,
    value,
    metadata,
    userId,
    pagePath = window.location.pathname,
    pageTitle = document.title
  } = options;

  axios.post(`${API_URL}/analytics/track`, {
    sessionId,
    eventType: 'custom',
    eventName,
    pagePath,
    pageTitle,
    category,
    action,
    label,
    value,
    metadata: metadata ? JSON.stringify(metadata) : null,
    userId
  }).catch(err => {
    console.error('Analytics tracking error:', err);
  });
};

// Track QR page specific events
export const trackQRPageView = (category) => {
  trackEvent('qr_page_view', {
    category: 'qr_pages',
    action: 'view',
    label: category,
    pagePath: `/${category}`
  });
};

export const trackGreetingView = (category) => {
  trackEvent('greeting_view', {
    category: 'qr_pages',
    action: 'greeting_view',
    label: category,
    pagePath: `/${category}`
  });
};

export const trackEmailRegistration = (category, email) => {
  trackEvent('email_registration', {
    category: 'qr_pages',
    action: 'email_signup',
    label: category,
    metadata: { email },
    pagePath: `/${category}`
  });
};

export const trackProductExpand = (category) => {
  trackEvent('product_expand', {
    category: 'qr_pages',
    action: 'expand_products',
    label: category,
    pagePath: `/${category}`
  });
};

// Track client dashboard events
export const trackProductView = (productId, productName, categoryId) => {
  trackEvent('product_view', {
    category: 'client_dashboard',
    action: 'view_product',
    label: productName,
    metadata: { productId, categoryId }
  });
};

export const trackAddToCart = (productId, productName) => {
  trackEvent('add_to_cart', {
    category: 'client_dashboard',
    action: 'add_to_cart',
    label: productName,
    metadata: { productId }
  });
};

export const trackCategoryFilter = (categoryId, categoryName) => {
  trackEvent('category_filter', {
    category: 'client_dashboard',
    action: 'filter_category',
    label: categoryName,
    metadata: { categoryId }
  });
};

// Track login
export const trackLogin = (userId, userType) => {
  trackEvent('login', {
    category: 'auth',
    action: 'login',
    label: userType,
    metadata: { userId },
    userId
  });
};

// Track scroll depth
export const trackScrollDepth = (depth, pagePath) => {
  trackEvent('scroll_depth', {
    category: 'engagement',
    action: 'scroll',
    label: `${depth}%`,
    value: depth,
    pagePath
  });
};

// Initialize analytics tracking
export const initAnalytics = () => {
  // Track initial page view
  trackPageView(window.location.pathname, document.title);
  
  // Track scroll depth
  let maxScroll = 0;
  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);
    
    if (scrollPercent > maxScroll) {
      maxScroll = scrollPercent;
      // Track at 25%, 50%, 75%, 100%
      if ([25, 50, 75, 100].includes(scrollPercent)) {
        trackScrollDepth(scrollPercent, window.location.pathname);
      }
    }
  });
};

export default {
  trackPageView,
  trackEvent,
  trackQRPageView,
  trackGreetingView,
  trackEmailRegistration,
  trackProductExpand,
  trackProductView,
  trackAddToCart,
  trackCategoryFilter,
  trackLogin,
  trackScrollDepth,
  initAnalytics
};

