// Chip usage award calculations (Wildcard, Free Hit)

// Evaluates Wildcard chip performance.
// Context: gameweek and score of best and worst Wildcard plays.
export function calculateWildcards(data) {
  const results = Object.values(data)
    .filter(d => d && Array.isArray(d.history) && d.chipWeeks?.wildcard?.length)
    .map(d => {
      const scores = d.chipWeeks.wildcard.map(gw => {
        const gwData = d.history.find(g => g.event === gw);
        return { gw, points: gwData?.points || 0 };
      });

      if (!scores.length) return null;

      const best = scores.reduce((a, b) => (b.points > a.points ? b : a));
      const worst = scores.reduce((a, b) => (b.points < a.points ? b : a));

      return {
        name: d.name,
        best,
        worst
      };
    }).filter(Boolean);

  return {
    best: results
      .sort((a, b) => b.best.points - a.best.points)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        score: p.best.points,
        value: p.best.points.toString(),
        context: { gw: p.best.gw, points: p.best.points }
      })),
    worst: results
      .sort((a, b) => a.worst.points - b.worst.points)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        score: p.worst.points,
        value: p.worst.points.toString(),
        context: { gw: p.worst.gw, points: p.worst.points }
      }))
  };
}

// Evaluates performance of Free Hit chips played by each manager.
// Context: GW and points for best and worst Free Hit usage.
export function calculateFreeHits(data) {
  const results = Object.values(data)
    .filter(player => player && player.chipWeeks?.freehit?.length > 0 && Array.isArray(player.history))
    .map(player => {
      const scores = player.chipWeeks.freehit.map(gw => {
        const gwData = player.history.find(g => g.event === gw);
        return { gw, points: gwData?.points || 0 };
      });

      const best = scores.reduce((a, b) => (b.points > a.points ? b : a));
      const worst = scores.reduce((a, b) => (b.points < a.points ? b : a));

      return {
        name: player.name,
        best,
        worst
      };
    });

  return {
    best: results
      .sort((a, b) => b.best.points - a.best.points)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        score: p.best.points,
        value: p.best.points.toString(),
        context: {
          gw: p.best.gw,
          points: p.best.points
        }
      })),
    worst: results
      .sort((a, b) => a.worst.points - b.worst.points)
      .slice(0, 3)
      .map(p => ({
        name: p.name,
        score: p.worst.points,
        value: p.worst.points.toString(),
        context: {
          gw: p.worst.gw,
          points: p.worst.points
        }
      }))
  };
}
