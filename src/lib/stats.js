/* =============================================================================
   SLOP RADAR — LOCAL STATS
   =============================================================================
   Lifetime stats and "seen the intro" state live in localStorage only — no
   accounts, nothing sent to Supabase. Keys are unchanged from the previous
   build so returning players keep their history through this redesign.
============================================================================= */

const LIFETIME_KEY = "slop-radar-lifetime-stats";
const INTRO_KEY = "slop-radar-seen-intro";

export const DEFAULT_LIFETIME = {
  gamesPlayed: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestStreak: 0,
  bestAccuracy: 0,
  realCorrect: 0,
  realTotal: 0,
  aiCorrect: 0,
  aiTotal: 0,
};

export function loadLifetime() {
  try {
    const raw = localStorage.getItem(LIFETIME_KEY);
    return raw ? { ...DEFAULT_LIFETIME, ...JSON.parse(raw) } : DEFAULT_LIFETIME;
  } catch {
    return DEFAULT_LIFETIME; // storage unavailable (e.g. private browsing)
  }
}

function saveLifetime(next) {
  try {
    localStorage.setItem(LIFETIME_KEY, JSON.stringify(next));
  } catch {
    // storage unavailable — stats just won't persist this session
  }
  return next;
}

export function recordCompletedGame(prev, { score, accuracy, history }) {
  const realAnswers = history.filter((h) => !h.item.isAI);
  const aiAnswers = history.filter((h) => h.item.isAI);
  const next = {
    gamesPlayed: prev.gamesPlayed + 1,
    totalCorrect: prev.totalCorrect + score.correct,
    totalAnswered: prev.totalAnswered + score.total,
    bestStreak: Math.max(prev.bestStreak, score.bestStreak),
    bestAccuracy: Math.max(prev.bestAccuracy, accuracy),
    realCorrect: prev.realCorrect + realAnswers.filter((h) => h.correct).length,
    realTotal: prev.realTotal + realAnswers.length,
    aiCorrect: prev.aiCorrect + aiAnswers.filter((h) => h.correct).length,
    aiTotal: prev.aiTotal + aiAnswers.length,
  };
  return saveLifetime(next);
}

export function getTier(accuracy, total) {
  if (total === 0) return { title: "No Signal Yet", blurb: "Run today's scan to calibrate." };
  if (accuracy >= 90) return { title: "Sharp Signal", blurb: "Nothing gets past this radar." };
  if (accuracy >= 75) return { title: "Locked On", blurb: "Mostly reading the field correctly." };
  if (accuracy >= 55) return { title: "Tracking", blurb: "Picking up the pattern." };
  if (accuracy >= 35) return { title: "Weak Signal", blurb: "Tough batch to classify today." };
  return { title: "Static", blurb: "Everyone starts here." };
}

export function hasSeenIntro() {
  try {
    return !!localStorage.getItem(INTRO_KEY);
  } catch {
    return false;
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    // ignore — help sheet will just show every visit instead of once
  }
}
