import { useRef, useCallback, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale);

const GREEN = '#00e87a';
const RED = '#e5484d';

export default function OverallRankChart({ history, activeIndex, onScrub, onScrubEnd }) {
  const chartRef = useRef(null);
  const onScrubRef = useRef(onScrub);
  const onScrubEndRef = useRef(onScrubEnd);

  useEffect(() => { onScrubRef.current = onScrub; }, [onScrub]);
  useEffect(() => { onScrubEndRef.current = onScrubEnd; }, [onScrubEnd]);

  const ranks = history.map(gw => gw.overall_rank);
  const labels = ranks.map((_, i) => `${i + 1}`);

  const segmentColor = useCallback((ctx) => {
    const prev = ctx.p0.parsed.y;
    const curr = ctx.p1.parsed.y;
    return curr <= prev ? GREEN : RED;
  }, []);

  // Attach interaction listeners to the canvas after chart mounts
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.canvas;

    let isDown = false;

    const getIndex = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const { chartArea } = chart;
      if (!chartArea || x < chartArea.left || x > chartArea.right) return null;

      const meta = chart.getDatasetMeta(0);
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < meta.data.length; i++) {
        const dist = Math.abs(meta.data[i].x - x);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      }
      return closest;
    };

    const scrub = (clientX) => {
      const idx = getIndex(clientX);
      if (idx !== null) onScrubRef.current?.(idx);
    };

    const end = () => {
      if (isDown) {
        isDown = false;
        canvas.style.cursor = 'pointer';
        onScrubEndRef.current?.();
      }
    };

    const onMouseDown = (e) => {
      isDown = true;
      canvas.style.cursor = 'grabbing';
      scrub(e.clientX);
    };
    const onMouseMove = (e) => { if (isDown) scrub(e.clientX); };
    const onTouchStart = (e) => {
      isDown = true;
      scrub(e.touches[0].clientX);
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      if (isDown) scrub(e.touches[0].clientX);
    };

    // Set default cursor
    canvas.style.cursor = 'pointer';

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', end);
    };
  }, []); // chartRef.current is set during commit phase, available when effect runs

  // Redraw when activeIndex changes
  const activeRef = useRef(activeIndex);
  useEffect(() => {
    activeRef.current = activeIndex;
    chartRef.current?.draw();
  }, [activeIndex]);

  const data = {
    labels,
    datasets: [{
      data: ranks,
      fill: false,
      segment: { borderColor: segmentColor },
      borderColor: GREEN,
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 0,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false, reverse: true },
    },
    elements: { line: { borderWidth: 2 } },
    interaction: { mode: 'nearest', intersect: false },
    layout: { padding: { top: 24, bottom: 4 } },
  };

  // Segmented fill — green under rising segments, red under falling
  const segmentedFill = {
    id: 'segmentedFill',
    beforeDatasetDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      const points = meta.data;
      if (points.length < 2) return;
      const { ctx, chartArea } = chart;
      const ranks = chart.data.datasets[0].data;

      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const isRising = ranks[i] <= ranks[i - 1];
        const color = isRising ? '0,232,122' : '229,72,77';

        const grad = ctx.createLinearGradient(0, Math.min(prev.y, curr.y), 0, chartArea.bottom);
        grad.addColorStop(0, `rgba(${color},0.08)`);
        grad.addColorStop(1, `rgba(${color},0)`);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        if (prev.cp2x !== undefined && curr.cp1x !== undefined) {
          ctx.bezierCurveTo(prev.cp2x, prev.cp2y, curr.cp1x, curr.cp1y, curr.x, curr.y);
        } else {
          ctx.lineTo(curr.x, curr.y);
        }
        ctx.lineTo(curr.x, chartArea.bottom);
        ctx.lineTo(prev.x, chartArea.bottom);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      }
    },
  };

  const endpointDot = {
    id: 'endpointDot',
    afterDraw(chart) {
      const meta = chart.getDatasetMeta(0);
      const lastPoint = meta.data[meta.data.length - 1];
      if (!lastPoint) return;
      const { ctx } = chart;
      ctx.save();
      ctx.beginPath();
      ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = GREEN;
      ctx.fill();
      ctx.restore();
    },
  };

  const scrubOverlay = {
    id: 'scrubOverlay',
    afterDraw(chart) {
      const idx = activeRef.current;
      if (idx === null || idx === undefined) return;

      const meta = chart.getDatasetMeta(0);
      const point = meta.data[idx];
      if (!point) return;

      const { ctx, chartArea } = chart;
      const x = point.x;

      ctx.save();

      // Vertical indicator line
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Dot
      ctx.beginPath();
      ctx.arc(x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Pill tooltip
      const gwLabel = `GW${history[idx]?.event || idx + 1}`;
      ctx.font = '10px "DM Mono", monospace';
      const tw = ctx.measureText(gwLabel).width;
      const pw = tw + 12;
      const ph = 18;
      const px = Math.max(chartArea.left, Math.min(x - pw / 2, chartArea.right - pw));
      const py = Math.max(chartArea.top, point.y - 28);

      ctx.beginPath();
      ctx.roundRect(px, py, pw, ph, 3);
      ctx.fillStyle = '#141414';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(gwLabel, px + pw / 2, py + ph / 2);

      ctx.restore();
    },
  };

  return (
    <div className="w-full h-40" role="img" aria-label="Overall rank chart">
      <Line
        ref={chartRef}
        data={data}
        options={options}
        plugins={[segmentedFill, endpointDot, scrubOverlay]}
      />
    </div>
  );
}
