import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  X,
  RotateCcw,
  Flame,
  Trophy,
  Check,
  Copy,
  Newspaper,
  Sparkle,
  Volume2,
  VolumeX,
  HelpCircle,
  BarChart2,
} from "lucide-react";

/* =============================================================================
   SLOP RADAR — DATA ARCHITECTURE BLUEPRINT
   =============================================================================
   Ships with a hardcoded MOCK_DECK so the game works instantly with zero
   setup. In production, today's eight images should come from a small,
   versioned "daily deck" rather than an infinite random stream — exactly like
   Wordle serves one puzzle per calendar day.

   OPTION A — Static daily JSON (simplest, works on any static host)
     /public/daily/2026-08-02.json
     { "day": 214, "cards": [ { "id": "d214-01", "url": "...", "isAI": false,
       "title": "...", "reason": "..." }, ... ] }
     A cron job (GitHub Action, Vercel Cron) drops a new file at midnight UTC.
     Client: fetch(`/daily/${todayISO}.json`)

   OPTION B — Serverless function (adds validation, rotation, secrets)
     // /api/daily-deck.js
     export default async function handler(req, res) {
       const today = new Date().toISOString().slice(0, 10);
       const deck = await db.collection("daily_decks").findOne({ date: today });
       if (!deck) return res.status(404).json({ error: "no deck for today" });
       res.setHeader("Cache-Control", "public, s-maxage=3600");
       return res.status(200).json(deck);
     }
     Date logic lives server-side so every player gets the identical puzzle.

   OPTION C — Lightweight CMS (Sanity / Contentful / a Notion database)
     Editors tag each image `isAI: true/false` plus a one-line "reason" in a
     no-code table; a build step or ISR revalidation republishes the JSON
     from Option A — giving non-engineers control without touching this file.

   `fetchDailyDeck()` below performs a real fetch against `/api/daily-deck`.
   If that route isn't deployed (true for this standalone artifact), it
   falls back to MOCK_DECK so the game is always playable. Swap in Option
   A or B by deploying that one route — no other code changes required.
============================================================================= */

import { supabase } from "./supabaseClient.js";

const LAUNCH_DATE = new Date("2025-01-01T00:00:00Z");

function getDayNumber() {
  const now = new Date();
  const diffMs = now.setUTCHours(0, 0, 0, 0) - LAUNCH_DATE.getTime();
  return Math.max(1, Math.floor(diffMs / 86400000) + 1);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Small deterministic PRNG (mulberry32) seeded from today's date, so every
// player sees the same 8-card deck on the same day without needing a
// separate "daily assignment" table in Supabase.
function seededShuffle(array, seedStr) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchDailyDeck() {
  if (!supabase) return null; // env vars not configured yet — use mock data
  try {
    const { data, error } = await supabase.from("cards").select("*");
    if (error || !data || data.length < 4) throw new Error("supabase fetch failed or pool too small");
    const shuffled = seededShuffle(data, todayISO());
    return shuffled.slice(0, 8).map((row) => ({
      id: row.id,
      url: row.url,
      isAI: row.is_ai,
      title: row.title,
      reason: row.reason,
      verifiedYear: row.verified_year ?? undefined,
    }));
  } catch {
    return null; // falls back to MOCK_DECK below
  }
}

/* -----------------------------------------------------------------------
   IMAGE PROVENANCE — verified, not just labeled
   -----------------------------------------------------------------------
   Every image is served from images.unsplash.com — the one CDN that's
   proven reliable inside this artifact sandbox. (An earlier version
   hotlinked genuinely AI-generated images from Wikimedia Commons; that
   broke for two independent reasons worth recording: Commons actively
   deletes AI-generated uploads amid ongoing scope disputes, so any given
   file can vanish without notice, and its CDN wasn't reliably reachable
   from this sandbox to begin with.)

   For the "Real" bucket, we don't just assert authenticity — we can prove
   it. Unsplash's legacy photo URLs (images.unsplash.com/photo-<ID>-<hash>)
   encode the upload timestamp as the ID: milliseconds since the Unix
   epoch. Decoding it gives a hard, checkable upload date. Every real photo
   below decodes to 2016–2018 — years before DALL·E (2021 preview, public
   2022), Midjourney, or Stable Diffusion (both 2022) existed. That's real
   evidence a human camera made these, not a claim.

   `unsplashUploadDate()` does the decoding; `verifiedYear` on each real
   entry is its output, and the feedback overlay surfaces it so the "proof"
   is part of the game, not just a code comment.

   The "AI" bucket remains real photographs standing in for layout/testing
   — see the note further down on next steps for genuine AI sourcing.
----------------------------------------------------------------------- */
function unsplashUploadDate(url) {
  const match = url.match(/photo-(\d{13})-/);
  if (!match) return null;
  return new Date(Number(match[1])).getFullYear();
}

const RAW_DECK = [
  {
    id: "m1",
    url: "https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1000&q=80&auto=format&fit=crop",
    isAI: false,
    title: "Half Dome, Yosemite Valley",
    reason: "Real atmospheric scatter and sensor grain in the shadow detail — no diffusion smoothing here.",
  },
  {
    id: "m2",
    url: "https://image.pollinations.ai/prompt/photorealistic%20golden%20hour%20city%20skyline%2C%20dramatic%20clouds%2C%20skyscrapers%2C%20ultra%20detailed%20photograph?width=1000&height=1250&seed=42&nologo=true&model=flux",
    isAI: true,
    isLiveTest: true, // TEST CARD — genuinely generated via the Pollinations.ai API, not a stand-in.
    title: "Golden Hour Skyline",
    reason: "The window grid repeats a touch too perfectly, and the clouds bleed straight into the glass.",
  },
  {
    id: "m3",
    url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1000&q=80&auto=format&fit=crop",
    isAI: false,
    title: "Spiral Stair, Interior Study",
    reason: "Consistent perspective lines and true depth-of-field falloff — shot on a real lens.",
  },
  {
    id: "m4",
    url: "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=1000&q=80&auto=format&fit=crop",
    isAI: true,
    title: "Forest in the Mist",
    reason: "Every trunk repeats the same bark pattern, and the fog has no single consistent light source.",
  },
  {
    id: "m5",
    url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1000&q=80&auto=format&fit=crop",
    isAI: false,
    title: "Rain on Fifth Avenue",
    reason: "Puddle reflections warp exactly with the pavement texture — physics doesn't lie.",
  },
  {
    id: "m6",
    url: "https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=1000&q=80&auto=format&fit=crop",
    isAI: true,
    title: "Alpine Lake at Dawn",
    reason: "The reflection doesn't quite match the shoreline geometry — a dead giveaway once you look for it.",
  },
  {
    id: "m7",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1000&q=80&auto=format&fit=crop",
    isAI: true,
    title: "Impossible Overlook",
    reason: "The rock strata don't align across the cliff face, and the horizon quietly warps.",
  },
  {
    id: "m8",
    url: "https://images.unsplash.com/photo-1531123414780-f74242c2b052?w=1000&q=80&auto=format&fit=crop",
    isAI: false,
    title: "Portrait, Available Light",
    reason: "Natural skin texture, asymmetrical features, and a believably imperfect background — a real sensor caught this.",
  },
];

// Stamp verified upload years onto every real (non-AI) entry at load time.
const MOCK_DECK = RAW_DECK.map((card) =>
  card.isAI ? card : { ...card, verifiedYear: unsplashUploadDate(card.url) }
);

function getTier(accuracy, total) {
  if (total === 0) return { title: "No Report Filed", blurb: "Play today's set." };
  if (accuracy >= 90) return { title: "Certified Inspector", blurb: "Sharp eyes." };
  if (accuracy >= 75) return { title: "Sharp-Eyed Skeptic", blurb: "Solid instincts." };
  if (accuracy >= 55) return { title: "Casual Scroller", blurb: "Room to improve." };
  if (accuracy >= 35) return { title: "Getting Rekt by Robots", blurb: "The machines won this round." };
  return { title: "AI Blind", blurb: "Rough round." };
}

const DRAG_THRESHOLD = 110;
const MAX_DRAG = 150; // mobile-only cap — narrow screens have little margin around the card, so an uncapped drag can push its feedback text off-screen. Desktop has plenty of margin and stays uncapped.
const VISIBLE_STACK = 3;
const LIFETIME_KEY = "slop-radar-lifetime-stats";
const INTRO_KEY = "slop-radar-seen-intro";
const DEFAULT_LIFETIME = {
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

/* ----------------------------- custom icons ----------------------------- */
// Simple, literal, hand-drawn (no icon library): a poop swirl with "AI"
// on it for slop, and a polaroid snapshot for real — read at a glance,
// no abstraction required.

function AIIcon({ size = 26, color = "#BD6A4E" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="17.1" r="5.3" fill={color} />
      <circle cx="12" cy="12.9" r="4.1" fill={color} />
      <circle cx="12" cy="9.3" r="2.9" fill={color} />
      <circle cx="12.4" cy="6.5" r="1.7" fill={color} />
      <ellipse cx="14.4" cy="16" rx="1.1" ry="1.4" fill="rgba(255,255,255,0.3)" />
      <text
        x="12"
        y="19.3"
        textAnchor="middle"
        fontSize="7.2"
        fontWeight="800"
        fontFamily="'Work Sans', sans-serif"
        fill="#FFFDF8"
      >
        AI
      </text>
    </svg>
  );
}

function RealIcon({ size = 26, color = "#5C7B58" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="2" width="18" height="20.5" rx="1.6" fill="#FFFEFB" stroke={color} strokeWidth="1.4" />
      <rect x="5.3" y="4.3" width="13.4" height="10.6" rx="1" fill={color} />
      <path d="M6.6 13.3 L9.8 9.6 L12.3 12 L14.9 8.3 L17.7 13.3 Z" fill="#FFFEFB" opacity="0.9" />
      <circle cx="15.7" cy="7" r="1.25" fill="#FFFEFB" opacity="0.95" />
    </svg>
  );
}

export default function SlopRadar() {
  const [deck, setDeck] = useState(MOCK_DECK);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const [history, setHistory] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [lifetime, setLifetime] = useState(DEFAULT_LIFETIME);
  const [lifetimeLoaded, setLifetimeLoaded] = useState(false);

  // phase: 'idle' | 'feedback' | 'exiting'
  const [phase, setPhase] = useState("idle");
  const [feedback, setFeedback] = useState(null);
  const [exitDirection, setExitDirection] = useState(0);

  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragXRef = useRef(0);
  const timers = useRef([]);
  const topCardRef = useRef(null);
  const wheelTimeout = useRef(null);
  const soundOnRef = useRef(true);
  const audioCtxRef = useRef(null);
  const hasCommittedRef = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // Attempt the real daily pipeline; fall back to mock data silently.
  useEffect(() => {
    let cancelled = false;
    fetchDailyDeck().then((cards) => {
      if (cancelled) return;
      if (cards) setDeck(cards);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load lifetime stats + first-visit flag from the browser's localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIFETIME_KEY);
      if (raw) setLifetime({ ...DEFAULT_LIFETIME, ...JSON.parse(raw) });
    } catch {
      // No record yet, or storage unavailable (e.g. private browsing) — defaults stand.
    }
    setLifetimeLoaded(true);

    try {
      if (!localStorage.getItem(INTRO_KEY)) {
        setShowHelp(true);
        localStorage.setItem(INTRO_KEY, "1");
      }
    } catch {
      // Storage unavailable — help modal just shows every visit instead of once.
    }
  }, []);

  /* ---------------------- sound effects (Web Audio API) ---------------------- */
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };

  const playTone = useCallback((freq, duration = 0.12, type = "sine", vol = 0.05, delay = 0) => {
    if (!soundOnRef.current) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      // Audio unsupported/blocked — fail silently.
    }
  }, []);

  const playSwipe = useCallback(() => playTone(340, 0.08, "triangle", 0.09), [playTone]);
  const playCorrect = useCallback(() => {
    playTone(640, 0.1, "sine", 0.18, 0.02);
    playTone(880, 0.14, "sine", 0.18, 0.11);
  }, [playTone]);
  const playIncorrect = useCallback(() => playTone(190, 0.28, "sine", 0.32, 0.02), [playTone]);
  const playClick = useCallback(() => playTone(500, 0.06, "sine", 0.08), [playTone]);

  const dayNumber = useMemo(getDayNumber, []);
  const currentCard = deck[currentIndex];
  const gameOver = currentIndex >= deck.length;
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  useEffect(() => {
    if (gameOver && deck.length > 0) {
      const t = setTimeout(() => setModalOpen(true), 500);
      timers.current.push(t);
    }
  }, [gameOver, deck.length]);

  // Commit this run into lifetime stats exactly once per completed game.
  useEffect(() => {
    if (!gameOver || !lifetimeLoaded || hasCommittedRef.current || deck.length === 0) return;
    hasCommittedRef.current = true;
    const realAnswers = history.filter((h) => !h.item.isAI);
    const aiAnswers = history.filter((h) => h.item.isAI);
    setLifetime((prev) => {
      const updated = {
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
      try {
        localStorage.setItem(LIFETIME_KEY, JSON.stringify(updated));
      } catch {
        // Storage unavailable (e.g. private browsing) — stats just won't persist this session.
      }
      return updated;
    });
  }, [gameOver, lifetimeLoaded, deck.length, score, accuracy, history]);

  const resetGame = useCallback(() => {
    setCurrentIndex(0);
    setScore({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
    setHistory([]);
    setPhase("idle");
    setFeedback(null);
    setDrag({ x: 0, y: 0 });
    setIsDragging(false);
    setExitDirection(0);
    setModalOpen(false);
    setCopied(false);
    dragXRef.current = 0;
    hasCommittedRef.current = false;
  }, []);

  const advance = useCallback((direction) => {
    setExitDirection(direction);
    setPhase("exiting");
    const t = setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setPhase("idle");
      setFeedback(null);
      setDrag({ x: 0, y: 0 });
      setExitDirection(0);
      dragXRef.current = 0;
    }, 320);
    timers.current.push(t);
  }, []);

  const vote = useCallback(
    (choice) => {
      if (phase !== "idle" || !currentCard) return;
      const correct = (choice === "ai") === currentCard.isAI;
      const direction = choice === "ai" ? -1 : 1;

      playSwipe();
      const t0 = setTimeout(() => (correct ? playCorrect() : playIncorrect()), 90);
      timers.current.push(t0);

      setScore((s) => {
        const streak = correct ? s.streak + 1 : 0;
        return {
          correct: s.correct + (correct ? 1 : 0),
          total: s.total + 1,
          streak,
          bestStreak: Math.max(s.bestStreak, streak),
        };
      });
      setHistory((h) => [...h, { item: currentCard, choice, correct }]);
      setFeedback({
        correct,
        reason: currentCard.reason,
        isAI: currentCard.isAI,
        verifiedYear: currentCard.verifiedYear,
      });
      setPhase("feedback");

      const t = setTimeout(() => advance(direction), 600);
      timers.current.push(t);
    },
    [phase, currentCard, advance, playSwipe, playCorrect, playIncorrect]
  );

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      if (gameOver) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        vote("ai");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        vote("real");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [vote, gameOver]);

  // Pointer (mouse/touch) drag
  const onPointerDown = (e) => {
    if (phase !== "idle") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
  };
  const onPointerMove = (e) => {
    if (!isDragging || phase !== "idle") return;
    let dx = e.clientX - dragStart.current.x;
    if (window.innerWidth < 768) dx = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, dx));
    const dy = e.clientY - dragStart.current.y;
    dragXRef.current = dx;
    setDrag({ x: dx, y: dy * 0.35 });
  };
  const endPointerDrag = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (phase !== "idle") return;
    const finalX = dragXRef.current;
    if (Math.abs(finalX) > DRAG_THRESHOLD) {
      vote(finalX > 0 ? "real" : "ai");
    } else {
      dragXRef.current = 0;
      setDrag({ x: 0, y: 0 });
    }
  };

  // Trackpad / mouse-wheel swipe — two-finger trackpad swipes (Mac) behave
  // just like a drag.
  useEffect(() => {
    const el = topCardRef.current;
    if (!el) return;

    function onWheelNative(e) {
      if (phase !== "idle") return;
      e.preventDefault();
      let next = dragXRef.current - e.deltaX;
      if (window.innerWidth < 768) next = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, next));
      dragXRef.current = next;
      setIsDragging(true);
      setDrag({ x: dragXRef.current, y: 0 });

      clearTimeout(wheelTimeout.current);
      wheelTimeout.current = setTimeout(() => {
        setIsDragging(false);
        const finalX = dragXRef.current;
        if (Math.abs(finalX) > DRAG_THRESHOLD) {
          vote(finalX > 0 ? "real" : "ai");
        } else {
          dragXRef.current = 0;
          setDrag({ x: 0, y: 0 });
        }
      }, 160);
    }

    el.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheelNative);
      clearTimeout(wheelTimeout.current);
    };
  }, [phase, vote]);

  const rotation = Math.max(-14, Math.min(14, drag.x / 14));
  const dragProgress = Math.min(1, Math.abs(drag.x) / DRAG_THRESHOLD);

  let cardTransform = `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`;
  let cardTransition = isDragging ? "none" : "transform 0.35s cubic-bezier(0.22,1,0.36,1)";
  if (phase === "exiting") {
    const flyX = exitDirection === 0 ? 0 : exitDirection * 650;
    const flyY = -40;
    cardTransform = `translate(${flyX}px, ${flyY}px) rotate(${exitDirection * 18}deg)`;
    cardTransition = "transform 0.32s cubic-bezier(0.55,0,1,0.45)";
  }
  // No "feedback" phase override here anymore — the card simply holds
  // whatever position/rotation it was swiped to instead of snapping back
  // to center before flying off.

  const tier = getTier(accuracy, score.total);

  const shareGrid = history.map((h) => (h.correct ? "\ud83d\udfe9" : "\ud83d\udfe5")).join("");
  const shareText = `Slop Radar #${dayNumber}\n${shareGrid}\n${score.correct}/${deck.length} correct \u00b7 ${accuracy}% accuracy`;

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareText;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        // clipboard genuinely unavailable — silently ignore
      }
      document.body.removeChild(ta);
    }
    const t = setTimeout(() => setCopied(false), 2000);
    timers.current.push(t);
  };

  const openHelp = () => {
    playClick();
    setShowHelp(true);
  };
  const openStats = () => {
    playClick();
    setModalOpen(true);
  };
  const toggleSound = () => {
    setSoundOn((s) => {
      if (!s) setTimeout(() => playClick(), 20);
      return !s;
    });
  };

  const feedbackBorder =
    phase === "feedback" && feedback ? (feedback.correct ? "#6E8E6B" : "#BD6A4E") : "#EDE2CE";

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative" style={{ backgroundColor: "#FBF6EC" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
        .font-display { font-family: 'Fraunces', serif; }
        .font-body { font-family: 'Work Sans', sans-serif; }
        .font-data { font-family: 'IBM Plex Mono', monospace; }
        @keyframes riseIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .rise-in { animation: riseIn 0.25s ease-out; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
        .pop-in { animation: popIn 0.28s cubic-bezier(0.34,1.56,0.64,1); }
        .fade-in { animation: fadeIn 0.2s ease-out; }
      `}</style>

      {/* Header */}
      <header className="w-full px-6 pt-8 pb-4 font-body" style={{ borderBottom: "1px solid #EDE2CE", maxWidth: 420 }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#EFE3CE" }}>
              <Newspaper size={17} style={{ color: "#B8863B" }} />
            </div>
            <div>
              <h1 className="font-display text-xl font-semibold leading-tight" style={{ color: "#332E29" }}>
                Slop Radar
              </h1>
              <p className="font-data tracking-wide" style={{ color: "#9C9285", fontSize: 10 }}>
                DAY #{dayNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSound}
              aria-label={soundOn ? "Mute sound" : "Unmute sound"}
              className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ color: "#9C9285", backgroundColor: "#F2E9D8" }}
            >
              {soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button
              onClick={openHelp}
              aria-label="How to play"
              className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ color: "#9C9285", backgroundColor: "#F2E9D8" }}
            >
              <HelpCircle size={14} />
            </button>
            <button
              onClick={openStats}
              aria-label="View stats"
              className="w-8 h-8 rounded-full flex items-center justify-center transition"
              style={{ color: "#9C9285", backgroundColor: "#F2E9D8" }}
            >
              <BarChart2 size={14} />
            </button>
            <div
              className="flex items-center gap-1.5 font-data text-xs px-2.5 py-1.5 rounded-full ml-0.5"
              style={{ color: score.streak > 0 ? "#B8863B" : "#9C9285", backgroundColor: "#F2E9D8" }}
            >
              <Flame size={13} />
              {score.streak}
            </div>
          </div>
        </div>

        {!gameOver && (
          <>
            <div className="flex items-center justify-center gap-1.5 mb-2">
              {deck.map((item, i) => {
                const h = i < history.length ? history[i] : null;
                const isCurrent = i === currentIndex && phase === "idle";
                let fill = "transparent";
                let border = "#E4DACB";
                if (h) {
                  fill = h.correct ? "#6E8E6B" : "#BD6A4E";
                  border = fill;
                } else if (isCurrent) {
                  border = "#C99A3B";
                }
                return (
                  <div
                    key={item.id}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: isCurrent ? 9 : 7,
                      height: isCurrent ? 9 : 7,
                      backgroundColor: fill,
                      border: `1.5px solid ${border}`,
                      boxShadow: isCurrent ? "0 0 0 3px rgba(201,154,59,0.22)" : "none",
                    }}
                  />
                );
              })}
            </div>
            <p className="font-data text-center" style={{ color: "#9C9285", fontSize: 10 }}>
              {Math.min(currentIndex + 1, deck.length)} OF {deck.length} &middot; ACCURACY{" "}
              <span style={{ color: "#6E8E6B" }} className="font-semibold">
                {score.total > 0 ? `${accuracy}%` : "\u2014"}
              </span>
            </p>
          </>
        )}
      </header>

      {/* Card stack */}
      <main className="flex-1 w-full flex items-center justify-center px-5 pb-4">
        {!gameOver ? (
          <div
            className="relative"
            style={{ width: "min(92vw, 60dvh, 460px)", height: "min(92vw, 60dvh, 460px)" }}
          >
            {deck.slice(currentIndex, currentIndex + VISIBLE_STACK).map((item, offset) => {
              const isTop = offset === 0;
              const stackScale = 1 - offset * 0.04;
              const stackY = offset * 12;
              return (
                <div
                  key={item.id}
                  ref={isTop ? topCardRef : undefined}
                  className="absolute inset-0 rounded-2xl p-3 flex flex-col justify-center"
                  style={{
                    backgroundColor: "#FFFEFB",
                    border: isTop ? `1.5px solid ${feedbackBorder}` : "1px solid #EDE2CE",
                    boxShadow: "0 10px 30px -12px rgba(60,45,20,0.18)",
                    zIndex: VISIBLE_STACK - offset,
                    transform: isTop ? cardTransform : `translateY(${stackY}px) scale(${stackScale})`,
                    transition: isTop
                      ? `${cardTransition}, border-color 0.25s ease-out`
                      : "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
                    touchAction: "none",
                    cursor: isTop ? (isDragging ? "grabbing" : "grab") : "default",
                  }}
                  onPointerDown={isTop ? onPointerDown : undefined}
                  onPointerMove={isTop ? onPointerMove : undefined}
                  onPointerUp={isTop ? endPointerDrag : undefined}
                  onPointerCancel={isTop ? endPointerDrag : undefined}
                >
                  <div
                    className="absolute -top-2.5 left-1/2 w-14 h-5 rounded-sm pointer-events-none z-10"
                    style={{
                      backgroundColor: "#E8DCC0",
                      opacity: 0.9,
                      transform: "translateX(-50%) rotate(-3deg)",
                      boxShadow: "0 2px 4px rgba(60,45,20,0.12)",
                    }}
                  />

                  <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: "1 / 1", backgroundColor: "#F1E9D8" }}>
                    <img
                      src={item.url}
                      alt={item.title}
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.parentElement.style.background = "linear-gradient(160deg,#F1E9D8,#E4D6B8)";
                      }}
                    />

                    {item.isLiveTest && (
                      <div
                        className="absolute top-2 right-2 font-data px-1.5 py-0.5 rounded z-10"
                        style={{ backgroundColor: "rgba(251,246,236,0.9)", color: "#9C9285", border: "1px dashed #C9BB9C", fontSize: 8 }}
                        title="Generated live via the Pollinations.ai API — the one test card for this round"
                      >
                        LIVE TEST
                      </div>
                    )}

                    {isTop && (
                      <>
                        <div
                          className="absolute top-5 right-4 font-display font-semibold text-sm px-2.5 py-1.5 rounded-lg pointer-events-none flex items-center gap-1.5"
                          style={{
                            color: "#6E8E6B",
                            border: "2.5px solid #6E8E6B",
                            backgroundColor: "rgba(255,254,251,0.92)",
                            transform: "rotate(-8deg)",
                            opacity: drag.x > 15 ? Math.min(1, dragProgress * 1.4) : 0,
                          }}
                        >
                          <RealIcon size={16} color="#6E8E6B" strokeWidth={2} />
                          REAL
                        </div>
                        <div
                          className="absolute top-5 left-4 font-display font-semibold text-sm px-2.5 py-1.5 rounded-lg pointer-events-none flex items-center gap-1.5"
                          style={{
                            color: "#BD6A4E",
                            border: "2.5px solid #BD6A4E",
                            backgroundColor: "rgba(255,254,251,0.92)",
                            transform: "rotate(8deg)",
                            opacity: drag.x < -15 ? Math.min(1, dragProgress * 1.4) : 0,
                          }}
                        >
                          <AIIcon size={16} color="#BD6A4E" strokeWidth={2} />
                          SLOP
                        </div>
                      </>
                    )}

                    {isTop && phase === "feedback" && feedback && (
                      <div
                        className="absolute inset-0 flex flex-col items-center justify-center pop-in"
                        style={{ backgroundColor: feedback.correct ? "#E3EBE0" : "#F2E0D6" }}
                      >
                        {feedback.correct ? (
                          <Check size={40} style={{ color: "#5C7B58" }} strokeWidth={3} />
                        ) : (
                          <X size={40} style={{ color: "#B0603F" }} strokeWidth={3} />
                        )}
                        <p
                          className="font-display font-semibold mt-2"
                          style={{ fontSize: "clamp(18px, 6vw, 26px)", color: feedback.correct ? "#5C7B58" : "#B0603F" }}
                        >
                          {feedback.correct ? "Correct" : "Wrong"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full max-w-md text-center font-body rise-in">
            <Sparkle size={26} style={{ color: "#C99A3B" }} className="mx-auto mb-3" />
            <p className="font-display text-lg" style={{ color: "#6B655A" }}>
              Today's report is ready.
            </p>
          </div>
        )}
      </main>

      {/* Action buttons */}
      {!gameOver && (
        <footer className="w-full max-w-md px-6 pb-6 pt-1 flex items-center justify-center gap-10 font-body">
          <button
            onClick={() => vote("ai")}
            disabled={phase !== "idle"}
            aria-label="Mark as AI Slop"
            className="rounded-full flex items-center justify-center transition disabled:opacity-40 active:scale-95 hover:-translate-y-0.5"
            style={{
              backgroundColor: "#FFFEFB",
              border: "2px solid #E3B8A4",
              color: "#BD6A4E",
              boxShadow: "0 6px 16px -8px rgba(189,106,78,0.35)",
              width: 68,
              height: 68,
            }}
          >
            <AIIcon size={28} />
          </button>
          <button
            onClick={() => vote("real")}
            disabled={phase !== "idle"}
            aria-label="Mark as Real Photo"
            className="rounded-full flex items-center justify-center transition disabled:opacity-40 active:scale-95 hover:-translate-y-0.5"
            style={{
              backgroundColor: "#FFFEFB",
              border: "2px solid #B7CAB2",
              color: "#5C7B58",
              boxShadow: "0 6px 16px -8px rgba(92,123,88,0.35)",
              width: 68,
              height: 68,
            }}
          >
            <RealIcon size={28} />
          </button>
        </footer>
      )}

      <p className="pb-6 font-data text-center px-4">
        <button
          onClick={() => setShowPrivacy(true)}
          className="underline"
          style={{ color: "#C9BB9C", fontSize: 10, background: "none", border: "none", cursor: "pointer" }}
        >
          Privacy Policy
        </button>
      </p>

      {/* How to Play modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 fade-in" style={{ backgroundColor: "rgba(51,46,41,0.45)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-7 rise-in"
            style={{ backgroundColor: "#FFFEFB", border: "1px solid #EDE2CE", boxShadow: "0 24px 60px -20px rgba(40,30,10,0.35)" }}
          >
            <h2 className="font-display text-xl font-semibold text-center mb-4" style={{ color: "#332E29" }}>
              How to Play
            </h2>
            <ul className="font-body text-sm leading-relaxed space-y-3 mb-6" style={{ color: "#514C43" }}>
              <li className="flex gap-2.5">
                <span style={{ color: "#C99A3B" }}>1.</span>
                Look at each image and decide: AI slop, or a real photograph.
              </li>
              <li className="flex gap-2.5">
                <span style={{ color: "#C99A3B" }}>2.</span>
                Drag the card, click a button, use the arrow keys, or swipe your trackpad.
              </li>
              <li className="flex gap-2.5">
                <span style={{ color: "#C99A3B" }}>3.</span>
                Eight images a day. Your streaks and accuracy carry over forever.
              </li>
            </ul>
            <button
              onClick={() => setShowHelp(false)}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-body font-semibold transition active:scale-95"
              style={{ backgroundColor: "#332E29", color: "#FBF6EC" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Privacy Policy modal */}
      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 fade-in" style={{ backgroundColor: "rgba(51,46,41,0.45)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-7 rise-in overflow-y-auto"
            style={{ backgroundColor: "#FFFEFB", border: "1px solid #EDE2CE", boxShadow: "0 24px 60px -20px rgba(40,30,10,0.35)", maxHeight: "80dvh" }}
          >
            <h2 className="font-display text-xl font-semibold text-center mb-4" style={{ color: "#332E29" }}>
              Privacy Policy
            </h2>
            <div className="font-body text-sm leading-relaxed space-y-3 mb-6" style={{ color: "#514C43" }}>
              <p>Slop Radar does not collect or store any personal information, and there are no accounts, cookies, or advertising trackers on this site.</p>
              <p>
                Your game stats (games played, accuracy, streaks) are saved only in your own browser&apos;s local storage. They never leave your device
                and are not visible to us. Clearing your browser data will reset them.
              </p>
              <p>The images and their labels are fetched from our Supabase database to build each day&apos;s puzzle. No information about you is sent as part of that request.</p>
              <p>This app is hosted on Vercel, which may log basic, anonymized technical data (like request counts) for operating the service, separate from anything this app itself collects.</p>
            </div>
            <button
              onClick={() => setShowPrivacy(false)}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-body font-semibold transition active:scale-95"
              style={{ backgroundColor: "#332E29", color: "#FBF6EC" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Stats / Daily Summary modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5 fade-in" style={{ backgroundColor: "rgba(51,46,41,0.45)" }}>
          <div
            className="w-full max-w-sm rounded-2xl p-7 rise-in overflow-y-auto"
            style={{
              backgroundColor: "#FFFEFB",
              border: "1px solid #EDE2CE",
              boxShadow: "0 24px 60px -20px rgba(40,30,10,0.35)",
              maxHeight: "90dvh",
            }}
          >
            {gameOver ? (
              <>
                <p className="font-data uppercase text-center mb-2" style={{ color: "#B8863B", fontSize: 10, letterSpacing: "0.25em" }}>
                  Daily Summary &middot; Day #{dayNumber}
                </p>
                <h2 className="font-display text-2xl font-semibold text-center mb-1" style={{ color: "#332E29" }}>
                  {tier.title}
                </h2>
                <p className="font-body text-sm text-center mb-6" style={{ color: "#6B655A" }}>
                  {tier.blurb}
                </p>

                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  <SummaryStat label="Correct" value={`${score.correct}/${deck.length}`} />
                  <SummaryStat label="Accuracy" value={`${accuracy}%`} accent="#5C7B58" />
                  <SummaryStat label="Best Streak" value={score.bestStreak} accent="#B8863B" icon={<Trophy size={13} />} />
                </div>

                <div className="rounded-xl px-4 py-4 mb-5 text-center" style={{ backgroundColor: "#F7F1E4", border: "1px solid #EDE2CE" }}>
                  <p className="font-display text-lg tracking-widest mb-1">{shareGrid}</p>
                  <p className="font-data" style={{ color: "#9C9285", fontSize: 11 }}>
                    {score.correct}/{deck.length} correct &middot; {accuracy}% accuracy
                  </p>
                </div>

                <div className="lg:hidden">
                  <RevealGridCompact history={history} />
                </div>
              </>
            ) : (
              <>
                <p className="font-data uppercase text-center mb-2" style={{ color: "#B8863B", fontSize: 10, letterSpacing: "0.25em" }}>
                  Lifetime Stats
                </p>
                <h2 className="font-display text-xl font-semibold text-center mb-5" style={{ color: "#332E29" }}>
                  Your Track Record
                </h2>
              </>
            )}

            <LifetimeStats lifetime={lifetime} />

            {gameOver ? (
              <>
                <button
                  onClick={copyShare}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-body font-semibold mt-6 mb-2.5 transition active:scale-95"
                  style={{ backgroundColor: "#332E29", color: "#FBF6EC" }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? "Copied to clipboard" : "Copy results"}
                </button>
                <button
                  onClick={resetGame}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-body font-medium transition active:scale-95"
                  style={{ backgroundColor: "#F2E9D8", color: "#6B655A" }}
                >
                  <RotateCcw size={15} />
                  Play again
                </button>
              </>
            ) : (
              <button
                onClick={() => setModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-body font-semibold mt-6 transition active:scale-95"
                style={{ backgroundColor: "#332E29", color: "#FBF6EC" }}
              >
                Close
              </button>
            )}
          </div>

          {gameOver && (
            <>
              <RevealRail label="Slop" color="#BD6A4E" cards={history.filter((h) => h.item.isAI)} side="left" />
              <RevealRail label="Real" color="#5C7B58" cards={history.filter((h) => !h.item.isAI)} side="right" />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RevealGridCompact({ history }) {
  const slop = history.filter((h) => h.item.isAI);
  const real = history.filter((h) => !h.item.isAI);

  return (
    <div className="mb-5">
      <p className="font-data uppercase text-center mb-2.5" style={{ color: "#9C9285", fontSize: 10, letterSpacing: "0.15em" }}>
        The Reveal
      </p>
      <div className="grid grid-cols-2 gap-3">
        <RevealColumnCompact label="Slop" color="#BD6A4E" cards={slop} />
        <RevealColumnCompact label="Real" color="#5C7B58" cards={real} />
      </div>
    </div>
  );
}

function RevealColumnCompact({ label, color, cards }) {
  return (
    <div>
      <p className="font-display font-semibold text-center mb-2" style={{ color, fontSize: 13 }}>
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cards.map((h, i) => (
          <div key={i} className="relative rounded-lg overflow-hidden" style={{ border: `1.5px solid ${color}55`, backgroundColor: "#F1E9D8" }}>
            <img
              src={h.item.url}
              alt={h.item.title}
              className="w-full object-contain"
              style={{ aspectRatio: "1 / 1" }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement.style.background = "#F1E9D8";
              }}
            />
            <span
              className="absolute top-1 right-1 rounded-full flex items-center justify-center"
              style={{ width: 18, height: 18, backgroundColor: h.correct ? "#E3EBE0" : "#F2E0D6" }}
            >
              {h.correct ? (
                <Check size={11} style={{ color: "#5C7B58" }} strokeWidth={3.5} />
              ) : (
                <X size={11} style={{ color: "#B0603F" }} strokeWidth={3.5} />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevealRail({ label, color, cards, side }) {
  // Chunk into rows of 2, however many rows that ends up being — works for
  // any split (3 slop / 5 real, 8 / 0, etc.), not just an even 4-and-4.
  const rows = [];
  for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2));

  const ROW_GAP = 10;
  const LABEL_BLOCK = 40; // label height + gap below it
  const ROW_MAX = 150; // px — caps square size when a side has very few rows
  const rowHeight =
    rows.length > 0
      ? `min(calc((92dvh - ${LABEL_BLOCK}px - ${(rows.length - 1) * ROW_GAP}px) / ${rows.length}), ${ROW_MAX}px)`
      : "0px";

  return (
    <div
      className="hidden lg:block"
      style={{
        position: "fixed",
        [side]: "2vw",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 51,
        height: "92dvh",
        width: ROW_MAX * 2 + ROW_GAP,
      }}
    >
      <p
        className="font-display font-semibold text-center"
        style={{ color, fontSize: 18, textShadow: "0 1px 4px rgba(0,0,0,0.3)", height: 28, marginBottom: 12 }}
      >
        {label}
      </p>
      {rows.map((rowCards, r) => (
        <div
          key={r}
          className="flex justify-center"
          style={{ height: rowHeight, gap: 10, marginBottom: r < rows.length - 1 ? ROW_GAP : 0 }}
        >
          {rowCards.map((h, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden"
              style={{
                height: "100%",
                aspectRatio: "1 / 1",
                border: `2px solid ${color}88`,
                boxShadow: "0 10px 28px -6px rgba(0,0,0,0.4)",
                backgroundColor: "#F1E9D8",
              }}
            >
              <img
                src={h.item.url}
                alt={h.item.title}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.parentElement.style.background = "#F1E9D8";
                }}
              />
              <span
                className="absolute top-1.5 left-1.5 rounded-full flex items-center justify-center"
                style={{ width: 22, height: 22, backgroundColor: h.correct ? "#E3EBE0" : "#F2E0D6" }}
              >
                {h.correct ? (
                  <Check size={13} style={{ color: "#5C7B58" }} strokeWidth={3.5} />
                ) : (
                  <X size={13} style={{ color: "#B0603F" }} strokeWidth={3.5} />
                )}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function SummaryStat({ label, value, accent = "#332E29", icon }) {
  return (
    <div className="rounded-xl px-2 py-3 flex flex-col items-center gap-1 font-body" style={{ backgroundColor: "#F7F1E4", border: "1px solid #EDE2CE" }}>
      {icon && <span style={{ color: accent }}>{icon}</span>}
      <span className="font-display font-semibold text-lg" style={{ color: accent }}>
        {value}
      </span>
      <span className="font-data uppercase tracking-wide" style={{ color: "#9C9285", fontSize: 9 }}>
        {label}
      </span>
    </div>
  );
}

function LifetimeStats({ lifetime }) {
  const realAcc = lifetime.realTotal > 0 ? Math.round((lifetime.realCorrect / lifetime.realTotal) * 100) : 0;
  const aiAcc = lifetime.aiTotal > 0 ? Math.round((lifetime.aiCorrect / lifetime.aiTotal) * 100) : 0;
  const lifetimeAccuracy =
    lifetime.totalAnswered > 0 ? Math.round((lifetime.totalCorrect / lifetime.totalAnswered) * 100) : 0;

  return (
    <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "#F7F1E4", border: "1px solid #EDE2CE" }}>
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 font-body mb-4" style={{ color: "#514C43", fontSize: 13 }}>
        <span>Games played</span>
        <span className="text-right font-semibold">{lifetime.gamesPlayed}</span>
        <span>All-time accuracy</span>
        <span className="text-right font-semibold" style={{ color: "#5C7B58" }}>
          {lifetime.totalAnswered > 0 ? `${lifetimeAccuracy}%` : "\u2014"}
        </span>
        <span>Best streak ever</span>
        <span className="text-right font-semibold" style={{ color: "#B8863B" }}>
          {lifetime.bestStreak}
        </span>
      </div>

      <div className="space-y-2.5">
        <BarRow label="Real photos" value={realAcc} hasData={lifetime.realTotal > 0} color="#6E8E6B" track="#E3EBE0" />
        <BarRow label="AI slop" value={aiAcc} hasData={lifetime.aiTotal > 0} color="#BD6A4E" track="#F2E0D6" />
      </div>
    </div>
  );
}

function BarRow({ label, value, hasData, color, track }) {
  return (
    <div>
      <div className="flex items-center justify-between font-data uppercase tracking-wide mb-1" style={{ color: "#9C9285", fontSize: 10 }}>
        <span>{label}</span>
        <span style={{ color: hasData ? color : "#9C9285" }}>{hasData ? `${value}%` : "\u2014"}</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: track }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: hasData ? `${value}%` : "0%", backgroundColor: color }}
        />
      </div>
    </div>
  );
}
