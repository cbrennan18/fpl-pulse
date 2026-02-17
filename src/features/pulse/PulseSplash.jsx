// /src/pulse/components/PulseSplash.jsx

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const loadingMessages = [
  "Counting those captain hauls…",
  "Crunching your transfer regrets…",
  "Stacking your bench disasters…",
  "Scouting your streaks…",
  "Building your Pulse…"
];

export default function PulseSplash() {
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMsgIndex((prevIndex) => (prevIndex + 1) % loadingMessages.length);
    }, 1200); // rotate every 1.2 sec (or adjust as needed)
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 text-white px-6 text-center space-y-6">

      {/* Logo or App Title */}
      {/* <img src="/your-logo.png" alt="Pulse Logo" className="h-12 mb-4" /> */}
      <h1 className="text-3xl text-white font-extrabold tracking-tight">Building your FPL Pulse…</h1>

      {/* Dynamic sub message */}
      <div className="h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentMsgIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="text-lg italic text-gray-300"
          >
            {loadingMessages[currentMsgIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Dots loader */}
      <div className="flex space-x-2 mt-8">
        {[...Array(3)].map((_, i) => (
          <motion.span
            key={i}
            className="h-3 w-3 bg-white rounded-full"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.4, 1],
            }}
            transition={{
              repeat: Infinity,
              duration: 1.2,
              delay: i * 0.3
            }}
          />
        ))}
      </div>
    </div>
  );
}