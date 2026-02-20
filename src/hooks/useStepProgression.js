import { useEffect, useState } from 'react';

/**
 * Increments a step counter at a fixed interval. Used by PulsePage1–10
 * to drive staggered reveal animations.
 */
export default function useStepProgression(intervalMs, initialStep = 0) {
  const [step, setStep] = useState(initialStep);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => prev + 1);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return step;
}
