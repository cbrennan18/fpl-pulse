// /src/hooks/useParallax.js

import { useEffect } from 'react';

export default function useParallax(elementId = 'parallax-bg', speed = 0.5) {
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const el = document.getElementById(elementId);
          if (el) el.style.transform = `translateY(${window.scrollY * speed}px)`;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [elementId, speed]);
}
