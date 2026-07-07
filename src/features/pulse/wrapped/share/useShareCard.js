// features/pulse/wrapped/share/useShareCard.js
//
// Orchestrates the Wrapped share pipe: rasterise the off-screen card node → PNG
// → native share sheet (download fallback). Reuses the awards-share infra
// (`exportImage.js`, which itself pulls in `fontEmbedCss.js`) UNCHANGED — no
// bespoke capture or font handling here.
//
// Returns { stageRef, share, busy }: mount <WrappedHiddenStage stageRef={stageRef} />
// off-screen, wire `share` to the beats' onShare, read `busy` to guard taps.

import { useRef, useState, useCallback } from 'react';
import { FORMAT_DIMS } from '../../../league/awards-share/constants';
import { captureNodeToBlob, sharePngBlob } from '../../../league/awards-share/exportImage';
import { SEASON_LABEL } from '../constants';
import useUmami from '../../../../hooks/useUmami';

export default function useShareCard({ leagueName } = {}) {
  const stageRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { track } = useUmami();

  const share = useCallback(async () => {
    if (busy || !stageRef.current) return;
    setBusy(true);
    try {
      const blob = await captureNodeToBlob(stageRef.current, FORMAT_DIMS.whatsapp);
      const result = await sharePngBlob(blob, `fpl-pulse-${SEASON_LABEL.replace('/', '-')}.png`, {
        title: 'FPL Pulse',
        text: leagueName
          ? `My ${leagueName} season, wrapped — ${SEASON_LABEL}`
          : `My FPL season, wrapped — ${SEASON_LABEL}`,
      });
      track('wrapped_share', { method: result.method });
    } catch (err) {
      console.error('[wrapped share]', err);
    } finally {
      setBusy(false);
    }
  }, [busy, leagueName, track]);

  return { stageRef, share, busy };
}
