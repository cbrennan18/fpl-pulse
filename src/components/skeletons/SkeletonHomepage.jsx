import { HEADER_GRADIENT } from '../../utils/constants';

export default function SkeletonHomepage() {
  return (
    <div className="animate-pulse">
      {/* Header + chart seamless */}
      <div style={{ background: HEADER_GRADIENT }}>
        <div className="px-5 pt-safe-6">
          <div className="flex items-center justify-between mb-5">
            <div className="w-6 h-6 rounded bg-white/10" />
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="w-6 h-6 rounded bg-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-4 pb-4">
            <div className="space-y-2">
              <div className="h-2 w-20 rounded bg-white/10" />
              <div className="h-12 w-28 rounded bg-white/10" />
              <div className="h-2 w-24 rounded bg-white/10" />
            </div>
            <div className="space-y-2 flex flex-col items-end">
              <div className="h-2 w-20 rounded bg-white/10" />
              <div className="h-12 w-24 rounded bg-white/10" />
              <div className="h-2 w-20 rounded bg-white/10" />
            </div>
          </div>
        </div>
        <div className="h-40" />
      </div>

      {/* Rising / Falling */}
      <div className="flex items-center justify-center gap-5 py-1">
        <div className="h-10 w-14 rounded bg-white/10" />
        <div className="h-6 w-px bg-white/10" />
        <div className="h-10 w-14 rounded bg-white/10" />
      </div>

      {/* GW Summary */}
      <div className="mx-4 mt-1 bg-[#141414] rounded-xl h-[60px]" />

      {/* Banners */}
      <div className="px-4 mt-2.5 space-y-2">
        <div className="bg-[#141414] rounded-xl h-[100px] border-l-2 border-white/10" />
        <div className="bg-[#141414] rounded-xl h-[100px] border-l-2 border-white/10" />
      </div>

      {/* Deadline */}
      <div className="py-3">
        <div className="h-3 w-52 rounded bg-white/10 mx-auto" />
      </div>
    </div>
  );
}
