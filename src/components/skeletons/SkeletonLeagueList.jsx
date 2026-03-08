export default function SkeletonLeagueList() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Nav bar placeholder */}
      <div className="px-5 pt-safe-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-7 h-7 rounded bg-white/[0.06] animate-pulse" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-24 h-4 rounded bg-white/[0.06] animate-pulse" />
            <div className="w-32 h-3 rounded bg-white/[0.04] animate-pulse" />
          </div>
          <div className="w-6 h-6 rounded bg-white/[0.06] animate-pulse" />
        </div>
      </div>

      {/* Summary strip placeholder */}
      <div className="bg-[#141414] px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="w-52 h-3 rounded bg-white/[0.06] animate-pulse mx-auto" />
      </div>

      {/* Row placeholders */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[64px] flex items-center"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="w-[72px] shrink-0 flex justify-end pr-3">
            <div className="w-6 h-4 rounded bg-white/[0.06] animate-pulse" />
          </div>
          <div className="flex-1 py-3 pr-4 space-y-1.5">
            <div className="h-3.5 rounded bg-white/[0.06] animate-pulse" style={{ width: `${55 + (i * 11) % 35}%` }} />
            <div className="h-2.5 w-20 rounded bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
