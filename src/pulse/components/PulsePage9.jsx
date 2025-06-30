// /src/pulse/components/PulsePage9.jsx

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PulseLayout from './PulseLayout';
import { TShirtIcon } from '@phosphor-icons/react';

export default function PulsePage9({ pageData }) {
  const { title, narrative, stats } = pageData || {};
  const {
    introLine,
    talismanLine,
    unsungHeroLine,
    benchFlopLine,
  } = narrative || {};

  const [step, setStep] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

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

        <div className="relative min-h-[30rem] w-full flex justify-center">
          <AnimatePresence mode="wait">
            {step >= 1 && (
              <motion.div
                key="squad"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute w-full max-w-md flex flex-col"
              >
                {step < 5 && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key="lines"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="flex flex-col space-y-6"
                    >
                      {step >= 2 && (
                        <motion.p
                          className="text-md text-justify leading-relaxed text-white"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.6 }}
                        >
                          {talismanLine}
                        </motion.p>
                      )}
                      {step >= 3 && (
                        <motion.p
                          className="text-md text-justify leading-relaxed text-white"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.6 }}
                        >
                          {unsungHeroLine}
                        </motion.p>
                      )}
                      {step >= 4 && (
                        <motion.p
                          className="text-md text-justify leading-relaxed text-white"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.6 }}
                        >
                          {benchFlopLine}
                        </motion.p>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
                {step >= 5 && stats?.teamXI && (
                  <motion.div
                    key="team"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute w-full max-w-md flex flex-col items-center gap-3"
                  >
                    {[
                      { label: 'Goalkeeper', players: stats.teamXI.filter(p => p.position === 1) },
                      { label: 'Defenders', players: stats.teamXI.filter(p => p.position === 2) },
                      { label: 'Midfielders', players: stats.teamXI.filter(p => p.position === 3) },
                      { label: 'Forwards', players: stats.teamXI.filter(p => p.position === 4) },
                    ].map(({ label, players }, idx) => (
                      <div key={idx} className="flex justify-center gap-1.5 flex-wrap">
                        {players.map((player, i) => (
                        <div key={`${player.displayName}-${i}`} className="px-0.5 text-center flex flex-col justify-between shrink-0">
                            <TShirtIcon size={48} weight="thin" className="mx-auto text-white" />

                            <div className="text-[12px] font-bold leading-tight text-white break-words text-center line-clamp-2">
                              {player.displayName}
                            </div>
                            <div className="text-xs text-white/80">{player.totalPoints} pts</div>

                            <div className="flex justify-center gap-1 text-[10px] text-white/60">
                              <div className="bg-green-500 px-1 rounded text-white font-semibold">
                                {player.weeksOwned}
                              </div>
                              <div className="bg-blue-500 px-1 rounded text-white font-semibold">
                                {player.avgPointsPerWeek}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div className="flex justify-center gap-4 bg-black rounded-full px-2.5 py-1 text-white text-xs mt-4">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <span>Weeks Played</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span>Pts. per Week</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PulseLayout>
  );
}