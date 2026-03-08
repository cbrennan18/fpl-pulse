import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PulseLogo from '../../assets/logo-mark.svg';
import { LightningIcon, TrophyIcon, HeartbeatIcon } from '@phosphor-icons/react';
import { fetchEntrySummary } from '../../utils/api';

export default function Landing() {
  const [teamId, setTeamId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const trimmed = teamId.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      setTeamId('');
      setError('Enter a valid Team ID');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const data = await fetchEntrySummary(trimmed);
      if (!data) {
        setTeamId('');
        setError('Team not found');
        return;
      }
      navigate(`/home?id=${trimmed}`);
    } catch {
      setTeamId('');
      setError('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="noise-overlay landing-gradient fixed inset-0 flex flex-col min-h-screen text-white overflow-y-auto">
      {/* Main content — vertically centered */}
      <div className="flex-1 flex items-center justify-center px-8 pt-safe-6 pb-12">
        <div className="w-full max-w-md flex flex-col items-center text-center">
          {/* Logo mark + Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8, ease: 'easeOut' }}
            className="relative"
          >
            {/* Soft glow behind wordmark */}
            <div
              className="absolute inset-0 -inset-x-16 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,232,122,0.13) 0%, transparent 50%)' }}
            />
            <img
              src={PulseLogo}
              alt="FPL Pulse"
              className="relative w-10 h-7 mx-auto mb-2"
            />
            <h1 className="relative font-display leading-[0.85] tracking-tight">
              <span className="block text-[104px] text-white">FPL</span>
              <span className="block text-[96px] text-[#00e87a]">PULSE</span>
            </h1>
            <p className="relative font-display text-[22px] text-white tracking-[0.08em] mt-3">
              YOUR SEASON, UNWRAPPED.
            </p>
          </motion.div>

          {/* Input + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="mt-8 w-full max-w-xs space-y-5"
          >
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={teamId}
              onChange={(e) => { setTeamId(e.target.value); setError(''); }}
              onKeyDown={handleKeyDown}
              placeholder={error || 'TEAM ID'}
              className={`w-full bg-transparent border-b border-[#00e87a] text-white font-mono text-base text-center px-1 py-3 focus:outline-none ${error ? 'placeholder:text-[#e5484d]' : 'placeholder:text-white/40'}`}
            />
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-[#00e87a] text-black font-display text-xl tracking-widest hover:brightness-110 transition disabled:opacity-50"
            >
              {submitting ? 'CHECKING...' : 'ANALYSE MY SEASON'}
            </button>
          </motion.div>

          {/* Teaser strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="mt-10 flex flex-col items-center"
          >
            <div className="flex items-center justify-center gap-6">
              <TeaserItem icon={<LightningIcon size={28} weight="light" className="text-white/55" />} label="FPL Wrapped" />
              <TeaserItem icon={<TrophyIcon size={28} weight="light" className="text-white/55" />} label="League Awards" />
              <TeaserItem icon={<HeartbeatIcon size={28} weight="light" className="text-white/55" />} label="Rank & Stats" />
            </div>
          </motion.div>

          {/* Footer links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.8 }}
            className="mt-6 w-full max-w-xs flex flex-col items-center space-y-2"
          >
            <hr className="border-0 h-px bg-white/[0.06] mb-4" />
            <button
              onClick={() => navigate('/home?id=51776')}
              className="block text-sm text-white/50 underline underline-offset-2 decoration-white/30 hover:text-white/70 transition"
            >
              Try demo: 51776
            </button>
            <button
              onClick={() => setShowHelp(true)}
              className="block text-sm text-white/30 hover:text-white/50 transition no-underline"
            >
              How to find your ID &rarr;
            </button>
          </motion.div>
        </div>
      </div>

      {/* Help bottom sheet */}
      <AnimatePresence>
        {showHelp && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 z-[60]"
              onClick={() => setShowHelp(false)}
            />
            {/* Sheet */}
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="How to find your Team ID"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.1}
              onDragEnd={(_, info) => { if (info.offset.y > 100) setShowHelp(false); }}
              className="fixed bottom-0 left-0 right-0 z-[70] bg-[#141414] rounded-t-2xl px-6 pt-3 pb-safe-10"
            >
              {/* Drag handle */}
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />
              <h2 className="font-display text-2xl text-white tracking-wide mb-5">
                FIND YOUR TEAM ID
              </h2>
              <ol className="space-y-4">
                <HelpStep n={1} text='Go to fantasy.premierleague.com and log in.' />
                <HelpStep n={2} text='Tap "My Team" — check the URL in your browser.' />
                <HelpStep n={3} text='Your Team ID is the number in the URL after /entry/.' />
              </ol>
              <p className="font-body text-xs text-white/30 mt-6">
                Example: fantasy.premierleague.com/entry/<span className="text-[#00e87a]">51776</span>/event/1
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function HelpStep({ n, text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="font-display text-lg text-[#00e87a] leading-none mt-0.5">{n}</span>
      <span className="font-body text-sm text-white/70 leading-relaxed">{text}</span>
    </li>
  );
}

function TeaserItem({ icon, label }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {icon}
      <span className="font-body font-normal text-[14px] text-white/55">{label}</span>
    </div>
  );
}
