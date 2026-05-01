import { getIcon } from './iconRegistry';
import { FORMAT_DIMS, PALETTE } from './constants';
import { formatWinnerName } from './nameFormatting';
import PulseLogo from '../../../assets/logo-mark.svg';

const { bg: BG, panel: PANEL, border: BORDER, accent: ACCENT, subtext: SUBTEXT, micro: MICRO } = PALETTE;

const RANK_COLORS = ['#f0b429', '#9fb3be', '#a0522d'];

// ---------- Shared ----------

function MiniLeaderboard({ rows, paddingTop = 8, marginTop = 8, gap = 3, rankColors = false }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        paddingTop,
        marginTop,
        borderTop: `1px solid ${BORDER}`,
      }}
    >
      {rows.map((row, idx) => (
        <div
          key={`${row.name}-${idx}`}
          style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}
        >
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 10,
              color: rankColors ? RANK_COLORS[idx] ?? MICRO : MICRO,
              width: 14,
              flexShrink: 0,
              fontWeight: 600,
            }}
          >
            {idx + 1}
          </span>
          <span
            style={{
              fontFamily: 'Manrope, system-ui, sans-serif',
              fontSize: 12,
              color: idx === 0 ? '#ffffff' : SUBTEXT,
              fontWeight: idx === 0 ? 600 : 500,
              flex: 1,
              minWidth: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {row.name}
          </span>
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              color: idx === 0 ? '#ffffff' : SUBTEXT,
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- Twitter (compact) — unchanged behaviour ----------

function CompactCell({ highlight }) {
  const Icon = getIcon(highlight.iconKey);
  const { firstName, rest, isMononym } = formatWinnerName(highlight.winner.name);
  const surname = isMononym ? highlight.winner.name : rest;

  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: '10px 14px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          background: 'rgba(139,92,246,0.12)',
          border: `1px solid ${ACCENT}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={26} weight="duotone" color={ACCENT} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 10,
            letterSpacing: 1.8,
            color: ACCENT,
            textTransform: 'uppercase',
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {highlight.title}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span
            style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 38,
              lineHeight: 0.95,
              color: '#ffffff',
              letterSpacing: 1,
            }}
          >
            {highlight.value}
          </span>
          {highlight.unit && (
            <span
              style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: 11,
                color: SUBTEXT,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              {highlight.unit}
            </span>
          )}
        </div>
        {highlight.label && (
          <div
            style={{
              fontFamily: 'Manrope, system-ui, sans-serif',
              fontSize: 11,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.6)',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {highlight.label}
          </div>
        )}
        {firstName && (
          <div
            style={{
              fontFamily: 'Manrope, system-ui, sans-serif',
              fontSize: 12,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.65)',
              marginTop: 3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {firstName}
          </div>
        )}
        <div
          style={{
            fontFamily: 'Manrope, system-ui, sans-serif',
            fontSize: 16,
            fontWeight: 700,
            color: '#ffffff',
            letterSpacing: 0.2,
            lineHeight: 1.0,
            marginTop: firstName ? 0 : 3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {surname}
        </div>
        {highlight.winner.meta && (
          <div
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 10,
              color: MICRO,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {highlight.winner.meta}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- WhatsApp + Instagram (three-zone hero) ----------

// Surname shrink breakpoints — length-based, deterministic so the same name
// renders identically across live preview and exported PNG.
const SURNAME_FIT = { short: 7, medium: 10 };
function surnameScale(surname) {
  const len = (surname ?? '').length;
  if (len <= SURNAME_FIT.short) return 1;
  if (len <= SURNAME_FIT.medium) return 0.9;
  return 0.8;
}

// Right-column tiers mirror the left-column middle-block tiers:
//   first name ↔ title    (DM Mono 10, grey, mixed-case, no tracking)
//   surname    ↔ score    (Bebas Neue at `scoreSize`, white, no tracking)
function HeroName({ name, scoreSize }) {
  const { firstName, rest, isMononym } = formatWinnerName(name);
  const surname = isMononym ? name : rest;
  const surnameStyle = {
    fontFamily: 'Bebas Neue, sans-serif',
    fontSize: scoreSize * surnameScale(surname),
    color: '#ffffff',
    lineHeight: 0.95,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  if (isMononym) {
    return (
      <div style={{ textAlign: 'right' }}>
        <div style={surnameStyle}>{name}</div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'right', minWidth: 0 }}>
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 10,
          fontWeight: 400,
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {firstName}
      </div>
      <div style={surnameStyle}>{rest}</div>
    </div>
  );
}

// Variant-specific visual config so the one component can serve WhatsApp and
// the tighter Instagram layout.
const HERO_VARIANTS = {
  whatsapp: {
    cellPadding: '18px 20px',
    valueSize: 46,
    middleMargins: { title: 2, value: 2, desc: 4 },
    showHeroMeta: true,
    leaderboardInset: { paddingTop: 8, marginTop: 8, gap: 3 },
    leaderboardRows: 3,
  },
  instagram: {
    cellPadding: '12px 20px',
    valueSize: 38,
    middleMargins: { title: 1, value: 1, desc: 2 },
    showHeroMeta: false,
    leaderboardInset: { paddingTop: 6, marginTop: 6, gap: 3 },
    leaderboardRows: 2,
  },
};

function HeroCell({ highlight, variant, showLeaderboard }) {
  const v = HERO_VARIANTS[variant] ?? HERO_VARIANTS.whatsapp;
  const Icon = getIcon(highlight.iconKey);

  return (
    <div
      style={{
        background: PANEL,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        padding: v.cellPadding,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Three-zone top row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '56px 1fr 38%',
          gap: 14,
          alignItems: 'start',
          minWidth: 0,
        }}
      >
        {/* Icon zone */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 10,
            background: 'rgba(139,92,246,0.12)',
            border: `1px solid ${ACCENT}33`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={30} weight="duotone" color={ACCENT} />
        </div>

        {/* Middle zone */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 10,
              letterSpacing: 1.8,
              color: ACCENT,
              textTransform: 'uppercase',
              marginBottom: v.middleMargins.title,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {highlight.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: v.middleMargins.value }}>
            <span
              style={{
                fontFamily: 'Bebas Neue, sans-serif',
                fontSize: v.valueSize,
                lineHeight: 0.95,
                color: '#ffffff',
                letterSpacing: 1,
              }}
            >
              {highlight.value}
            </span>
            {highlight.unit && (
              <span
                style={{
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 11,
                  color: SUBTEXT,
                  textTransform: 'uppercase',
                  letterSpacing: 1.5,
                }}
              >
                {highlight.unit}
              </span>
            )}
          </div>
          {highlight.label && (
            <div
              style={{
                fontFamily: 'Manrope, system-ui, sans-serif',
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                marginTop: v.middleMargins.desc,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {highlight.label}
            </div>
          )}
        </div>

        {/* Hero zone */}
        <div style={{ minWidth: 0 }}>
          <HeroName name={highlight.winner.name} scoreSize={v.valueSize} />
          {v.showHeroMeta && highlight.winner.meta && (
            <div
              style={{
                fontFamily: 'Manrope, system-ui, sans-serif',
                fontSize: 11,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                marginTop: 4,
                textAlign: 'right',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {highlight.winner.meta}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard (full card width) */}
      {showLeaderboard && highlight.leaderboard?.length > 1 && (
        <MiniLeaderboard
          rows={highlight.leaderboard.slice(0, v.leaderboardRows)}
          paddingTop={v.leaderboardInset.paddingTop}
          marginTop={v.leaderboardInset.marginTop}
          gap={v.leaderboardInset.gap}
          rankColors
        />
      )}
    </div>
  );
}

// ---------- Dispatcher ----------

function HighlightCell({ highlight, variant = 'whatsapp', compact = false, showLeaderboard = false }) {
  if (compact) return <CompactCell highlight={highlight} />;
  return <HeroCell highlight={highlight} variant={variant} showLeaderboard={showLeaderboard} />;
}

// ---------- Chrome ----------

function FooterStrip({ leagueName }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'DM Mono, monospace',
        fontSize: 10,
        letterSpacing: 2,
        color: MICRO,
        textTransform: 'uppercase',
        height: 24,
        flexShrink: 0,
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {leagueName || 'Mini-League Awards'}
      </span>
      <span>FPL Pulse · cbrennan.ie/fpl-pulse</span>
    </div>
  );
}

function Header({ gameweek, width, titleSize = 60, badgeSize = 64 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width, flexShrink: 0 }}>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 12,
            letterSpacing: 3,
            color: ACCENT,
            textTransform: 'uppercase',
            marginBottom: 3,
          }}
        >
          Gameweek {gameweek} · Awards
        </div>
        <div
          style={{
            fontFamily: 'Bebas Neue, sans-serif',
            fontSize: titleSize,
            lineHeight: 0.9,
            color: '#ffffff',
            letterSpacing: 1.5,
          }}
        >
          Who Won The Week?
        </div>
      </div>
      <div
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize * 0.25,
          background: `linear-gradient(135deg, ${ACCENT}, #5b2db8)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <img
          src={PulseLogo}
          alt=""
          style={{
            width: badgeSize * 0.55,
            height: badgeSize * 0.55,
            filter: 'brightness(0) invert(1)',
          }}
        />
      </div>
    </div>
  );
}

// ---------- Layout ----------

const LAYOUT_VARIANTS = {
  twitter: {
    padding: 32,
    gap: 14,
    headerTitleSize: 50,
    headerBadgeSize: 56,
    grid: { templateColumns: '1fr 1fr', templateRows: () => 'repeat(4, 1fr)', gap: 10 },
    cellProps: { compact: true },
  },
  whatsapp: {
    padding: 40,
    gap: 20,
    headerTitleSize: 72,
    headerBadgeSize: 80,
    grid: { templateColumns: '1fr 1fr', templateRows: () => 'repeat(4, 1fr)', gap: 12 },
    cellProps: { variant: 'whatsapp', showLeaderboard: true },
  },
  instagram: {
    padding: 40,
    gap: 18,
    headerTitleSize: 64,
    headerBadgeSize: 72,
    grid: { templateColumns: '1fr', templateRows: (n) => `repeat(${n}, 1fr)`, gap: 6 },
    cellProps: { variant: 'instagram', showLeaderboard: true },
  },
};

export default function GwAwardsGraphic({ highlights, gameweek, leagueName, format = 'twitter' }) {
  const v = LAYOUT_VARIANTS[format] ?? LAYOUT_VARIANTS.twitter;
  const dims = FORMAT_DIMS[format] ?? FORMAT_DIMS.twitter;
  const visible = highlights.slice(0, 8);

  return (
    <div
      style={{
        width: dims.width,
        height: dims.height,
        background: BG,
        padding: v.padding,
        display: 'flex',
        flexDirection: 'column',
        gap: v.gap,
        boxSizing: 'border-box',
        color: '#ffffff',
      }}
    >
      <Header
        gameweek={gameweek}
        width={dims.width - v.padding * 2}
        titleSize={v.headerTitleSize}
        badgeSize={v.headerBadgeSize}
      />
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: v.grid.templateColumns,
          gridTemplateRows: v.grid.templateRows(visible.length),
          gap: v.grid.gap,
          minHeight: 0,
        }}
      >
        {visible.map((h) => (
          <HighlightCell key={h.id} highlight={h} {...v.cellProps} />
        ))}
      </div>
      <FooterStrip leagueName={leagueName} />
    </div>
  );
}
