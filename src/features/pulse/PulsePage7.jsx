// /src/pulse/components/PulsePage7.jsx

import { motion, AnimatePresence } from 'framer-motion';
import PulseLayout from './PulseLayout';
import useStepProgression from '../../hooks/useStepProgression';

export default function PulsePage7({ pageData }) {
  const { title, narrative, stats } = pageData || {};
  const { introLine, loyaltyLine, benchLine, transfersLine } = narrative || {};

  const step = useStepProgression(2500);

  const sharedProps = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    className: 'text-md text-justify leading-relaxed text-white mb-1'
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
                key="loyalty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute w-full max-w-md space-y-6 text-white"
              >
                {step >= 1 && (
                  <motion.p {...sharedProps} transition={{ duration: 0.6, delay: 1 }}>
                    {loyaltyLine}
                  </motion.p>
                )}

                {step >= 2 && (
                  <motion.p {...sharedProps} transition={{ duration: 0.6, delay: 2 }}>
                    {benchLine}
                  </motion.p>
                )}

                {step >= 3 && (
                  <motion.p {...sharedProps} transition={{ duration: 0.6, delay: 3 }}>
                    {transfersLine}
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