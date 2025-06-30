// /src/pulse/components/PulsePage1.jsx
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import PulseLayout from './PulseLayout';

export default function PulsePage1({ pageData, onAdvance }) {
  const { narrative, stats } = pageData;
  const { totalPoints, finalRank } = stats || {};

  const [step, setStep] = useState(0);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [displayRank, setDisplayRank] = useState(0);


  // Step progression
  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  // Trigger count up when step === 1
  useEffect(() => {
    if (step === 1) {
      const easeOutCount = (start, end, duration, setter) => {
        const startTime = performance.now();
        const step = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          const value = Math.round(start + (end - start) * eased);
          setter(value);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };

      easeOutCount(0, totalPoints || 0, 5000, setDisplayPoints);
    }

    if (step === 2) {
      const easeOutCount = (start, end, duration, setter) => {
        const startTime = performance.now();
        const step = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          const value = Math.round(start - (start - end) * eased);
          setter(value);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      const totalPlayers = 15000000; // or use actual value dynamically
      easeOutCount(totalPlayers, finalRank || 0, 5000, setDisplayRank);
    }
  }, [step, totalPoints, finalRank]);

  return (
  <PulseLayout>
    <div className="space-y-12">
      <div className="space-y-1">
        <motion.h2
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: step >= 0 ? 1 : 0, scale: step >= 0 ? [1.1, 1] : 0.5 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-semibold tracking-wide text-white"
          >
          Your FPL Season 2024/25
        </motion.h2>
      </div>
      <motion.p
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: step >= 1 ? 1 : 0, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="text-6xl font-black text-white tracking-tight"
      >
        {displayPoints.toLocaleString()} pts
      </motion.p>
      <motion.p
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: step >= 2 ? 1 : 0, x: 0 }}
        transition={{ duration: 0.8 }}
        className="text-xl font-bold text-white"
      >
        Final Rank: <span className="text-white font-extrabold">#{displayRank.toLocaleString()}</span>
      </motion.p>

      <motion.div
        initial="hidden"
        animate={step >= 3 ? "visible" : "hidden"}
        variants={{
          visible: {
            transition: { staggerChildren: 0.3 }
          },
          hidden: {}
        }}
        className="text-lg leading-snug max-w-xl text-white"
      >
        {typeof narrative === 'string' && narrative.split(/(?<=[.!?])\s+/).map((line, idx) => (
          <motion.div
            key={idx}
            className="mb-3"
            initial="hidden"
            animate={step >= 3 ? 'visible' : 'hidden'}
            variants={{
              visible: { transition: { staggerChildren: 0.06 } },
              hidden: {},
            }}
          >
            {line.split(' ').map((word, wIdx) => (
              <motion.span
                key={wIdx}
                className="inline-block mr-2"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 1 }}
              >
                {word}
              </motion.span>
            ))}
          </motion.div>
        ))}
      </motion.div>
      </div>
    </PulseLayout>
  );
}