// /src/pulse/components/PulsePageRenderer.jsx

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import PulsePage1 from './PulsePage1';
import PulsePage2 from './PulsePage2';
import PulsePage3 from './PulsePage3';
import PulsePage4 from './PulsePage4';
import PulsePage5 from './PulsePage5';
import PulsePage6 from './PulsePage6';
import PulsePage7 from './PulsePage7';
import PulsePage8 from './PulsePage8';
import PulsePage9 from './PulsePage9';
import PulsePage10 from './PulsePage10';
import PulseTopBar from './PulseTopBar';

export default function PulsePageRenderer({
  pageData,
  onAdvance,
  onBack,
  isPaused,
  togglePause,
  currentPageIndex,
  totalPages,
}) {
  const [progress, setProgress] = useState(0);
  const [canAdvance, setCanAdvance] = useState(true);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setProgress(100);
    setCanAdvance(true);

    if (!isPaused && onAdvance) {
      timeoutRef.current = setTimeout(() => {
        setCanAdvance(false);
        onAdvance();
      }, 15000);
    }

    return () => clearTimeout(timeoutRef.current);
  }, [pageData, isPaused, onAdvance]);

  const { page } = pageData;

  return (
    <div
      className="w-full h-screen overflow-hidden"
      onMouseDown={() => togglePause(true)}
      onMouseUp={() => togglePause(false)}
      onTouchStart={() => togglePause(true)}
      onTouchEnd={() => togglePause(false)}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full h-screen"
        onClick={() => {
          if (!canAdvance) return;
          setCanAdvance(false);
          if (onAdvance) onAdvance();
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(event, info) => {
          if (!canAdvance) return;
          if (info.offset.x < -100 && onAdvance) {
            setCanAdvance(false);
            onAdvance();
          } else if (info.offset.x > 100 && onBack) {
            setCanAdvance(false);
            onBack();
          }
        }}
      >
        {page === 1 && <PulsePage1 pageData={pageData} />}
        {page === 2 && <PulsePage2 pageData={pageData} />}
        {page === 3 && <PulsePage3 pageData={pageData} />}
        {page === 4 && <PulsePage4 pageData={pageData} />}
        {page === 5 && <PulsePage5 pageData={pageData} />}
        {page === 6 && <PulsePage6 pageData={pageData} />}
        {page === 7 && <PulsePage7 pageData={pageData} />}
        {page === 8 && <PulsePage8 pageData={pageData} />}
        {page === 9 && <PulsePage9 pageData={pageData} />}
        {page === 10 && (
          <PulsePage10
            pageData={pageData}
            onReplay={() => {
              clearTimeout(timeoutRef.current);
              setCanAdvance(true);
              setProgress(100);
              onBack(0); // optional if not using custom back logic
              // Add explicit state reset for Page 1
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pulse-restart'));
              }
            }}
          />
        )}
        {page > 10 && (
          <>
            <motion.h2
              className="text-4xl font-extrabold text-white"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
            >
              {pageData.title}
            </motion.h2>

            {typeof pageData.narrative === 'string' && (
              <motion.p
                className="text-xl leading-relaxed max-w-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 1 }}
              >
                {pageData.narrative}
              </motion.p>
            )}
          </>
        )}
      </motion.div>
     <PulseTopBar
        currentPage={currentPageIndex}
        totalPages={totalPages}
        isPaused={isPaused}
        togglePause={() => togglePause(!isPaused)}
        onBack={onBack}
      />
    </div>
  );
}