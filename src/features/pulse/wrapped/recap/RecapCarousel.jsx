// features/pulse/wrapped/recap/RecapCarousel.jsx
//
// Terminal recap stage (after B11): the "select a card to share · N/11" picker
// (design-spec §5). Shows the ELEVEN beat cards (not the Cover). The preview is
// the SAME registry card component, rendered at its native 1080² and scaled down
// via transform for on-screen display (reuse, not a re-authored thumbnail). The
// full-res CAPTURE happens off-screen in WrappedHiddenStage, which the container
// keeps in sync with `index` — two nodes, one selection.
//
// Share sheet (§5): WhatsApp · More (native) both go through the native share
// sheet (an image can't ride a wa.me URL); Download image; Copy link = the G4
// shared-link URL (?league=&via=link → the sharer's league roster-pick).

import { useState } from 'react';
import { CaretLeftIcon, CaretRightIcon, WhatsappLogoIcon, ShareNetworkIcon, DownloadSimpleIcon, LinkIcon } from '@phosphor-icons/react';
import WrappedScreen from '../WrappedScreen';
import { BEATS } from '../constants';
import { BEAT_CARDS } from '../share/beatCardRegistry';
import { useWrapped } from '../PackContext';

const PREVIEW_PX = 340;
const CARD_PX = 1080;

function ShareButton({ children, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-wrapped-ink"
    >
      <span className="w-14 h-14 border-2 border-wrapped-ink flex items-center justify-center">
        {children}
      </span>
      {label}
    </button>
  );
}

export default function RecapCarousel({ index, onIndex, onShare, onDownload, onReplay, onClose }) {
  const { leagueId } = useWrapped();
  const [copied, setCopied] = useState(false);

  const beat = BEATS[index];
  const Card = BEAT_CARDS[beat.id];

  const prev = () => onIndex((index - 1 + BEATS.length) % BEATS.length);
  const next = () => onIndex((index + 1) % BEATS.length);

  const copyLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?league=${leagueId}&via=link`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (err) {
      console.error('[wrapped copy link]', err);
    }
  };

  return (
    <WrappedScreen className="flex flex-col px-6 pt-safe-bar pb-safe-10">
      <header className="border-b-2 border-wrapped-ink pb-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-wrapped-muted">
          Back page · Select a card
        </p>
        <h1 className="font-display text-5xl leading-[0.9] tracking-tight mt-2">The recap</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-wrapped-muted self-start">
          {index + 1} / {BEATS.length} · {beat.theme}
        </p>

        <div className="flex items-center gap-4">
          <button type="button" onClick={prev} aria-label="Previous card" className="p-2 shrink-0">
            <CaretLeftIcon size={28} weight="bold" />
          </button>

          {/* Preview: the real card at 1080², scaled to fit. Not rasterised — the
              off-screen hidden stage is the capture source. */}
          <div
            style={{ width: PREVIEW_PX, height: PREVIEW_PX, overflow: 'hidden' }}
            className="border-2 border-wrapped-ink shrink-0"
          >
            <div style={{ width: CARD_PX, height: CARD_PX, transform: `scale(${PREVIEW_PX / CARD_PX})`, transformOrigin: 'top left' }}>
              <Card beat={beat} />
            </div>
          </div>

          <button type="button" onClick={next} aria-label="Next card" className="p-2 shrink-0">
            <CaretRightIcon size={28} weight="bold" />
          </button>
        </div>

        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {BEATS.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`Card ${i + 1}: ${b.theme}`}
              onClick={() => onIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-5 bg-wrapped-ink' : 'w-2 bg-wrapped-ink/30'}`}
            />
          ))}
        </div>

        {/* Share sheet */}
        <div className="flex items-start justify-center gap-6 mt-2">
          <ShareButton label="WhatsApp" onClick={onShare}><WhatsappLogoIcon size={26} weight="bold" /></ShareButton>
          <ShareButton label="More" onClick={onShare}><ShareNetworkIcon size={26} weight="bold" /></ShareButton>
          <ShareButton label="Save" onClick={onDownload}><DownloadSimpleIcon size={26} weight="bold" /></ShareButton>
          <ShareButton label={copied ? 'Copied' : 'Copy link'} onClick={copyLink}><LinkIcon size={26} weight="bold" /></ShareButton>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onReplay}
          className="border-2 border-wrapped-ink px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] hover:bg-wrapped-ink hover:text-wrapped-paper transition-colors"
        >
          ↺ Replay
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] text-wrapped-muted underline underline-offset-4"
        >
          Close
        </button>
      </div>
    </WrappedScreen>
  );
}
