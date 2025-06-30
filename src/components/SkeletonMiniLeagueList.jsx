// src/components/SkeletonMiniLeagueList.jsx

export default function SkeletonMiniLeagueList() {
  return (
    <div className="animate-pulse">
      {/* Parallax green background */}
      <div className="bg-primary-dark w-full h-[100vw] rounded-b-3xl z-0" />

      {/* List container */}
      <div className="relative z-10 px-6 pt-safe-bar space-y-4 pb-96">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-full bg-white shadow-md rounded-xl px-4 py-4 flex justify-between items-center"
          >
            <div className="space-y-2">
              <div className="h-4 w-48 bg-gray-200 rounded" />
              <div className="h-3 w-24 bg-gray-100 rounded" />
            </div>
            <div className="h-5 w-5 bg-gray-300 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
