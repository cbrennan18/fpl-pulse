import { useEffect, useState } from 'react';

export default function DeadlineStrip({ deadline }) {
  const deadlineDate = new Date(deadline.deadline_time);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = deadlineDate - now;

      if (diff <= 0) {
        clearInterval(interval);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline.deadline_time]);

  const formatted = deadlineDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const { days, hours, minutes, seconds } = timeLeft;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (days > 0 || hours > 0) parts.push(`${hours}h`);
  if (days > 0 || hours > 0 || minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  const countdown = parts.join(' ');

  return (
    <p className="font-mono text-[11px] text-center">
      <span className="text-[#f0b429]">GW{deadline.event} DEADLINE</span>
      <span className="text-[#707070]"> &middot; {formatted} &middot; </span>
      <span className="text-[#00e87a] tabular-nums">{countdown}</span>
    </p>
  );
}
