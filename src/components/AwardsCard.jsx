// src/components/AwardsCard.jsx
import StatCard from './StatCard';
import { getAwardContext } from '../utils/awardContext';

export default function AwardsCard({ awards }) {

  const topPerformerCards = [
    { title: "No Hitter ", description: "Top 3 managers by total points", key: "leagueLeaders" },
    { title: "One Week Wonder", description: "Highest single gameweek score", key: "oneHitWonders" },
    { title: "Hot Streak", description: "Longest run of rank gains week to week", key: "hotStreak" },
    { title: "Most Consistent", description: "Closest every week to the average", key: "mostConsistent" },
    { title: "Best Wildcard", description: "Highest score in a wildcard week", key: "bestWildcard" },
    { title: "Best Free Hit", description: "Top score using the Free Hit chip", key: "bestFreeHit" },
    { title: "Best Punt", description: "Biggest score from a <5% owned pick", key: "bestPunt" },
    { title: "Most Minutes", description: "Total minutes played by squad", key: "mostMinutes" },
    { title: "Most BPs", description: "Most bonus points accumulated", key: "mostBps" },
  ];

  const otherAwardCards = [
    { title: "Most Hits", description: "Total points spent on transfers", key: "mostHits" },
    { title: "Worst Wildcard", description: "Lowest score in a wildcard week", key: "worstWildcard" },
    { title: "Worst Free Hit", description: "Lowest score using the Free Hit chip", key: "worstFreeHit" },
    { title: "Never Get Fancy", description: "Points lost by not captaining Salah", key: "neverGetFancy" },
    { title: "Bench Disaster", description: "Most points left on the bench", key: "benchDisaster" },
    { title: "Early Bird", description: "Earliest average time transfers are made", key: "earlyBird" },
    { title: "Late Owl", description: "Latest average time transfers are made", key: "lateOwl" },
    { title: "Most Cards", description: "Most yellow/red cards across the season", key: "mostCards" },
    { title: "Placeholder", description: "TBD", key: "placeholder" },
  ];

  const renderAwardCards = (cards, variant) =>
    cards.map(({ title, description, key }) => {
      const entriesWithContext = (awards[key] || []).map(entry => ({
        ...entry,
        contextString: getAwardContext(key, entry.context),
      }));

      return (
        <div key={key} className="snap-start shrink-0 w-[calc(100vw-2rem)] max-w-[300px]">
          <StatCard
            title={title}
            description={description}
            entries={entriesWithContext}
            variant={variant}
            category={key}
          />
        </div>
      );
    });

  return (
    <div className="my-6">
      <div className="flex gap-3 overflow-x-auto no-scrollbar pr-4 snap-x snap-mandatory scroll-px-2 py-2">
        {renderAwardCards(topPerformerCards, 'fame')}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pr-4 snap-x snap-mandatory scroll-px-2 py-2">
        {renderAwardCards(otherAwardCards, 'trenches')}
      </div>
    </div>
  );
}