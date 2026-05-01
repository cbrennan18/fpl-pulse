import { useRef, useState } from 'react';
import GwAwardsGraphic from './GwAwardsGraphic';
import GwAwardsPreview from './GwAwardsPreview';
import HiddenStage from './HiddenStage';
import { FORMAT_DIMS, PALETTE } from './constants';
import { buildAllHighlights, buildWeeklyHighlights } from './weeklyHighlights';
import {
  awardsFixture,
  medalTableFixture,
  gameweekFixture,
  biMonthlyMetaFixture,
} from './__mocks__/awardsFixture';
import { captureNodeToBlob, captureNodeToPng, sharePngBlob } from './exportImage';

const PAGE_BG = '#050505';
const LEAGUE_NAME = 'The Midweek Kick';

function ScaledPreview({ format, highlights, gameweek, leagueName, maxWidth = 960 }) {
  const dims = FORMAT_DIMS[format];
  const scale = Math.min(1, maxWidth / dims.width);
  return (
    <div style={{ marginBottom: 40 }}>
      <div
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          letterSpacing: 2,
          color: PALETTE.accent,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {format} · {dims.width}×{dims.height} · scale {scale.toFixed(2)}
      </div>
      <div
        style={{
          width: dims.width * scale,
          height: dims.height * scale,
          overflow: 'hidden',
          borderRadius: 8,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
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
            highlights={highlights}
            gameweek={gameweek}
            leagueName={leagueName}
            format={format}
          />
        </div>
      </div>
    </div>
  );
}

export default function GwAwardsPreviewDev() {
  // Curated 7 for the dev preview's static thumbnails.
  const highlights = buildWeeklyHighlights({
    awards: awardsFixture,
    medalTable: medalTableFixture,
  });
  // Full set passed into the BottomSheet picker for testing.
  const allHighlights = buildAllHighlights({
    awards: awardsFixture,
    medalTable: medalTableFixture,
    biMonthlyMeta: biMonthlyMetaFixture,
  });

  const [format, setFormat] = useState('whatsapp');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const stageRef = useRef(null);

  const dims = FORMAT_DIMS[format];

  async function handleDownload() {
    if (!stageRef.current) return;
    setBusy(true);
    setStatus('Capturing…');
    try {
      const node = stageRef.current;
      const rect = node.getBoundingClientRect();
      console.log('[capture] node rect:', rect, 'children:', node.childElementCount);
      const dataUrl = await captureNodeToPng(node, {
        width: dims.width,
        height: dims.height,
      });
      console.log('[capture] dataUrl length:', dataUrl.length, 'prefix:', dataUrl.slice(0, 60));
      setPreviewUrl(dataUrl);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `gw${gameweekFixture}-awards-${format}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setStatus(`Downloaded · ${dims.width}×${dims.height} · ${(dataUrl.length / 1024).toFixed(1)}KB`);
    } catch (err) {
      console.error('[capture]', err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!stageRef.current) return;
    setBusy(true);
    setStatus('Capturing…');
    try {
      const blob = await captureNodeToBlob(stageRef.current, {
        width: dims.width,
        height: dims.height,
      });
      const result = await sharePngBlob(blob, `gw${gameweekFixture}-awards-${format}.png`, {
        title: `GW${gameweekFixture} Awards`,
        text: `Who won GW${gameweekFixture} in ${LEAGUE_NAME}?`,
      });
      setStatus(`Share: ${result.method}`);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const btnStyle = {
    fontFamily: 'DM Mono, monospace',
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    padding: '10px 16px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: '#141414',
    color: '#fff',
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.5 : 1,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: PAGE_BG,
        color: '#fff',
        padding: 40,
        fontFamily: 'Manrope, system-ui, sans-serif',
      }}
    >
      <h1
        style={{
          fontFamily: 'Bebas Neue, sans-serif',
          fontSize: 48,
          letterSpacing: 2,
          marginBottom: 4,
        }}
      >
        GW Awards · Preview
      </h1>
      <p
        style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 11,
          color: '#525252',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          marginBottom: 24,
        }}
      >
        Fixture-fed · GW{gameweekFixture} · {highlights.length} highlights
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 36,
          flexWrap: 'wrap',
        }}
      >
        {['whatsapp', 'twitter', 'instagram'].map((f) => (
          <button
            key={f}
            onClick={() => setFormat(f)}
            style={{
              ...btnStyle,
              borderColor: format === f ? PALETTE.accent : 'rgba(255,255,255,0.15)',
              color: format === f ? PALETTE.accent : '#fff',
            }}
            disabled={busy}
          >
            {f}
          </button>
        ))}
        <span style={{ width: 8 }} />
        <button onClick={handleDownload} disabled={busy} style={btnStyle}>
          Download PNG
        </button>
        <button onClick={handleShare} disabled={busy} style={btnStyle}>
          Share / Save
        </button>
        <span style={{ width: 8 }} />
        <button
          onClick={() => setSheetOpen(true)}
          disabled={busy}
          style={{ ...btnStyle, borderColor: PALETTE.accent, color: PALETTE.accent }}
        >
          Open Preview Sheet
        </button>
        {status && (
          <span
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              color: '#8a8a8a',
              letterSpacing: 1,
            }}
          >
            {status}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, alignItems: 'flex-start' }}>
        <ScaledPreview
          format="twitter"
          highlights={highlights}
          gameweek={gameweekFixture}
          leagueName={LEAGUE_NAME}
          maxWidth={720}
        />
        <ScaledPreview
          format="whatsapp"
          highlights={highlights}
          gameweek={gameweekFixture}
          leagueName={LEAGUE_NAME}
          maxWidth={520}
        />
        <ScaledPreview
          format="instagram"
          highlights={highlights}
          gameweek={gameweekFixture}
          leagueName={LEAGUE_NAME}
          maxWidth={420}
        />
      </div>

      {previewUrl && (
        <div style={{ marginTop: 40 }}>
          <div
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              letterSpacing: 2,
              color: PALETTE.accent,
              textTransform: 'uppercase',
              marginBottom: 10,
            }}
          >
            Last capture · {format}
          </div>
          <img
            src={previewUrl}
            alt="captured"
            style={{ maxWidth: 520, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
          />
        </div>
      )}

      {/* Off-screen full-size stage for the rasteriser */}
      <HiddenStage
        format={format}
        highlights={highlights}
        gameweek={gameweekFixture}
        leagueName={LEAGUE_NAME}
        stageRef={stageRef}
      />

      <GwAwardsPreview
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        highlights={allHighlights}
        gameweek={gameweekFixture}
        leagueName={LEAGUE_NAME}
      />
    </div>
  );
}
