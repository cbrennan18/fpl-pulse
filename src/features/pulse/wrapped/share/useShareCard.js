// features/pulse/wrapped/share/useShareCard.js
//
// Orchestrates the Wrapped share pipe: rasterise the off-screen card node → PNG
// → native share sheet, or a direct download. Reuses the awards-share infra
// (`exportImage.js`, which itself pulls in `fontEmbedCss.js`) UNCHANGED — no
// bespoke capture or font handling here.
//
// Returns { stageRef, share, download, busy }: mount <WrappedHiddenStage
// stageRef={stageRef} /> off-screen; wire `share`/`download` to the beats'
// onShare and the recap sheet; read `busy` to guard taps. Whatever card the
// hidden stage currently renders (active beat, or the recap-selected card) is
// what gets captured.

import { useRef, useState, useCallback } from 'react';
import { FORMAT_DIMS } from '../../../league/awards-share/constants';
import { captureNodeToBlob, sharePngBlob, downloadBlob } from '../../../league/awards-share/exportImage';
import { SEASON_LABEL } from '../constants';
import useUmami from '../../../../hooks/useUmami';

const FILENAME = `fpl-pulse-${SEASON_LABEL.replace('/', '-')}.png`;

export default function useShareCard({ leagueName } = {}) {
  const stageRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const { track } = useUmami();

  // Capture the current hidden-stage card once, then run the supplied action.
  const withCapture = useCallback(async (fn) => {
    if (busy || !stageRef.current) return;
    setBusy(true);
    try {
      const blob = await captureNodeToBlob(stageRef.current, FORMAT_DIMS.whatsapp);
      await fn(blob);
    } catch (err) {
      console.error('[wrapped share]', err);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const share = useCallback(
    () =>
      withCapture(async (blob) => {
        const result = await sharePngBlob(blob, FILENAME, {
          title: 'FPL Pulse',
          text: leagueName
            ? `My ${leagueName} season, wrapped — ${SEASON_LABEL}`
            : `My FPL season, wrapped — ${SEASON_LABEL}`,
        });
        track('wrapped_share', { method: result.method });
      }),
    [withCapture, leagueName, track]
  );

  const download = useCallback(
    () =>
      withCapture((blob) => {
        downloadBlob(blob, FILENAME);
        track('wrapped_download');
      }),
    [withCapture, track]
  );

  return { stageRef, share, download, busy };
}
