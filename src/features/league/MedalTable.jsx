import { useState } from 'react';
import { GOLD, SILVER, BRONZE } from '../../utils/constants';

function deltaColor(medalRank, leagueRank) {
  if (medalRank == null || leagueRank == null) return '#525252';
  if (medalRank < leagueRank) return '#00e87a';
  if (medalRank > leagueRank) return '#e5484d';
  return '#525252';
}

function MedalRow({ entry, medalRank, isUser }) {
  const [pressed, setPressed] = useState(false);

  return (
    <div
      className="min-h-[48px] flex items-center px-4 transition-colors duration-150"
      style={{
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        backgroundColor: pressed ? '#1a1a1a' : isUser ? '#141414' : undefined,
        borderLeft: isUser ? '2px solid #00e87a' : '2px solid transparent',
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setTimeout(() => setPressed(false), 150)}
      onPointerLeave={() => setPressed(false)}
    >
      {/* Medal rank */}
      <span className="font-mono text-[13px] tabular-nums w-[36px] shrink-0 text-right pr-3 text-[#525252]">
        {medalRank}
      </span>
      {/* Name */}
      <span
        className="font-body font-medium text-[13px] flex-1 min-w-0 truncate"
        style={{ color: isUser ? '#00e87a' : '#ffffff' }}
      >
        {entry.name}
      </span>
      {/* Medals */}
      <span className="font-mono text-[13px] tabular-nums w-[36px] text-center" style={{ color: GOLD }}>
        {entry.gold || '\u2014'}
      </span>
      <span className="font-mono text-[13px] tabular-nums w-[36px] text-center" style={{ color: SILVER }}>
        {entry.silver || '\u2014'}
      </span>
      <span className="font-mono text-[13px] tabular-nums w-[36px] text-center" style={{ color: BRONZE }}>
        {entry.bronze || '\u2014'}
      </span>
      {/* League rank — delta colored */}
      <span
        className="font-mono text-[13px] tabular-nums w-[36px] shrink-0 text-center"
        style={{ color: deltaColor(medalRank, entry.leagueRank) }}
      >
        {entry.leagueRank ?? '\u2014'}
      </span>
    </div>
  );
}

function Pip({ color }) {
  return <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />;
}

export default function MedalTable({ medalTable, standings, userName }) {
  // Build league rank lookup from standings
  const leagueRankMap = {};
  [...standings].sort((a, b) => a.rank - b.rank).forEach((s) => {
    leagueRankMap[s.player_name] = s.rank;
  });

  // Enrich medal table entries with league rank
  const enriched = medalTable.map((m) => ({
    ...m,
    leagueRank: leagueRankMap[m.name] ?? null,
  }));

  return (
    <div>
      {/* Section header */}
      <div className="px-4 pt-6 pb-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-[#525252]">Medal Table</p>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-4 pb-2">
        <span className="font-mono text-[9px] uppercase tracking-wide text-[#525252] w-[36px] shrink-0 text-right pr-3">
          Rk
        </span>
        <span className="flex-1" />
        <span className="w-[36px] flex justify-center">
          <Pip color={GOLD} />
        </span>
        <span className="w-[36px] flex justify-center">
          <Pip color={SILVER} />
        </span>
        <span className="w-[36px] flex justify-center">
          <Pip color={BRONZE} />
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wide text-[#525252] w-[36px] shrink-0 text-center">
          Lge
        </span>
      </div>

      {/* All rows */}
      {enriched.map((entry, i) => (
        <MedalRow
          key={entry.name}
          entry={entry}
          medalRank={i + 1}
          isUser={entry.name === userName}
        />
      ))}
    </div>
  );
}
