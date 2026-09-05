/* =============================================================================
   SLOP RADAR — DAILY DECK
   =============================================================================
   Every player pulls the full "cards" pool from the same Supabase table used
   by the previous build (id, url, is_ai, title, reason, verified_year), then
   deterministically shuffles it using today's UTC date as a seed, so every
   visitor gets the same 10-card deck on the same calendar day. No separate
   "daily assignment" table, no cron job — add rows to the pool any time via
   the Supabase dashboard.

   There is intentionally no hardcoded fallback deck. If Supabase is
   unreachable, or the pool has fewer than 4 rows, fetchDailyDeck() returns
   null and the caller shows an "updating" state instead of stale content.
============================================================================= */

const LAUNCH_DATE = Date.UTC(2025, 0, 1);
const DECK_SIZE = 10;
const MAX_SAME_TYPE_RUN = 3;

export function getDayNumber(now = new Date()) {
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((todayUTC - LAUNCH_DATE) / 86400000) + 1);
}

export function todayISO(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// mulberry32, seeded from a string — small, dependency-free, and stable
// across browsers/runs so "today's seed" always produces the same sequence.
function createRng(seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (Math.imul(seed, 31) + seedStr.charCodeAt(i)) | 0;
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, rand) {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function longestSameTypeRun(cards) {
  if (!cards.length) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < cards.length; i++) {
    current = cards[i].isAI === cards[i - 1].isAI ? current + 1 : 1;
    best = Math.max(best, current);
  }
  return best;
}

// A plain shuffle can clump 4+ real (or AI) cards back to back, which reads
// as "broken" to a human even though it's statistically normal. Re-roll the
// order a bounded number of times — deterministically, so it's still the
// same result for everyone that day — and keep whichever attempt breaks up
// the streak, without searching exhaustively for a perfect order.
function untangleRuns(cards, seedStr, maxRun = MAX_SAME_TYPE_RUN, attempts = 6) {
  const rand = createRng(seedStr);
  let best = cards;
  let bestRun = longestSameTypeRun(cards);
  for (let i = 0; i < attempts && bestRun > maxRun; i++) {
    const candidate = shuffle(cards, rand);
    const run = longestSameTypeRun(candidate);
    if (run < bestRun) {
      best = candidate;
      bestRun = run;
    }
  }
  return best;
}

function toCard(row) {
  return {
    id: row.id,
    url: row.url,
    isAI: row.is_ai,
    title: row.title,
    reason: row.reason,
    verifiedYear: row.verified_year ?? undefined,
  };
}

export async function fetchDailyDeck(supabase) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from("cards").select("*");
    if (error || !data || data.length < 4) return null;

    const dateSeed = todayISO();
    const drawn = shuffle(data, createRng(dateSeed)).slice(0, DECK_SIZE);
    const ordered = untangleRuns(drawn, `${dateSeed}:order`);
    return ordered.map(toCard);
  } catch {
    return null;
  }
}
