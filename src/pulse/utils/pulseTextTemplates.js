// /src/pulse/utils/pulseTextTemplates.js
// narrative text templates per page

export const pulseTextTemplates = {

  // === Page 1: Season Intro ===
  page1_intro: ({ totalPoints, finalRank, teamName }) => {
    let finishNarrative = '';

    if (finalRank <= 10000) {
      finishNarrative = 'A title-winning season for the ages. You’ll be telling people about this one.';
    } else if (finalRank <= 50000) {
      finishNarrative = 'Champions League football secured — no creative PSR accounting needed next season.';
    } else if (finalRank <= 100000) {
      finishNarrative = 'So close… Europa League next season, but you’ll be thinking about what might have been.';
    } else if (finalRank <= 250000) {
      finishNarrative = 'Thursday Night Conference League — it counts, but only just.';
    } else if (finalRank <= 500000) {
      finishNarrative = 'Top half of the table — safely clear of drama, but nobody’s writing books about it.';
    } else if (finalRank <= 1000000) {
      finishNarrative = 'Mid table — no Europe, no relegation… just a bit "meh".';
    } else if (finalRank <= 3000000) {
      finishNarrative = 'The great escape… or was it more of a stumble across the line?';
    } else if (finalRank <= 6000000) {
      finishNarrative = 'Relegated. The board has issued a dreaded vote of confidence.';
    } else {
      finishNarrative = 'Be honest, was this an abandoned squad, or a masterclass in patience?';
    }

    return `${finishNarrative}`;
  },

  // === Page 2: Rank Journey ===
  page2_rankJourney: ({ entryHistory }) => {
    if (!entryHistory?.current?.length) return "";

    const ranks = entryHistory.current.map(gw => gw.overall_rank);
    const gws = entryHistory.current.length;
    const finalRank = ranks[ranks.length - 1];
    const peakRank = Math.min(...ranks);
    const worstRank = Math.max(...ranks);

    // Simple derived stats
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    const variance = ranks.reduce((sum, r) => Math.pow(r - mean, 2), 0) / ranks.length;
    const last8 = ranks.slice(-8);
    const last8Delta = last8[0] - last8[last8.length - 1];

    // Profile list — ORDERED
    const profileList = [
      {
        name: "Southampton",
        condition: () => finalRank > 6_000_000,
        narrative: "Southampton. You gave up. They gave up. Nobody even noticed. Mutual self-destruction at its bleakest."
      },
      {
        name: "Ipswich",
        condition: () => finalRank > 3_000_000,
        narrative: "Ipswich. Started like a fairytale, ended like a Netflix cancellation. The survival arc was over by Episode 2."
      },
      {
        name: "Spurs",
        condition: () => peakRank < 500_000 && finalRank > 2_000_000,
        narrative: "Spurs. Great start. Great collapse. 'Its just who we are mate'. At least there’s a trophy... somewhere."
      },
      {
        name: "Man Utd",
        condition: () => finalRank > 1_000_000 && last8Delta < 0,
        narrative: "Man Utd. 38 games of hatewatching and ‘surely it can’t get worse’. Until it did."
      },
      {
        name: "Newcastle",
        condition: () => variance > 2_000_000 ** 2,
        narrative: "Newcastle. Chaos merchants. Points everywhere, clean sheets nowhere. Entertaining? Absolutely. Reliable? Never."
      },
      {
        name: "Forest",
        condition: () => peakRank < 250_000 && last8Delta < -200_000,
        narrative: "Forest. Sprinkled early-season stardust, then vanished when the curtain rose. Final act? Disappearing trick."
      },
      {
        name: "Chelsea",
        condition: () => peakRank > 500_000 && finalRank < 500_000,
        narrative: "Chelsea. Opened like a drama, ended like a heist. Rallied late, while flogging hotels to fund another transfer window."
      },
      {
        name: "Liverpool",
        condition: () => finalRank <= 10_000,
        narrative: "Liverpool. Laser-focused. No gimmicks. Just blood, thunder, and a locked-in top 10k finish."
      },
      {
        name: "Arsenal",
        condition: () => finalRank <= 50_000 && peakRank <= 50_000,
        narrative: "Arsenal. So nearly... again. Next year. Definitely.  If hope was a trophy, you'd be invincibles."
      },
      {
        name: "Man City",
        condition: () => finalRank <= 50_000 && peakRank < 10_000,
        narrative: "Man City. Glimpses of god-mode, then a mysterious autopilot. Still elite, just... less terrifying."
      },
      {
        name: "Brighton",
        condition: () => finalRank <= 500_000,
        narrative: "Brighton. Tactical, tidy, no drama. A thinking person's fantasy team. Top half, no fuss."
      },
      {
        name: "Brentford",
        condition: () => true, // fallback
        narrative: "Brentford. Always there. Never loud. Your fantasy equivalent of beans on toast — solid, unspectacular, dependable."
      },
    ];

    // Matching logic — first match wins
    for (const profile of profileList) {
      if (profile.condition()) {
        return `${profile.narrative}`;
      }
    }

    // fallback (should never hit)
    return "";
  },

  // === Page 3: Captaincy & MVP ===
  page3_captaincyMVP: ({ top5Earned, top5Missed }) => {
  return {
    titleMVP: "Star Players",
    titleMissed: "The Ones That Got Away",
    subtitleMVP: "Who did you build around this season?",
    subtitleMissed: "Which players did you refuse to bring in?",
    mvpPlayers: top5Earned.map(p => ({ player: p.player, points: p.points })),
    missedPlayers: top5Missed.map(p => ({ player: p.player, points: p.points, gws: p.gwsMissed })),
    };
  },


  // === Page 4: Transfer Timing ===
  page4_transfers: ({ profile }) => {
    if (!profile) return "We couldn’t get a read on your transfer style this season.";

    if (profile === "Michael Edwards") {
      return "You moved earlier than most — sharp, decisive. Michael Edwards has you on the shortlist.";
    } else if (profile === "Tony Bloom") {
      return "Smart, patient, value-led — a true Tony Bloom operator. Brighton would approve.";
    } else {
      return "Your late moves each week had Daniel Levy wondering if it’s time to bring ‘Arry back for deadline day.";
    }
  },

  // === Page 5: Transfer Hits and Misses ===
  page5_transfersHitsMisses: ({ top5Stints, bestPointsDiffStint, bestPpwDiffStint }) => {
    const introLine = "Some inspired moves… and a few you'd probably rather forget.";

    const inspiredLine = "Here are the transfers that truly paid off:"; //ToDo

    const regretLine = bestPointsDiffStint
      ? `If only the FPL gods had whispered in your ear — picking ${bestPointsDiffStint.bestAlt.playerName} instead of ${bestPointsDiffStint.playerName} from GW${bestPointsDiffStint.gwIn} to GW${bestPointsDiffStint.gwOut} would've netted you an extra ${bestPointsDiffStint.bestAlt.pointsDiff} points.`
      : "";

      const ppwDiffRaw = Math.abs(bestPpwDiffStint.bestAlt.ppwDiff);
      const ppwDiffFormatted = ppwDiffRaw % 1 === 0
        ? ppwDiffRaw.toFixed(0)
        : ppwDiffRaw.toFixed(1);

    const puntRegretLine = bestPpwDiffStint
    ? `We all love a punt... but that swing in GW${bestPpwDiffStint.gwIn} for ${bestPpwDiffStint.playerName}? Look away now... ${bestPpwDiffStint.bestAlt.playerName} hauled ${ppwDiffFormatted} more points per week. Oof.`
    : "";

    return {
      introLine,
      inspiredLine,
      regretLine,
      puntRegretLine
    };
  },

  // === Page 6: Hot and Cold Streaks ===
  page6_streaks: ({ longestGreenStreak, longestRedStreak }) => {
    const introLine = "A season of streaks — here’s when you caught fire, and when the wheels came off.";

    const gwToMonth = gw => {
      if (gw >= 1 && gw <= 4) return "August";
      if (gw >= 5 && gw <= 8) return "September";
      if (gw >= 9 && gw <= 12) return "October";
      if (gw >= 13 && gw <= 16) return "November";
      if (gw >= 17 && gw <= 20) return "December";
      if (gw >= 21 && gw <= 24) return "January";
      if (gw >= 25 && gw <= 28) return "February";
      if (gw >= 29 && gw <= 32) return "March";
      if (gw >= 33 && gw <= 36) return "April";
      if (gw >= 37) return "May";
      return "";
    };

    const hotStreakLine = longestGreenStreak ? (() => {
      const { startGW, endGW, length } = longestGreenStreak;
      const monthStart = gwToMonth(startGW);
      const monthEnd = gwToMonth(endGW);

      const monthPhrase = (monthStart === monthEnd)
        ? `in ${monthStart}`
        : `between ${monthStart} and ${monthEnd}`;

      if (length <= 2) {
        return `Blink and you missed it — ${length} green arrows ${monthPhrase} was as good as it got.`;
      } else if (length <= 5) {
        return `Your team hit top gear ${monthPhrase}, stacking ${length} green arrows on the bounce.`;
      } else {
        return `Blistering form ${monthPhrase}, with ${length} consecutive weeks of green arrows.`;
      }
    })() : "";

    const coldStreakLine = longestRedStreak ? (() => {
      const { startGW, endGW, length } = longestRedStreak;
      const monthStart = gwToMonth(startGW);
      const monthEnd = gwToMonth(endGW);

      const monthPhrase = (monthStart === monthEnd)
        ? `in ${monthStart}`
        : `between ${monthStart} and ${monthEnd}`;

      if (length <= 3) {
        return `Bit of a Sunday League wobble ${monthPhrase} — ${length} red arrows, but no lasting damage.`;
      } else if (length <= 6) {
        return `Rumours of the sack were swirling ${monthPhrase} — ${length} straight red arrows didn’t help.`;
      } else {
        return `Freefall ${monthPhrase}: ${length} straight red arrows – Erik ten Hag was sacked for less. Ouch.`;
      }
    })() : "";

    return {
      introLine,
      hotStreakLine,
      coldStreakLine
    };
  },

  // === Page 7: Player Loyalty ===
  page7_playerLoyalty: ({ mostWeeksOwned, mostWeeksBenched, mostTransferredIn }) => {
    const introLine = "Behind every FPL manager is a cast of regulars, benchwarmers, and serial comebacks — here’s yours.";

    const loyaltyLine = mostWeeksOwned
      ? `You worshipped at the FPL throne of ${mostWeeksOwned.playerName} — they spent ${mostWeeksOwned.weeksOwned} weeks in your squad.`
      : "";

    const benchLine = mostWeeksBenched
      ? `${mostWeeksBenched.playerName} warmed your bench for ${mostWeeksBenched.weeksBenched} weeks this season — now that’s loyalty.`
      : "";

   const transfersLine = mostTransferredIn
      ? (() => {
          const { playerName, timesTransferredIn, totalPointsAfterIn, weeksPlayedAfterIn, avgPointsPerWeek } = mostTransferredIn;

          if (avgPointsPerWeek >= 5) {
            return `You rode the hot hand with ${playerName} — ${timesTransferredIn} transfers, ${totalPointsAfterIn} points (${avgPointsPerWeek} pts/week).`;
          } else if (avgPointsPerWeek >= 2.5) {
            return `Steady if unspectacular — ${playerName} earned ${totalPointsAfterIn} points (${avgPointsPerWeek} pts/week) across ${timesTransferredIn} transfers in.`;
          } else {
            return `“Fool me once…” — ${playerName} found their way into your squad ${timesTransferredIn} times, stumbling to just ${totalPointsAfterIn} points (${avgPointsPerWeek} pts/week).`;
          }
        })()
      : "";
    
    const deadTeamLine = (!mostTransferredIn && entryTransfers?.length === 0)
      ? `A true set-and-forget manager — not a single transfer all season!`
      : "";

    return {
      introLine,
      loyaltyLine,
      benchLine,
      transfersLine,
      deadTeamLine,
    };
  },

  // === Page 8: Bench and Chip Fails ===
  page8_benchAndChipFails: ({ tcSummary, bbSummary }) => {
    const introLine = "Did you target the doubles (with a little help from Ben Crellin), or swing for the fences? Here’s how your chips played out.";

    // === TRIPLE CAPTAIN
    const tcLine = tcSummary.tcUsed
      ? (() => {
          const { tcWeek, tcPoints, betterWeeksThanPlayed, bestPossibleWeek, bestPossiblePoints } = tcSummary;

          if (betterWeeksThanPlayed === 0) {
            return `Nailed it — your triple captain in GW${tcWeek} returned ${tcPoints} points, and there wasn’t a better week all season.`;
          } else if (betterWeeksThanPlayed <= 2) {
            return `Right idea, wrong week — GW${tcWeek} triple captain for ${tcPoints} pts, but ${betterWeeksThanPlayed} other weeks had more upside (best: ${bestPossiblePoints} pts in GW${bestPossibleWeek}).`;
          } else if (betterWeeksThanPlayed <= 5) {
            return `Not good, but not bad either — you played triple captain in GW${tcWeek} for ${tcPoints} points, though ${betterWeeksThanPlayed} better weeks slipped by (best: ${bestPossiblePoints} pts in GW${bestPossibleWeek}).`;
          } else {
            return `You’ll want this chip back — ${betterWeeksThanPlayed} weeks would’ve outdone your GW${tcWeek} triple captain (${tcPoints} pts). Best chance? ${bestPossiblePoints} pts in GW${bestPossibleWeek}.`;
          }
        })()
      : `You never used your triple captain — here are the points you missed out on: ${bestPossiblePoints} pts in GW${bestPossibleWeek}).`;

    const tcSubtitle = tcSummary.tcUsed
      ? `Triple Captain — GW${tcSummary.tcWeek} — ${tcSummary.tcPoints} pts`
      : `Triple Captain — not used`;

    // === BENCH BOOST
    const bbLine = bbSummary.bbUsed
      ? (() => {
          const { bbWeek, bbPoints, betterWeeksThanPlayed, bestPossibleWeek, bestPossiblePoints } = bbSummary;

          if (betterWeeksThanPlayed === 0) {
            return `Great call — your bench boost in GW${bbWeek} delivered ${bbPoints} points, couldn’t have played it any better.`;
          } else if (betterWeeksThanPlayed <= 2) {
            return `Close, but not quite — GW${bbWeek} bench boost scored ${bbPoints} pts, but ${betterWeeksThanPlayed} other weeks had bigger benches (best: ${bestPossiblePoints} pts in GW${bestPossibleWeek}).`;
          } else if (betterWeeksThanPlayed <= 5) {
            return `An average shout — bench boost in GW${bbWeek} scored ${bbPoints} pts, though ${betterWeeksThanPlayed} stronger bench weeks slipped through (best: ${bestPossiblePoints} pts in GW${bestPossibleWeek}).`;
          } else {
            return `You’ll want this chip back — ${betterWeeksThanPlayed} weeks would’ve outscored your GW${bbWeek} bench boost (${bbPoints} pts). Best bench? ${bestPossiblePoints} pts in GW${bestPossibleWeek}.`;
          }
        })()
      : `You never used your bench boost — here’s what you missed: ${bestPossiblePoints} pts in GW${bestPossibleWeek}.`;
    
    const bbSubtitle = bbSummary.bbUsed
      ? `Bench Boost — GW${bbSummary.bbWeek} — ${bbSummary.bbPoints} pts`
      : `Bench Boost — not used`;

    return {
      introLine,
      tcLine,
      tcSubtitle,
      bbLine,
      bbSubtitle
    };
  },

  // === Page 9: Outro ===
  page9_outro: ({ talisman, unsungHero, benchFlop }) => {
    const introLine = "Here’s the XI that carried your season — your FPL Pulse Team of the Year.";

    const talismanLine = talisman
      ? `${talisman.playerName} led the charge — ${talisman.totalPoints} points over ${talisman.weeksOwned} weeks (${talisman.avgPointsPerWeek} pts/week).`
      : "";

    const unsungHeroLine = unsungHero
      ? `${unsungHero.playerName} proved a brilliant pick — ${unsungHero.totalPoints} points with an impressive ${unsungHero.avgPointsPerWeek} pts/week.`
      : "";

    const benchFlopLine = benchFlop
      ? `One to forget — ${benchFlop.playerName} limped to ${benchFlop.totalPoints} points despite ${benchFlop.weeksOwned} appearances.`
      : "";

    return {
      introLine,
      talismanLine,
      unsungHeroLine,
      benchFlopLine
    };
  },

  // === Page 10: CTA ===
  page10_CTA: () => {
    return {
      introLine: "Thanks for playing. Here’s to another year of chaos and glory.",
    };
  },
};