// /src/pulse/components/PulsePage3.jsx

import { motion, AnimatePresence } from 'framer-motion';
import PulseLayout from './PulseLayout';
import useStepProgression from '../../hooks/useStepProgression';

export default function PulsePage3({ pageData }) {
  const { narrative } = pageData || {};
  const step = useStepProgression(2500);

  if (!narrative?.mvpPlayers || !narrative?.missedPlayers) return null;

  return (
    <PulseLayout>
      <div className="space-y-12">
        <motion.h2
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: step >= 0 ? 1 : 0, scale: step >= 0 ? [1.1, 1] : 0.5 }}
          transition={{ duration: 1 }}
          className="text-4xl font-bold text-white leading-snug"
        >
          {step < 3 ? narrative.titleMVP : narrative.titleMissed}
          <p className="text-white/50 text-sm font-extrabold py-1">
            {step < 3 ? narrative.subtitleMVP : narrative.subtitleMissed}
          </p>
        </motion.h2>

        <div className="relative min-h-[20rem] w-full flex justify-center">
          <AnimatePresence mode="wait">
            {(step >= 1 && step < 3) && (
              <motion.ol
                key="mvp"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="absolute w-full max-w-md space-y-4 text-white font-semibold"
              >
                {narrative.mvpPlayers.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center justify-between w-full gap-4"
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.15 }}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-black text-white/60">#{index + 1}</span>
                      <span className="text-xl font-medium text-white">{item.player}</span>
                    </div>
                    <span className="text-lg text-white/50">{item.points} pts</span>
                  </motion.div>
                ))}
              </motion.ol>
            )}

            {step >= 3 && (
              <motion.ol
                key="missed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="absolute w-full max-w-md space-y-4 text-white font-semibold"
              >
                {narrative.missedPlayers.map((item, index) => (
                  <motion.div
                    key={index}
                    className="flex items-center justify-between w-full gap-4"
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.15 }}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-black text-white/60">#{index + 1}</span>
                      <span className="text-xl font-medium text-white">{item.player}</span>
                    </div>
                    <span className="text-lg text-white/50">
                      {item.points} pts / {item.gws} GWs
                    </span>
                  </motion.div>
                ))}
              </motion.ol>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PulseLayout>
  );
}