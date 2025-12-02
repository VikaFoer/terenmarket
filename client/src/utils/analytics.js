// Analytics utility functions
const API_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

// Generate or get session ID from localStorage
const getSessionId = () => {
  let sessionId = localStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Track page view
export const trackPageView = (pagePath, pageTitle) => {
  const sessionId = getSessionId();
  
  // Update session
  fetch(`${API_URL}/analytics/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
    },
    body: JSON.stringify({
      sessionId,
      pagePath
    })
  }).catch(err => console.error('Error tracking session:', err));

  // Track page view event
  fetch(`${API_URL}/analytics/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
    },
    body: JSON.stringify({
      sessionId,
      eventType: 'page_view',
      eventName: 'page_view',
      pagePath,
      pageTitle: pageTitle || document.title
    })
  }).catch(err => console.error('Error tracking page view:', err));
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
    pagePath = window.location.pathname,
    pageTitle = document.title
  } = options;

  fetch(`${API_URL}/analytics/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
    },
    body: JSON.stringify({
      sessionId,
      eventType: 'custom',
      eventName,
      pagePath,
      pageTitle,
      category,
      action,
      label,
      value,
      metadata
    })
  }).catch(err => console.error('Error tracking event:', err));
};

// Track QR page specific events
export const trackQRGreetingView = (category) => {
  trackEvent('greeting_view', {
    category: 'qr_page',
    action: 'view_greeting',
    label: category,
    pagePath: `/${category}`
  });
};

export const trackEmailSignup = (category) => {
  trackEvent('email_signup', {
    category: 'qr_page',
    action: 'email_signup',
    label: category,
    pagePath: `/${category}`
  });
};

export const trackExpandProducts = (category) => {
  trackEvent('expand_products', {
    category: 'qr_page',
    action: 'expand_products',
    label: category,
    pagePath: `/${category}`
  });
};

// Track scroll depth
let scrollDepthTracked = {
  25: false,
  50: false,
  75: false,
  100: false
};

export const trackScrollDepth = (pagePath) => {
  const handleScroll = () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);

    if (scrollPercent >= 25 && !scrollDepthTracked[25]) {
      trackEvent('scroll_depth', {
        category: 'engagement',
        action: 'scroll',
        label: '25%',
        value: 25,
        pagePath
      });
      scrollDepthTracked[25] = true;
    }
    if (scrollPercent >= 50 && !scrollDepthTracked[50]) {
      trackEvent('scroll_depth', {
        category: 'engagement',
        action: 'scroll',
        label: '50%',
        value: 50,
        pagePath
      });
      scrollDepthTracked[50] = true;
    }
    if (scrollPercent >= 75 && !scrollDepthTracked[75]) {
      trackEvent('scroll_depth', {
        category: 'engagement',
        action: 'scroll',
        label: '75%',
        value: 75,
        pagePath
      });
      scrollDepthTracked[75] = true;
    }
    if (scrollPercent >= 100 && !scrollDepthTracked[100]) {
      trackEvent('scroll_depth', {
        category: 'engagement',
        action: 'scroll',
        label: '100%',
        value: 100,
        pagePath
      });
      scrollDepthTracked[100] = true;
    }
  };

  window.addEventListener('scroll', handleScroll);
  
  // Reset on page unload
  return () => {
    window.removeEventListener('scroll', handleScroll);
    scrollDepthTracked = {
      25: false,
      50: false,
      75: false,
      100: false
    };
  };
};

// Track time on page
let pageStartTime = Date.now();

export const trackTimeOnPage = (pagePath) => {
  pageStartTime = Date.now();

  const handleUnload = () => {
    const timeOnPage = Math.round((Date.now() - pageStartTime) / 1000);
    if (timeOnPage > 0) {
      // Use sendBeacon for reliability on page unload
      const data = JSON.stringify({
        sessionId: getSessionId(),
        eventType: 'time_on_page',
        eventName: 'time_on_page',
        pagePath,
        pageTitle: document.title,
        value: timeOnPage,
        category: 'engagement',
        action: 'time'
      });

      navigator.sendBeacon(`${API_URL}/analytics/track`, data);
    }
  };

  window.addEventListener('beforeunload', handleUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleUnload);
  };
};
