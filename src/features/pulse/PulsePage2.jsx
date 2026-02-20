// /src/pulse/components/PulsePage2.jsx
import { motion } from 'framer-motion';
import PulseLayout from './PulseLayout';
import useStepProgression from '../../hooks/useStepProgression';

export default function PulsePage2({ pageData }) {
  const { title, narrative, stats } = pageData;
  const { peakRank, stdDev } = stats || {};
  const step = useStepProgression(2500);

  const [firstLine, restLine] = narrative.split(/(?<=\.)\s(.+)/s);

  return (
    <PulseLayout>
      <div>
        <div className="space-y-12">
          <motion.h2
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: step >= 0 ? 1 : 0, scale: step >= 0 ? [1.1, 1] : 0.5 }}
            transition={{ duration: 0.8 }}
            className="text-4xl font-semibold tracking-wide text-white"
          >
            {title}
          <p className="text-white/50 text-sm font-extrabold py-1">Was your season like Man City? Or did you stutter like Man Utd?</p>
          </motion.h2>

          <div className="space-y-1">
            <motion.p
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: step >= 1 ? 1 : 0, x: step >= 1 ? 0 : 40 }}
              transition={{ duration: 0.8 }}
              className="text-lg font-bold text-white/80"
            >
              Peak Rank:{' '}
              <span className="text-white font-extrabold">
                {peakRank.toLocaleString()}
              </span>
            </motion.p>

            <motion.p
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: step >= 2 ? 1 : 0, x: step >= 2 ? 0 : 40 }}
              transition={{ duration: 0.8 }}
              className="text-lg font-bold text-white/80"
            >
              Rank Variance:{' '}
              <span className="text-white font-extrabold">
                {stdDev.toLocaleString()}
              </span>
            </motion.p>
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate={step >= 3 ? "visible" : "hidden"}
          variants={{
            visible: { transition: { staggerChildren: 0.4 } },
            hidden: {},
          }}
          className="text-xl text-white font-semibold max-w-xl leading-snug space-y-4 mt-12 min-h-[7rem]"
        >
          {[firstLine, restLine].map((line, idx) => (
            <motion.p
              key={idx}
              initial="hidden"
              animate={step >= 3 ? "visible" : "hidden"}
              variants={{
                visible: { opacity: 1, y: 0 },
                hidden: { opacity: 0, y: 10 },
              }}
              transition={{
                duration: 1,
                type: 'spring',
                bounce: 0,
                delay: 1 + idx * 2,
              }}
            >
              {line}
            </motion.p>
          ))}
</motion.div>
      </div>
    </PulseLayout>
  );
}