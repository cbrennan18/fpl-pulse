import { useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  Filler,
  CategoryScale,
} from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, Filler, CategoryScale);

export default function OverallRankChart({ history }) {
  const chartRef = useRef(null);

  const labels = history.map((_, i) => `${i + 1}`);
  const ranks = history;

  const [activeIndex, setActiveIndex] = useState(() => {
    const maxRank = Math.max(...ranks);
    return ranks.indexOf(maxRank);
  });

  const data = {
    labels,
    datasets: [
      {
        data: ranks,
        fill: {
          target: 'start',
        },
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: '#ffffff',
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onHover: (event) => {
      const chart = chartRef.current;
      if (!chart) return;

      const x = event.native.offsetX;
      const xScale = chart.scales.x;
      const index = xScale.getValueForPixel(x);

      const closestIndex = Math.min(
        Math.max(Math.round(index), 0),
        ranks.length - 1
      );
      setActiveIndex(closestIndex);
    },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false, reverse: true },
    },
    elements: {
      line: { borderWidth: 2 },
    },
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
  };

  const dotStyle = () => {
    const chart = chartRef.current;
    if (!chart) return { display: 'none' };

    const x = chart.scales.x.getPixelForValue(activeIndex);
    const y = chart.scales.y.getPixelForValue(ranks[activeIndex]);

    return {
      left: `${x - 6}px`,
      top: `${y - 6}px`,
      width: '12px',
      height: '12px',
      borderRadius: '9999px',
      backgroundColor: 'white',
      position: 'absolute',
      pointerEvents: 'none',
    };
  };

  const handleMove = (e) => {
    const chart = chartRef.current;
    if (!chart) return;

    const rect = chart.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const xScale = chart.scales.x;
    const index = xScale.getValueForPixel(x);

    const closestIndex = Math.min(Math.max(Math.round(index), 0), ranks.length - 1);
    setActiveIndex(closestIndex);
  };

  return (
    <div className="mt-6">
      <div className="relative h-32 w-full">
        <Line ref={chartRef} data={data} options={options} />
        <div
          className="absolute inset-0 z-10"
          onMouseMove={(e) => handleMove(e)}
          onTouchMove={(e) => handleMove(e.touches[0])}
        /> 
        <div style={dotStyle()} />
      </div>

      <div className="mt-4 px-6 flex justify-between items-start gap-6 text-white text-sm">
        <div>
          <p className="text-xs uppercase opacity-80">Overall Rank</p>
          <p className="text-lg font-semibold">{ranks[activeIndex].toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase opacity-80">Gameweek</p>
          <p className="text-lg font-semibold">{labels[activeIndex]}</p>
        </div>
      </div>
    </div>
  );
}