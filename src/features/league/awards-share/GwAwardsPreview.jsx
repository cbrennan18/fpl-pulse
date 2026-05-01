import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckSquareIcon, SquareIcon, ShareNetworkIcon, DownloadSimpleIcon, CopySimpleIcon } from '@phosphor-icons/react';
import BottomSheet from '../../../components/BottomSheet';
import GwAwardsGraphic from './GwAwardsGraphic';
import HiddenStage from './HiddenStage';
import { FORMAT_DIMS, PALETTE } from './constants';
import { captureNodeToBlob, copyBlobToClipboard, downloadBlob, sharePngBlob } from './exportImage';
import { DEFAULT_SELECTED_IDS } from './weeklyHighlights';
import { groupHighlightsForPicker } from './pickerCategories';
import useUmami from '../../../hooks/useUmami';

const MAX_SELECTED = 8;
const MIN_SELECTED = 1;

const FORMAT_LABELS = {
  whatsapp: 'WhatsApp',
  twitter: 'Twitter / X',
  instagram: 'Instagram',
};

function ScaledGraphic({ format, highlights, gameweek, leagueName }) {
  const dims = FORMAT_DIMS[format];
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setContainerWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = containerWidth ? Math.min(1, containerWidth / dims.width) : 0;

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          height: dims.height * scale,
          overflow: 'hidden',
          borderRadius: 12,
          background: '#0a0a0a',
        }}
      >
        {scale > 0 && (
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
        )}
      </div>
    </div>
  );
}

function FormatPill({ value, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`font-mono text-[10px] uppercase tracking-widest px-3 py-2 rounded-md transition-colors border ${
        active
          ? 'border-accent-purple text-accent-purple bg-accent-purple/10'
          : 'border-white/15 text-white bg-transparent'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      {FORMAT_LABELS[value]}
    </button>
  );
}

function SelectionRow({ highlight, checked, onToggle, disabled }) {
  const Icon = checked ? CheckSquareIcon : SquareIcon;
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-full flex items-center gap-3 py-2 text-left ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${
        disabled && !checked ? 'opacity-40' : ''
      }`}
    >
      <Icon size={20} weight={checked ? 'fill' : 'regular'} color={checked ? PALETTE.accent : PALETTE.micro} />
      <span
        className="font-mono text-[10px] uppercase tracking-wider text-[#525252]"
        style={{ minWidth: 90 }}
      >
        {highlight.title}
      </span>
      <span className="font-body font-medium text-[13px] text-white truncate flex-1 min-w-0">
        {highlight.winner.name}
      </span>
      <span className="font-mono text-[12px] text-white/70 tabular-nums shrink-0">
        {highlight.value}{highlight.unit ? highlight.unit : ''}
      </span>
    </button>
  );
}

function ActionButton({ icon, label, onClick, disabled, busy, primary }) {
  const Icon = icon;
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg transition-colors border ${
        primary
          ? 'border-accent-purple bg-accent-purple/10'
          : 'border-white/10 bg-[#1a1a1a]'
      } ${disabled || busy ? 'opacity-50' : ''}`}
    >
      <Icon size={20} weight="duotone" color={primary ? PALETTE.accent : '#ffffff'} />
      <span
        className={`font-mono text-[9px] uppercase tracking-widest ${primary ? 'text-accent-purple' : 'text-[#a8a8a8]'}`}
      >
        {label}
      </span>
    </button>
  );
}

// `highlights` is the FULL list (from buildAllHighlights). The default
// selection narrows to the curated DEFAULT_SELECTED_IDS that are present.
export default function GwAwardsPreview({
  isOpen,
  onClose,
  highlights,
  gameweek,
  leagueName,
}) {
  const [format, setFormat] = useState('whatsapp');
  const [selectedIds, setSelectedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const stageRef = useRef(null);
  const { track } = useUmami();

  // Reset selection to the curated defaults when the sheet opens or the
  // source highlights change. Skip while closed so we don't churn state for an
  // invisible sheet.
  useEffect(() => {
    if (!isOpen) return;
    const availableIds = new Set(highlights.map((h) => h.id));
    const defaults = DEFAULT_SELECTED_IDS.filter((id) => availableIds.has(id));
    setSelectedIds(defaults.length > 0 ? defaults : highlights.slice(0, MAX_SELECTED).map((h) => h.id));
    setStatus('');
  }, [highlights, isOpen]);

  const filtered = useMemo(
    () => highlights.filter((h) => selectedIds.includes(h.id)),
    [highlights, selectedIds]
  );

  const groups = useMemo(() => groupHighlightsForPicker(highlights), [highlights]);

  function toggleSelected(id) {
    setSelectedIds((curr) => {
      if (curr.includes(id)) {
        if (curr.length <= MIN_SELECTED) return curr;
        return curr.filter((x) => x !== id);
      }
      if (curr.length >= MAX_SELECTED) return curr;
      return [...curr, id];
    });
  }

  // Shared envelope: capture once, run the supplied action, set busy/status,
  // log to umami. Returns the action's return value (or undefined on error).
  async function withCapture(label, fn) {
    if (!stageRef.current || filtered.length === 0) return;
    setBusy(true);
    setStatus(`${label}…`);
    try {
      const blob = await captureNodeToBlob(stageRef.current, FORMAT_DIMS[format]);
      return await fn(blob);
    } catch (err) {
      console.error(`[${label.toLowerCase()}]`, err);
      setStatus(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  }

  const filename = () => `gw${gameweek}-awards-${format}.png`;

  async function handleShare() {
    await withCapture('Preparing share', async (blob) => {
      const result = await sharePngBlob(blob, filename(), {
        title: `GW${gameweek} Awards`,
        text: leagueName ? `Who won GW${gameweek} in ${leagueName}?` : `GW${gameweek} mini-league awards`,
      });
      track('gw_awards_share', { gameweek, format, count: filtered.length, method: result.method });
      setStatus(result.method === 'web-share' ? 'Shared' : result.method === 'download' ? 'Downloaded' : '');
    });
  }

  async function handleSave() {
    await withCapture('Saving', (blob) => {
      downloadBlob(blob, filename());
      track('gw_awards_save', { gameweek, format, count: filtered.length });
      setStatus('Saved to downloads');
    });
  }

  async function handleCopy() {
    await withCapture('Copying', async (blob) => {
      try {
        await copyBlobToClipboard(blob);
        track('gw_awards_copy', { gameweek, format, count: filtered.length });
        setStatus('Copied to clipboard');
      } catch (err) {
        console.error('[copy]', err);
        downloadBlob(blob, filename());
        track('gw_awards_save', { gameweek, format, count: filtered.length, fallbackFromCopy: true });
        setStatus('Copy unsupported — saved instead');
      }
    });
  }

  const selectedCount = selectedIds.length;
  const atMax = selectedCount >= MAX_SELECTED;
  const dims = FORMAT_DIMS[format];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={`GW${gameweek} Awards`}>
      <div className="flex flex-col gap-4">
        {/* Format pills */}
        <div className="flex gap-2 flex-wrap">
          {Object.keys(FORMAT_LABELS).map((f) => (
            <FormatPill
              key={f}
              value={f}
              active={format === f}
              onClick={() => setFormat(f)}
              disabled={busy}
            />
          ))}
          <span
            className="font-mono text-[10px] uppercase tracking-widest ml-auto self-center"
            style={{ color: '#525252' }}
          >
            {dims.width}×{dims.height}
          </span>
        </div>

        {/* Live preview */}
        <ScaledGraphic
          format={format}
          highlights={filtered}
          gameweek={gameweek}
          leagueName={leagueName}
        />

        {/* Selection — grouped */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-accent-purple">
              Awards · {selectedCount}/{MAX_SELECTED}
            </span>
            <span className={`font-mono text-[9px] ${atMax ? 'text-accent-purple' : 'text-[#525252]'}`}>
              {atMax ? `Max ${MAX_SELECTED} selected` : 'tap to toggle'}
            </span>
          </div>

          {groups.map((group) => (
            <div key={group.id} className="mb-3">
              <div
                className="font-mono text-[9px] uppercase tracking-widest pb-1.5"
                style={{ color: '#525252' }}
              >
                {group.label}
              </div>
              <div className="flex flex-col" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {group.items.map((h) => {
                  const checked = selectedIds.includes(h.id);
                  const atMinForThis = checked && selectedCount <= MIN_SELECTED;
                  const atMaxForThis = !checked && atMax;
                  return (
                    <div key={h.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <SelectionRow
                        highlight={h}
                        checked={checked}
                        onToggle={() => toggleSelected(h.id)}
                        disabled={busy || atMinForThis || atMaxForThis}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Action row */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <ActionButton
            icon={ShareNetworkIcon}
            label="Share"
            onClick={handleShare}
            busy={busy}
            primary
          />
          <ActionButton
            icon={DownloadSimpleIcon}
            label="Save"
            onClick={handleSave}
            busy={busy}
          />
          <ActionButton
            icon={CopySimpleIcon}
            label="Copy"
            onClick={handleCopy}
            busy={busy}
          />
        </div>

        {status && (
          <p
            className="font-mono text-[10px] uppercase tracking-wider text-center"
            style={{ color: '#8a8a8a' }}
          >
            {status}
          </p>
        )}
      </div>

      <HiddenStage
        format={format}
        highlights={filtered}
        gameweek={gameweek}
        leagueName={leagueName}
        stageRef={stageRef}
      />
    </BottomSheet>
  );
}
