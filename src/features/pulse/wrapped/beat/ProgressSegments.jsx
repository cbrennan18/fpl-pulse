// features/pulse/wrapped/beat/ProgressSegments.jsx
//
// One segment per beat (+ the cover) — NOT per screen (design-spec §1). A beat's
// 2–3 screens live under a single segment. Hairline ruled bars, no rounding.

export default function ProgressSegments({ total, activeSegment }) {
  return (
    <div className="flex gap-1" role="progressbar" aria-valuenow={activeSegment} aria-valuemax={total - 1}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < activeSegment;
        const active = i === activeSegment;
        return (
          <span
            key={i}
            className={
              'h-[3px] flex-1 ' +
              (done ? 'bg-wrapped-ink' : active ? 'bg-wrapped-green' : 'bg-wrapped-ink/20')
            }
          />
        );
      })}
    </div>
  );
}
