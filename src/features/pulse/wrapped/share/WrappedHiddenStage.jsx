// features/pulse/wrapped/share/WrappedHiddenStage.jsx
//
// Off-screen, full-size container the rasteriser captures from — the Wrapped
// twin of `awards-share/HiddenStage.jsx`. The outer wrapper is
// `position: fixed; left: -99999px` so it's invisible; the inner `stageRef` div
// is in normal flow so html-to-image's <foreignObject> lays it out at true pixel
// dimensions (position: fixed collapses inside foreignObject → blank PNG). The
// rasterised node is this hidden CLONE, never the visible Cover screen.
//
// Session 1 renders only the Cover card; later sessions switch on the beat.

import { FORMAT_DIMS } from '../../../league/awards-share/constants';
import CoverCard from './CoverCard';

const DIMS = FORMAT_DIMS.whatsapp; // 1080 × 1080

export default function WrappedHiddenStage({ leagueName, stageRef }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: -99999,
        top: 0,
        width: DIMS.width,
        height: DIMS.height,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div ref={stageRef} style={{ width: DIMS.width, height: DIMS.height }}>
        <CoverCard leagueName={leagueName} />
      </div>
    </div>
  );
}
