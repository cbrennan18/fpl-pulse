import { useCallback } from 'react';

// The tracker script lives as a static tag in index.html, gated by its own
// data-domains attribute — this hook no longer injects or gates anything.
// Umami follows SPA route changes itself, so there's no manual page_view here.
export default function useUmami() {
  const track = useCallback((eventName, eventData) => {
    window.umami?.track(eventName, eventData);
  }, []);

  return { track };
}
