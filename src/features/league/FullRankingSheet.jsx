import { MEDAL_COLORS } from '../../utils/constants';

export default function FullRankingSheet({ entries, userName, accent }) {
  return (
    <div>
      {entries.map((entry, i) => {
        const rank = i + 1;
        const isUser = entry.name === userName;
        const isTop3 = rank <= 3;
        const isWinner = rank === 1;

        return (
          <div
            key={`${entry.name}-${entry.score}`}
            className="flex items-center py-1.5"
            style={{
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined,
              borderLeft: isUser ? '2px solid #00e87a' : '2px solid transparent',
            }}
          >
            <span className="font-mono text-[13px] tabular-nums text-[#525252] w-[28px] shrink-0 text-right pr-2">
              {rank}
            </span>
            {isTop3 ? (
              <div
                className="w-2 h-2 rounded-full shrink-0 mr-2"
                style={{ backgroundColor: MEDAL_COLORS[i] }}
              />
            ) : (
              <div className="w-2 h-2 shrink-0 mr-2" />
            )}
            <div className="flex-1 min-w-0">
              <span
                className="font-body font-medium text-[13px] leading-tight"
                style={{ color: isUser ? '#00e87a' : isWinner ? '#ffffff' : '#a8a8a8' }}
              >
                {entry.name}
              </span>
              {entry.contextString && (
                <p className="font-mono text-[10px] text-[#525252] mt-0.5">{entry.contextString}</p>
              )}
            </div>
            {isWinner ? (
              <span
                className="font-display text-[36px] leading-[0.85] shrink-0 ml-3"
                style={{ color: accent }}
              >
                {entry.value}
              </span>
            ) : (
              <span className="font-mono text-[13px] text-[#a8a8a8] shrink-0 ml-3">
                {entry.value}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
