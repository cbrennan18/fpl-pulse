// scripts/build-ae64-field.mjs
//
// ONE-TIME precompute for Beat 9 Tab 2 — the AE64 benchmark field.
//
// Scores every AE64 member (league 1373455) through the SAME per-member spine as
// Tab 1 (scoreMemberSeason from luckVsSkill.js — value-swap, hits-out-of-both-
// ledgers, xP-miss→neutral-fill) and freezes a tiny static artifact the frontend
// reads. NOT the Python pipeline; NO reimplementation — it imports Tab 1's scorer.
//
// Run through Vite so the bare JSON import in luckVsSkill.js (xp-by-gw-v1.json) and
// all src/ modules resolve byte-identically to production:
//     npx vite-node scripts/build-ae64-field.mjs
//
// DATA ACCESS (the 50-member wrinkle): /v1/league/:id/{members,entries-pack} 403
// above MAX_LEAGUE_SIZE=50, and AE64 has 63 members — so we can't get the id list
// or the pack that way. Instead: the id list comes from FPL's own classic-standings
// endpoint (paginated, ungated), and each COMPLETE, cached blob comes from the
// worker's /v1/entry/:id (no league-size gate on that route).
//
// GATES (artifact is NOT written unless both pass):
//   1. Reconciliation — every member's reconstructed gross rP must equal official
//      gw_summaries[gw].points (the AE64 analogue of Tab 1's 570/570). Any mismatch
//      means the spine reuse broke.
//   2. Full-season presence — a partial member (mid-season join / gaps) has a smaller
//      season total through tenure, not quality, which would distort the ranking.
//      Flagged and halted for a human decision rather than silently frozen.

import { writeFileSync } from 'node:fs';
import { scoreMemberSeason, ATTRIBUTION } from '../src/features/pulse/wrapped/calc/luckVsSkill.js';
import { buildGwPointsIndex } from '../src/features/pulse/wrapped/calc/setAndForget.js';

const LEAGUE = 1373455;
const BASE = process.env.VITE_API_BASE || 'https://fpl-pulse.ciaranbrennan18.workers.dev';
const OUT = new URL('../src/features/pulse/utils/ae64-field-v1.json', import.meta.url);

const r2 = (n) => Math.round(n * 100) / 100;
const seasonLabel = (y) => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;

async function getJson(url, opts) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, opts);
      if (res.status === 202) throw new Error(`${url} → 202 (still building; blobs must be complete before precompute)`);
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (String(err.message).includes('202')) throw err;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw new Error(`${url} → ${lastErr?.message || 'fetch failed'}`);
}

// Resolve `fn` over `items` with bounded concurrency (avoid firing 60+ sockets at once).
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// FPL classic standings, paginated (50/page), followed via has_next. n is DERIVED.
async function fetchAe64Ids() {
  const ids = [];
  let page = 1;
  for (;;) {
    const data = await getJson(
      `https://fantasy.premierleague.com/api/leagues-classic/${LEAGUE}/standings/?page_standings=${page}`,
      { headers: { 'User-Agent': 'fpl-pulse-precompute' } }
    );
    for (const row of data?.standings?.results ?? []) ids.push(row.entry);
    if (!data?.standings?.has_next) break;
    page += 1;
  }
  return ids;
}

async function main() {
  console.log(`[ae64] league ${LEAGUE} — fetching id list from FPL standings…`);
  const ids = await fetchAe64Ids();
  const n = ids.length;
  console.log(`[ae64] n = ${n} members`);

  console.log(`[ae64] fetching ${n} entry blobs from ${BASE}/v1/entry/… + bootstrap + seasonElements`);
  const [bootstrap, seasonElements] = await Promise.all([
    getJson(`${BASE}/fpl/bootstrap`),
    getJson(`${BASE}/v1/season/elements`),
  ]);
  const blobs = await mapLimit(ids, 8, (id) => getJson(`${BASE}/v1/entry/${id}`));

  // Shape inputs exactly as usePack.js does, so scoring is byte-identical to Tab 1.
  const playerById = new Map(bootstrap.elements.map((el) => [el.id, el]));
  const positionOf = (id) => playerById.get(id)?.element_type ?? 0;
  const finishedGwIds = (bootstrap.events || []).filter((e) => e.finished).map((e) => e.id);
  const gwIndex = buildGwPointsIndex(seasonElements, finishedGwIds);
  const season = seasonLabel(Number(blobs[0]?.season));
  console.log(`[ae64] season ${season}, ${finishedGwIds.length} finished GWs`);

  // Score every member through the SHARED spine.
  const scored = ids.map((id, i) => ({ id, s: scoreMemberSeason(blobs[i], { finishedGwIds, gwIndex, positionOf }) }));

  // GATE 1 — reconciliation (AE64 analogue of 570/570).
  let reconChecked = 0;
  const mismatches = [];
  for (const { id, s } of scored) {
    reconChecked += s.reconChecked;
    for (const m of s.reconMismatches) mismatches.push({ entryId: id, ...m });
  }
  console.log(`[ae64] reconciliation: ${reconChecked - mismatches.length}/${reconChecked} member-GWs, ${mismatches.length} mismatches`);
  if (mismatches.length > 0) {
    console.error('[ae64] RECON FAILED — spine reuse broke. NOT writing artifact. First mismatches:');
    for (const m of mismatches.slice(0, 20)) {
      console.error(`  entry ${m.entryId} gw ${m.gw}: grossRp ${m.grossRp} vs official ${m.official} (diff ${m.diff}, chip ${m.activeChip})`);
    }
    process.exit(1);
  }

  // GATE 2 — full-season presence audit.
  const full = finishedGwIds.length;
  const partials = scored
    .map(({ id, s }) => ({ id, present: s.rpByGw.size }))
    .filter((p) => p.present < full);
  console.log(`[ae64] presence: ${n - partials.length}/${n} members present all ${full} finished GWs`);
  if (partials.length > 0) {
    console.error('[ae64] PARTIAL members found (tenure < full season) — NOT freezing. Decide (exclude / normalise):');
    for (const p of partials) console.error(`  entry ${p.id}: present ${p.present}/${full} GWs`);
    process.exit(2);
  }

  // Field per GW = mean over members present that GW (matches computeLuckVsSkill's
  // field construction), plus the present COUNT so Tab 2 knows the denominator.
  const field_xP = {};
  const field_rP = {};
  const present_count = {};
  for (const gw of finishedGwIds) {
    let sx = 0;
    let sr = 0;
    let cnt = 0;
    for (const { s } of scored) {
      if (s.rpByGw.has(gw)) {
        sr += s.rpByGw.get(gw);
        sx += s.xpByGw.get(gw);
        cnt += 1;
      }
    }
    if (cnt > 0) {
      field_xP[gw] = r2(sx / cnt);
      field_rP[gw] = r2(sr / cnt);
      present_count[gw] = cnt;
    }
  }

  // Anonymised season totals — strip names AND entry ids; sort by rp so row order
  // carries no linkage back to the standings id list. An aggregate distribution.
  const sumMap = (m) => { let t = 0; for (const v of m.values()) t += v; return t; };
  const members = scored
    .map(({ s }) => ({ xp: r2(sumMap(s.xpByGw)), rp: r2(sumMap(s.rpByGw)) }))
    .sort((a, b) => b.rp - a.rp);

  const artifact = {
    meta: {
      league: LEAGUE,
      n,
      season,
      attribution: `${ATTRIBUTION} AE64 benchmark field (league ${LEAGUE}, n=${n}); retrospective.`,
    },
    field_xP,
    field_rP,
    present_count,
    members,
  };

  writeFileSync(OUT, JSON.stringify(artifact, null, 2) + '\n');
  console.log(`[ae64] FROZE ${OUT.pathname} — n=${n}, ${finishedGwIds.length} GWs, ${members.length} member totals`);
}

main().catch((err) => {
  console.error('[ae64] FAILED:', err.message);
  process.exit(1);
});
