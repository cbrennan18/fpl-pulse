// features/pulse/wrapped/beat/DetailSheet.jsx
//
// Pattern 1 — the reusable tap→detail bottom sheet every Wrapped beat shares. ONE
// overlay, warm-editorial to the art-direction lock (cream paper, ink hairline rules,
// square 2px corners, NO shadow) that a beat opens on a tap of a row / name / cell /
// season track. Content-sized up to 80vh, then scrolls internally — so a compact XI
// and a 50-row league table are the SAME sheet, just different children.
//
// Motion mechanics (backdrop fade, spring slide-up, drag-down-to-dismiss) are lifted
// from components/BottomSheet.jsx, but NOT its dark app styling — Wrapped is its own
// warm-stock sub-brand.
//
// TWO structural decisions, both load-bearing:
//   • PORTAL to document.body — the beat sits inside BeatShell's body, which is a
//     Framer drag surface (transform → containing block) with overflow-hidden; a plain
//     fixed/absolute child would be clipped or mis-anchored. The portal escapes it so
//     the sheet covers the viewport and stays in view regardless of scroll.
//   • GUARD via stopPropagation — React events bubble through the COMPONENT tree, so
//     the portal does NOT escape BeatShell's onClick={onNext}. The overlay root
//     stopPropagation's every click (backdrop close included) so no tap inside the
//     sheet ever advances the beat. Same discipline as the beats' guarded interactions.

import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from '@phosphor-icons/react';

// Capitalised refs so member-expression JSX counts as uses of the import.
const MotionDiv = motion.div;

export default function DetailSheet({ open, onClose, title, children }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex flex-col justify-end"
          onClick={(e) => e.stopPropagation()} // never reach BeatShell's tap-to-advance
        >
          {/* backdrop — warm ink dim, tap to close */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-wrapped-ink/40"
            onClick={onClose}
          />

          {/* sheet — cream, ink hairline top rule, square corners, no shadow */}
          <MotionDiv
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={(_e, info) => { if (info.offset.y > 100) onClose(); }}
            className="relative bg-wrapped-paper text-wrapped-ink border-t border-wrapped-ink rounded-t-[2px] max-h-[80vh] flex flex-col"
          >
            {/* header — kicker + close */}
            <div className="flex items-start justify-between gap-3 px-6 pt-4 pb-3 border-b border-wrapped-ink/30">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-wrapped-ink pt-0.5 [overflow-wrap:anywhere]">
                {title}
              </p>
              <button type="button" onClick={onClose} aria-label="Close" className="p-1 -mr-1 -mt-1 shrink-0">
                <XIcon size={20} weight="bold" />
              </button>
            </div>

            {/* body — content-sized, scrolls internally when tall */}
            <div className="px-6 pt-3 pb-safe-10 overflow-y-auto">
              {children}
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
