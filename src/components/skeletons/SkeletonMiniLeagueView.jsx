// src/components/SkeletonMiniLeagueView.jsx

export default function SkeletonMiniLeagueView() {
  return (
    <div className="animate-pulse">
      {/* Green header section */}
      <div className="bg-primary-dark w-full h-[100vw] rounded-b-3xl px-6 pt-safe-bar pb-24 text-white">
        <div className="flex justify-between gap-6">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-white/30 rounded" />
            <div className="h-5 w-20 bg-white/60 rounded" />
            <div className="h-3 w-28 bg-white/30 rounded" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-3 w-24 bg-white/30 rounded ml-auto" />
            <div className="h-5 w-20 bg-white/60 rounded ml-auto" />
            <div className="h-3 w-32 bg-white/30 rounded ml-auto" />
          </div>
        </div>

        <div className="mt-6 h-6" />
      </div>

      {/* Standings + Awards */}
      <div className="relative px-4 -translate-y-24 z-20 space-y-6">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-white rounded-xl" />
          ))}
        </div>
        <div className="h-56 bg-white rounded-xl" />
      </div>
    </div>
  );
}
