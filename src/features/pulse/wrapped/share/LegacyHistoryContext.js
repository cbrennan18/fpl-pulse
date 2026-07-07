// features/pulse/wrapped/share/LegacyHistoryContext.js
//
// The ONE deliberate exception to the "cards recompute from the pack" pattern.
// Beat 11 (CodaBeat) is the only beat that FETCHES (every member's past-season
// history isn't in the entries-pack). Rather than re-fetch for the share card,
// CodaBeat WRITES its fetched `historyByMember` here and the B11 card READS it.
//
// The card guards on an empty holder (share pressed before/without the fetch) or a
// null legacy → the same "come back next year" soft-fail frame, never a crash.

import { createContext, useContext } from 'react';

export const LegacyHistoryContext = createContext({
  historyByMember: null,
  setHistoryByMember: () => {},
});

export function useLegacyHistory() {
  return useContext(LegacyHistoryContext);
}
