// /src/pulse/components/PulsePage6.jsx

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PulseLayout from './PulseLayout';

export default function PulsePage6({ pageData }) {
  const { title, narrative, stats } = pageData || {};
  const { introLine, hotStreakLine, coldStreakLine } = narrative || {};

  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const streakMotionProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    className: 'text-md text-justify leading-relaxed text-white'
  };

  return (
    <PulseLayout>
      <div className="space-y-12">
        <motion.h2
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: [1.05, 1] }}
          transition={{ duration: 1 }}
          className="text-4xl font-bold text-white leading-snug"
        >
          {title}
          <p className="text-white/50 text-sm font-extrabold py-1">
            {introLine}
          </p>
        </motion.h2>

        <div className="relative min-h-[20rem] w-full flex justify-center">
          <AnimatePresence mode="wait">
            {step >= 1 && (
              <motion.div
                key="streaks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute w-full max-w-md flex flex-col"
              >
                {step >= 2 && (
                  <>
                    <motion.p {...streakMotionProps} className="text-md text-justify leading-relaxed text-white mb-1" transition={{ duration: 0.6, delay: 1 }}>
                      {hotStreakLine}
                    </motion.p>
                    <motion.p
                      className="text-white/50 text-sm italic font-extrabold mb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 1 }}
                    >
                      Rank gained: {(stats.longestGreenStreak.startRank - stats.longestGreenStreak.endRank).toLocaleString()}
                    </motion.p>
                  </>
                )}
                {step >= 3 && (
                  <>
                    <motion.p {...streakMotionProps} className="text-md text-justify leading-relaxed text-white mb-1" transition={{ duration: 0.6, delay: 5 }}>
                      {coldStreakLine}
                    </motion.p>
                    <motion.p
                      className="text-white/50 text-sm italic font-extrabold mb-6"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6, delay: 5 }}
                    >
                      Rank lost: {(stats.longestRedStreak.endRank - stats.longestRedStreak.startRank).toLocaleString()}
                    </motion.p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PulseLayout>
  );
}