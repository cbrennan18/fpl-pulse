// features/pulse/wrapped/share/beatCardRegistry.js
//
// Maps a beat `id` (from constants BEATS) → its share-card component. Parallel to
// BEAT_COMPONENTS in WrappedContainer. The hidden stage picks the card for the
// active beat; the Cover has its own card (rendered when no beat is active).

import B1SetForgetCard from './cards/B1SetForgetCard';
import B2CaptainCard from './cards/B2CaptainCard';
import B3TransferTimingCard from './cards/B3TransferTimingCard';
import B4MaverickCard from './cards/B4MaverickCard';
import B5FingerprintCard from './cards/B5FingerprintCard';
import B6GameweekKingsCard from './cards/B6GameweekKingsCard';
import B7ChipsCard from './cards/B7ChipsCard';
import B8BenchCard from './cards/B8BenchCard';
import B9LuckSkillCard from './cards/B9LuckSkillCard';
import B10RaceCard from './cards/B10RaceCard';
import B11LegacyCard from './cards/B11LegacyCard';

export const BEAT_CARDS = {
  'set-and-forget': B1SetForgetCard,
  'captain': B2CaptainCard,
  'transfer-timing': B3TransferTimingCard,
  'maverick': B4MaverickCard,
  'fingerprint': B5FingerprintCard,
  'gameweek-kings': B6GameweekKingsCard,
  'chips': B7ChipsCard,
  'the-bench': B8BenchCard,
  'luck-vs-skill': B9LuckSkillCard,
  'the-race': B10RaceCard,
  'coda': B11LegacyCard,
};
