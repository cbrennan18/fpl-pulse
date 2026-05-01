import GwAwardsGraphic from './GwAwardsGraphic';
import { FORMAT_DIMS } from './constants';

// Off-screen, full-size container the rasteriser captures from. The outer
// wrapper is `position: fixed; left: -99999px` so it's invisible; the inner
// `stageRef` div is in normal flow so html-to-image's `<foreignObject>` can
// lay it out at true pixel dimensions (position: fixed collapses inside
// foreignObject, leaving a blank PNG — see step 4 / step 9 debugging).
export default function HiddenStage({ format, highlights, gameweek, leagueName, stageRef }) {
  const dims = FORMAT_DIMS[format];
  return (
    <div
      style={{
        position: 'fixed',
        left: -99999,
        top: 0,
        width: dims.width,
        height: dims.height,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <div ref={stageRef} style={{ width: dims.width, height: dims.height }}>
        <GwAwardsGraphic
          highlights={highlights}
          gameweek={gameweek}
          leagueName={leagueName}
          format={format}
        />
      </div>
    </div>
  );
}
