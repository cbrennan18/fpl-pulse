// /src/pulse/components/PulsePage5.jsx

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PulseLayout from './PulseLayout';

export default function PulsePage5({ pageData }) {
  const { title, stats, introLine, inspiredLine, regretLine, puntRegretLine } = pageData || {};
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => prev + 1);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const hits = stats?.top5Stints || [];

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
            {(step >= 1 && step < 3) && (
              <motion.ol
                key="hits"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="absolute w-full max-w-md space-y-4 text-white font-semibold"
              >
                <motion.p
                  className="text-white/50 text-sm font-semibold mb-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                >
                  {inspiredLine}
                </motion.p>

                {hits.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center justify-between w-full gap-4"
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.15 }}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-lg font-black text-white/60">#{index + 1}</span>
                      <span className="text-xl font-medium text-white">{item.playerName}</span>
                    </div>
                    <span className="text-sm text-white/50">
                      {item.points} pts in {item.weeksHeld} GWs ({item.pointsPerWeek} /wk)
                    </span>
                  </motion.div>
                ))}
              </motion.ol>
            )}

            {step >= 3 && (
              <motion.div
                key="regretsWrapper"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute w-full max-w-md space-y-6 text-white"
              >
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="text-md text-justify leading-relaxed"
                >
                  {regretLine}
                </motion.p>

                {step >= 4 && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 2 }}
                    className="text-md text-justify leading-relaxed text-white"
                  >
                    {puntRegretLine}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PulseLayout>
  );
}