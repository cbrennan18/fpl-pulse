// iconKey → Phosphor component. Single source of truth so the adapter can
// emit string keys (keeping highlight data serialisable and test-friendly).
import {
  LightningIcon,
  CouchIcon,
  ShieldWarningIcon,
  CoinsIcon,
  SparkleIcon,
  TimerIcon,
  CrownIcon,
  TrophyIcon,
  TrendUpIcon,
  CalendarIcon,
  CardsIcon,
  SneakerIcon,
  StarIcon,
  EqualizerIcon,
  SealCheckIcon,
  ChartLineUpIcon,
} from '@phosphor-icons/react';

const REGISTRY = {
  lightning: LightningIcon,
  couch: CouchIcon,
  shieldWarning: ShieldWarningIcon,
  coins: CoinsIcon,
  sparkle: SparkleIcon,
  timer: TimerIcon,
  crown: CrownIcon,
  trophy: TrophyIcon,
  trendUp: TrendUpIcon,
  calendar: CalendarIcon,
  cards: CardsIcon,
  sneaker: SneakerIcon,
  star: StarIcon,
  equalizer: EqualizerIcon,
  sealCheck: SealCheckIcon,
  chartLineUp: ChartLineUpIcon,
};

export function getIcon(iconKey) {
  const icon = REGISTRY[iconKey];
  if (!icon) {
    if (import.meta.env.DEV) {
      console.warn(`[iconRegistry] no icon for key "${iconKey}", falling back to crown`);
    }
    return CrownIcon;
  }
  return icon;
}
