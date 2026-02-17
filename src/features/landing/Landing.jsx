import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Logo from '../../components/Logo';
import LogoAnimated from '../../components/LogoAnimated';

export default function Landing() {
  const [teamId, setTeamId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (teamId.trim()) {
      navigate(`/home?id=${teamId}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-text">
      {/* Scrollable content area with safe padding */}
      <div className="flex-1 overflow-y-auto px-6 pt-safe-bar pb-safe flex items-center justify-center scroll-smooth">
        <div className="w-full max-w-sm flex flex-col items-center space-y-8">
          {/* Logo + heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="flex flex-col items-center space-y-4"
          >
            <Logo size="w-32" />
            <h1 className="text-3xl font-bold text-text tracking-tight">FPL Pulse</h1>
            <p className="text-subtext text-sm max-w-xs text-center">
              The data-driven breakdown of your Fantasy Premier League performance.
            </p>
          </motion.div>

          {/* Team ID input + submit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="w-full max-w-sm flex gap-2"
          >
            <input
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="Enter your FPL Team ID"
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-white text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSubmit}
              className="px-5 py-3 bg-primary/90 text-white rounded-xl font-semibold hover:opacity-90 transition"
            >
              Submit
            </button>
          </motion.div>

          {/* Help Text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <p className="text-sm text-subtext text-center">
              Don’t have an ID? Enter <span className="underline decoration-primary text-primary">34298</span>.
            </p>
          </motion.div>

          {/* Help link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-sm text-subtext space-y-1 text-center"
          >
            <p>Need help finding your Team ID?</p>
            <a
              href="https://fantasy.premierleague.com/"
              className="underline text-primary"
            >
              Go to FPL site →
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}