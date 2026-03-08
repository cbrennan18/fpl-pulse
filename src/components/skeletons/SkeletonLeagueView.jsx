import { HEADER_GRADIENT } from '../../utils/constants';

export default function SkeletonLeagueView() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav bar */}
      <div className="px-5 pt-safe-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-7 h-7 rounded bg-white/[0.06] animate-pulse" />
          <div className="w-40 h-4 rounded bg-white/[0.06] animate-pulse" />
          <div className="w-6 h-6 rounded bg-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* Gradient header */}
      <div style={{ background: HEADER_GRADIENT }}>
        <div className="grid grid-cols-2 gap-4 px-5 pb-6 pt-2">
          <div className="space-y-2">
            <div className="h-2.5 w-20 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-16 w-16 rounded bg-white/[0.06] animate-pulse" />
          </div>
          <div className="space-y-2 flex flex-col items-end">
            <div className="h-2.5 w-24 rounded bg-white/[0.06] animate-pulse" />
            <div className="h-10 w-14 rounded bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      </div>

      {/* Your Season strip */}
      <div className="bg-[#141414] px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="h-2 w-20 rounded bg-white/[0.06] animate-pulse mb-2" />
        <div className="h-3 w-3/4 rounded bg-white/[0.06] animate-pulse" />
      </div>

      {/* Medal table header */}
      <div className="px-4 pt-6 pb-3">
        <div className="h-2 w-24 rounded bg-white/[0.06] animate-pulse" />
      </div>

      {/* Medal table rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[48px] flex items-center px-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="w-[32px] shrink-0 flex justify-end pr-3">
            <div className="w-4 h-3 rounded bg-white/[0.06] animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="h-3.5 rounded bg-white/[0.06] animate-pulse" style={{ width: `${45 + (i * 15) % 40}%` }} />
          </div>
          <div className="w-[108px] flex gap-3 justify-end">
            <div className="w-5 h-3 rounded bg-white/[0.06] animate-pulse" />
            <div className="w-5 h-3 rounded bg-white/[0.06] animate-pulse" />
            <div className="w-5 h-3 rounded bg-white/[0.06] animate-pulse" />
          </div>
        </div>
      ))}

      {/* Awards section */}
      <div className="px-4 pt-6 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="h-2 w-28 rounded bg-white/[0.06] animate-pulse" />
      </div>
      <div className="px-4 pt-3 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl h-[120px] animate-pulse"
            style={{
              backgroundColor: '#141414',
              border: '1px solid rgba(255,255,255,0.07)',
              borderTop: '2px solid rgba(255,255,255,0.1)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
