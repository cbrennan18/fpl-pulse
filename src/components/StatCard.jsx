import {
  MedalIcon,
  TrophyIcon,
  NumberCircleOneIcon,
  FlameIcon,
  EqualsIcon,
  ShieldCheckIcon,
  LightningIcon,
  SpadeIcon,
  ClockIcon,
  SoccerBallIcon,
  CoinsIcon,
  ShieldWarningIcon,
  QuestionIcon,
  CouchIcon,
  WatchIcon,
  AlarmIcon,
  CardsIcon,
  BugBeetleIcon,
} from '@phosphor-icons/react';

const styled = (Icon) => (
  <Icon size={32} weight="duotone" className="text-current" />
);

const iconMap = {
  leagueLeaders: [styled(TrophyIcon)],
  oneHitWonders: [styled(NumberCircleOneIcon)],
  hotStreak: [styled(FlameIcon)],
  mostConsistent: [styled(EqualsIcon)],
  bestWildcard: [styled(ShieldCheckIcon)],
  bestFreeHit: [styled(LightningIcon)],
  bestPunt: [styled(SpadeIcon)],
  mostMinutes: [styled(ClockIcon)],
  mostBps: [styled(SoccerBallIcon)],
  mostHits: [styled(CoinsIcon)],
  worstWildcard: [styled(ShieldWarningIcon)],
  worstFreeHit: [styled(ShieldWarningIcon)],
  neverGetFancy: [styled(QuestionIcon)],
  benchDisaster: [styled(CouchIcon)],
  earlyBird: [styled(WatchIcon)],
  lateOwl: [styled(AlarmIcon)],
  mostCards: [styled(CardsIcon)],
  placeholder: [styled(BugBeetleIcon)],
};

export default function StatCard({ title, description, entries = [], variant = 'fame', category }) {
  const getMedalIcon = (i) => {
    const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    return (
      <MedalIcon
        size={16}
        weight="duotone"
        color={colors[i]}
        className="inline-block mr-1 -mt-[2px]"
      />
    );
  };

  const accentColor = variant === 'fame' ? 'border-primary' : 'border-primary-dark';
  const iconColor = variant === 'fame' ? 'text-primary' : 'text-primary-dark';
  const bgColor = 'bg-white';
  const icons = iconMap[category] || [];

  return (
    <div className={`rounded-2xl shadow-md p-4 w-full border-l-4 ${accentColor} ${bgColor}`}>
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-text">{title}</h3>
          {description && (
            <p className="text-subtext text-xs mt-[-2px]">{description}</p>
          )}
        </div>
        <div className={`flex items-center gap-1 ${iconColor} text-opacity-80`}>
          {icons.map((Icon, idx) => (
            <div key={idx} className="flex items-center justify-center">{Icon}</div>
          ))}
        </div>
      </div>

      {entries.length > 0 ? (
        <div className="grid grid-cols-[1fr_auto] gap-y-2 gap-x-4 items-center">
          {entries.map((entry, i) => (
            <div key={`${entry.name}-${entry.score}`} className="col-span-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  {i < 3 && getMedalIcon(i)}
                  <span>{entry.name}</span>
                </div>
                <div className="text-right font-semibold">{entry.value}</div>
              </div>
              {entry.contextString && (
                <div className="text-xs opacity-80 italic">
                  {entry.contextString}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-subtext text-sm">Calculating...</p>
      )}
    </div>
  );
}