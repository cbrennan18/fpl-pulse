// /src/pulse/components/PulseTopBar.jsx

import { motion } from 'framer-motion';
import { PauseIcon, PlayIcon, ArrowLeftIcon, XIcon } from "@phosphor-icons/react";

export default function PulseTopBar({ currentPage, totalPages, isPaused, togglePause, onBack }) {
  const progress = ((currentPage + 1) / totalPages) * 100;

  return (
    <div className="fixed top-0 left-0 w-full z-50 px-4 pt-3 space-y-2">
      {/* Progress bar */}
      <div className="flex gap-1">
        {Array.from({ length: totalPages }).map((_, idx) => {
          const isActive = idx === currentPage;
          const isCompleted = idx < currentPage;

          return (
            <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                key={isActive ? `active-${currentPage}` : `completed-${idx}`}
                initial={{ width: isCompleted ? '100%' : '0%' }}
                animate={{ width: isActive || isCompleted ? '100%' : '0%' }}
                transition={{
                  duration: isActive ? 15 : 0.3,
                  ease: 'easeInOut',
                }}
                className={`h-full ${
                  isActive || isCompleted ? 'bg-green-500' : 'bg-white/70'
                } rounded-full`}
              />
            </div>
          );
        })}
      </div>

      {/* Control buttons */}
      <div className="flex justify-between items-center px-1">
        <button onClick={onBack}>
          <ArrowLeftIcon size={24} weight="bold" className="text-white" />
        </button>
        <div className="flex gap-4">
          <button onClick={togglePause}>
            {isPaused ? <PlayIcon size={24} weight="bold" className="text-white" /> : <PauseIcon size={24} weight="bold" className="text-white" />}
          </button>
          <button onClick={() => window.history.back()}>
            <XIcon size={24} weight="bold" className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}