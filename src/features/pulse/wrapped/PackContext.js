// features/pulse/wrapped/PackContext.js
//
// React context carrying the once-fetched league pack + shared static datasets
// to every beat. Populated by usePack and provided by WrappedContainer once the
// data is ready. `you` marks the selected entry within the pack.

import { createContext, useContext } from 'react';

/**
 * @typedef {Object} WrappedValue
 * @property {number}  leagueId
 * @property {string}  leagueName
 * @property {number}  you                 selected entry_id ("you")
 * @property {number[]} members            entry IDs (<=50)
 * @property {Object}  entries             { [entryId]: SeasonBlob }
 * @property {Object}  meta                { count, capped, total_members }
 * @property {Object}  bootstrap           FPL bootstrap (elements, events)
 * @property {Object}  seasonElements      per-GW live player data
 * @property {Object}  youBlob             entries[you]
 * @property {number[]} finishedGwIds
 * @property {(id:number)=>Object} getMember
 * @property {(id:number)=>string} playerName
 * @property {(id:number)=>number} playerPosition  element_type (1 GK … 4 FWD)
 */

/** @type {import('react').Context<WrappedValue|null>} */
export const PackContext = createContext(null);

export function useWrapped() {
  const value = useContext(PackContext);
  if (!value) {
    throw new Error('useWrapped must be used within a PackContext.Provider (data not ready)');
  }
  return value;
}
