import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

const WEBSITE_ID = 'b8992f59-bcb2-4f10-a02a-2ffa23f482e0';
const SCRIPT_SRC = 'https://analytics.cbrennan.ie/script.js';
const PROD_HOSTS = ['cbrennan.ie', 'www.cbrennan.ie'];

function isProd() {
  return PROD_HOSTS.includes(window.location.hostname);
}

export default function useUmami() {
  // Inject script once on mount (prod only)
  useEffect(() => {
    if (!isProd()) return;
    if (window.umami || document.querySelector(`script[data-website-id="${WEBSITE_ID}"]`)) return;

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = SCRIPT_SRC;
    script.setAttribute('data-website-id', WEBSITE_ID);
    script.setAttribute('data-do-not-track', 'true');
    document.head.appendChild(script);
  }, []);

  // Track route changes
  const { pathname } = useLocation();
  useEffect(() => {
    if (!isProd()) return;
    window.umami?.track('page_view', { path: pathname });
  }, [pathname]);

  // Expose track function
  const track = useCallback((eventName, eventData) => {
    if (!isProd()) return;
    window.umami?.track(eventName, eventData);
  }, []);

  return { track };
}
