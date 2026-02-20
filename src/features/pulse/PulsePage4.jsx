// /src/pulse/components/PulsePage4.jsx

import { motion } from 'framer-motion';
import PulseLayout from './PulseLayout';
import useStepProgression from '../../hooks/useStepProgression';

export default function PulsePage4({ pageData }) {
  const { title, narrative, stats } = pageData;
  const step = useStepProgression(4000);

  return (
    <PulseLayout>
      <div className="space-y-8 text-left max-w-xl min-h-[22rem] flex flex-col justify-center">
        <motion.h2
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: step >= 0 ? 1 : 0, scale: step >= 0 ? [1.05, 1] : 0.5 }}
          transition={{ duration: 1 }}
          className="text-4xl font-bold text-white leading-snug"
        >
          {title}
          <p className="text-white/50 text-sm font-extrabold pt-1">
            Transfers, tinkering & timing.
          </p>
        </motion.h2>

        <div className="min-h-[6rem]">
          {step >= 1 && (
            <motion.p
              className="text-xl leading-relaxed text-white"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              {narrative}
            </motion.p>
          )}
        </div>

        <div className="min-h-[3rem]">
          {step >= 2 && (
            <motion.p
              className="text-base text-white/60 italic"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              Avg transfer time: {stats?.avgHoursBeforeDeadline?.toFixed(1)} hrs before deadline
            </motion.p>
          )}
        </div>
      </div>
    </PulseLayout>
  );
}