// src/components/HomepageSkeleton.jsx

export default function SkeletonHomepage() {
  return (
    <div className="animate-pulse">
      {/* Top green section */}
      <div className="bg-primary-dark w-full h-[100vw] rounded-b-3xl px-6 pt-safe-bar pb-24 text-white relative z-0">
        <div className="flex justify-between gap-6">
          <div className="space-y-2">
            <div className="h-3 w-24 bg-white/30 rounded" />
            <div className="h-5 w-20 bg-white/60 rounded" />
            <div className="h-3 w-32 bg-white/30 rounded" />
          </div>
          <div className="text-right space-y-2">
            <div className="h-3 w-24 bg-white/30 rounded ml-auto" />
            <div className="h-5 w-20 bg-white/60 rounded ml-auto" />
            <div className="h-3 w-32 bg-white/30 rounded ml-auto" />
          </div>
        </div>

        {/* Chart placeholder */}
        <div className="mt-6 h-28 bg-white/20 rounded" />
      </div>

      {/* Floating buttons */}
      <div className="absolute left-0 right-0 -bottom-6 px-4 flex gap-4 z-20">
        <div className="flex-1 bg-white rounded-xl h-[100px] shadow-md" />
        <div className="flex-1 bg-subtle rounded-xl h-[100px] shadow-inner" />
      </div>

      {/* Below content placeholders */}
      <div className="mt-32 px-4 space-y-4">
        <div className="bg-white rounded-xl h-[80px] w-full" />
        <div className="bg-white rounded-xl h-[60px] w-full" />
        <div className="bg-white rounded-xl h-[60px] w-full" />
        <div className="bg-white rounded-xl h-[60px] w-full" />
      </div>
    </div>
  );
}
