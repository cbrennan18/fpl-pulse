// features/pulse/wrapped/beat/useBeatNavigation.js
//
// Manual-only beat/screen navigation for the Wrapped flow. NO timers, NO
// auto-advance (design-spec §1). A beat owns 2–3 screens under one progress
// segment; `next` walks screens within a beat, then rolls to the next beat;
// past the final beat it calls onComplete (→ recap carousel).

import { useState } from 'react';

export default function useBeatNavigation({ beats, onComplete }) {
  const [beatIndex, setBeatIndex] = useState(0);
  const [screenIndex, setScreenIndex] = useState(0);

  const next = () => {
    const screens = beats[beatIndex]?.screenCount ?? 1;
    if (screenIndex < screens - 1) {
      setScreenIndex((s) => s + 1);
    } else if (beatIndex < beats.length - 1) {
      setBeatIndex((b) => b + 1);
      setScreenIndex(0);
    } else {
      onComplete?.();
    }
  };

  const prev = () => {
    if (screenIndex > 0) {
      setScreenIndex((s) => s - 1);
    } else if (beatIndex > 0) {
      const prevBeat = beatIndex - 1;
      setBeatIndex(prevBeat);
      setScreenIndex((beats[prevBeat]?.screenCount ?? 1) - 1);
    }
    // at the very first screen we stay put (cover sits behind this in the machine)
  };

  const jumpTo = (i) => {
    if (i < 0 || i >= beats.length) return;
    setBeatIndex(i);
    setScreenIndex(0);
  };

  return { beatIndex, screenIndex, next, prev, jumpTo };
}
