// /src/pulse/components/PulsePage10.jsx

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PulseLayout from './PulseLayout';
import { ShareIcon, ArrowClockwiseIcon } from '@phosphor-icons/react';

export default function PulsePage10({ pageData, onReplay }) {
  const { title, narrative } = pageData || {};
  const { introLine } = narrative || {};

  const [step, setStep] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: 'My FPL Pulse',
      text: `My FPL Pulse Summary

    Season wrapped. Points, chaos, and a few regrets.

    Take a look at how it all unfolded:
    https://cbrennan.ie/fpl-pulse`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Sharing failed:', err);
    }
  };

  return (
    <PulseLayout>
      <div className="space-y-6">
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

        <div className="relative min-h-[14rem] w-full flex justify-center">
          <AnimatePresence mode="wait">
            {step >= 2 && (
              <motion.div
                key="cta"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
                className="absolute w-full max-w-sm flex flex-col items-center gap-4"
              >
                <div className="flex gap-4">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-medium shadow-md"
                  >
                    <ShareIcon size={20} weight="bold" />
                    Share
                  </button>

                  <button
                    onClick={onReplay}
                    className="flex items-center gap-2 border border-white text-white px-4 py-2 rounded-full font-medium"
                  >
                    <ArrowClockwiseIcon size={20} weight="bold" />
                    Replay
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PulseLayout>
  );
}