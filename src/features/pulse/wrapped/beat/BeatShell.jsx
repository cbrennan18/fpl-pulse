// features/pulse/wrapped/beat/BeatShell.jsx
//
// The reusable chrome every beat inherits (design-spec §2). Fixed furniture:
//   top    — segmented progress · theme pill (jump menu) · close (X)
//   body   — the per-beat content (children); the variable payoff lives here
//   bottom — prev (‹) · share (centre) · next (›)
// Advance is manual only: tap the body or swipe (Framer Motion drag). No timers.
//
// Slots are passed as children by the beat (title/hook on screen 0, payoff +
// verdict on screen 1). BeatShell owns gestures + chrome only — it stays dumb
// about beat content so every beat reuses it unchanged.

import { motion } from 'framer-motion';
import { XIcon, ShareNetworkIcon, CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import WrappedScreen from '../WrappedScreen';
import ProgressSegments from './ProgressSegments';
import ThemePill from './ThemePill';

// bound to a reference so the draggable body reads as a normal component
const MotionDiv = motion.div;

export default function BeatShell({
  beat,
  beats,
  beatIndex,
  totalSegments,
  onNext,
  onPrev,
  onJump,
  onClose,
  onShare,
  children,
}) {
  return (
    <WrappedScreen className="flex flex-col">
      {/* top chrome */}
      <header className="px-5 pt-safe-bar pb-3 space-y-3">
        <ProgressSegments total={totalSegments} activeSegment={beatIndex + 1} />
        <div className="flex items-center justify-between gap-3">
          <ThemePill
            label={`${beat.edition} — ${beat.theme}`}
            beats={beats}
            currentIndex={beatIndex}
            onJump={onJump}
          />
          <button type="button" onClick={onClose} aria-label="Close" className="p-1">
            <XIcon size={22} weight="bold" />
          </button>
        </div>
      </header>

      {/* body — tap / swipe to advance */}
      <MotionDiv
        className="flex-1 px-6 py-4 overflow-hidden"
        onClick={onNext}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_e, info) => {
          if (info.offset.x < -80) onNext();
          else if (info.offset.x > 80) onPrev();
        }}
      >
        {children}
      </MotionDiv>

      {/* bottom chrome */}
      <footer className="px-8 pb-safe-10 pt-3 border-t border-wrapped-ink/30 flex items-center justify-between">
        <button type="button" onClick={onPrev} aria-label="Previous" className="p-2">
          <CaretLeftIcon size={24} weight="bold" />
        </button>
        <button type="button" onClick={onShare} aria-label="Share this beat" className="p-2">
          <ShareNetworkIcon size={24} weight="bold" />
        </button>
        <button type="button" onClick={onNext} aria-label="Next" className="p-2">
          <CaretRightIcon size={24} weight="bold" />
        </button>
      </footer>
    </WrappedScreen>
  );
}
