import { useMemo, useState } from 'react';
import { ShareNetworkIcon } from '@phosphor-icons/react';
import GwAwardsPreview from './GwAwardsPreview';
import GwAwardsGraphic from './GwAwardsGraphic';
import { FORMAT_DIMS, PALETTE, THUMB_SIZE } from './constants';
import { buildAllHighlights, buildWeeklyHighlights } from './weeklyHighlights';
import useUmami from '../../../hooks/useUmami';

function Thumbnail({ highlights, gameweek, leagueName }) {
  const dims = FORMAT_DIMS.whatsapp;
  const scale = THUMB_SIZE / dims.width;
  return (
    <div
      style={{
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        overflow: 'hidden',
        borderRadius: 10,
        flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: dims.width,
          height: dims.height,
        }}
      >
        <GwAwardsGraphic
          format="whatsapp"
          highlights={highlights}
          gameweek={gameweek}
          leagueName={leagueName}
        />
      </div>
    </div>
  );
}

export default function GwAwardsCard({ awards, medalTable, gameweek, leagueName, biMonthlyMeta }) {
  const [open, setOpen] = useState(false);
  const { track } = useUmami();

  // Curated 7 powers the thumbnail and the headline count on the card itself.
  const curatedHighlights = useMemo(
    () => buildWeeklyHighlights({ awards, medalTable }),
    [awards, medalTable]
  );

  // The full list (including periodic prizes when present) feeds the picker.
  const allHighlights = useMemo(
    () => buildAllHighlights({ awards, medalTable, biMonthlyMeta }),
    [awards, medalTable, biMonthlyMeta]
  );

  if (allHighlights.length === 0 || !gameweek) return null;

  // Thumbnail prefers the curated set but falls back to whatever's available
  // so leagues without the curated keys still get a usable card.
  const thumbHighlights = curatedHighlights.length > 0 ? curatedHighlights : allHighlights.slice(0, 7);

  return (
    <>
      <div className="px-4 mb-5">
        <button
          onClick={() => {
            track('gw_awards_card_open', { gameweek, count: allHighlights.length });
            setOpen(true);
          }}
          className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors active:bg-white/5 bg-[#141414] border border-accent-purple/25"
        >
          <Thumbnail highlights={thumbHighlights} gameweek={gameweek} leagueName={leagueName} />

          <div className="flex-1 min-w-0">
            <div className="font-mono text-[9px] uppercase tracking-widest text-accent-purple">
              GW{gameweek} · Shareable
            </div>
            <div className="font-display text-[20px] text-white tracking-wide leading-tight mt-1">
              Who Won The Week?
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#8a8a8a] mt-1">
              {allHighlights.length} awards · ready to share
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg shrink-0 bg-accent-purple/10 border border-accent-purple">
            <ShareNetworkIcon size={16} weight="duotone" color={PALETTE.accent} />
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent-purple">
              Share
            </span>
          </div>
        </button>
      </div>

      <GwAwardsPreview
        isOpen={open}
        onClose={() => setOpen(false)}
        highlights={allHighlights}
        gameweek={gameweek}
        leagueName={leagueName}
      />
    </>
  );
}
