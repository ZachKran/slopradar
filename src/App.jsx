import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, RotateCcw, Share2, SatelliteDish, ScanLine } from "lucide-react";

import { supabase } from "./supabaseClient.js";
import { fetchDailyDeck, getDayNumber } from "./lib/deck.js";
import { DEFAULT_LIFETIME, loadLifetime, recordCompletedGame, getTier, hasSeenIntro, markIntroSeen } from "./lib/stats.js";
import { useSwipeGesture } from "./hooks/useSwipeGesture.js";

import Hud from "./components/Hud.jsx";
import ProgressRail from "./components/ProgressRail.jsx";
import ScanCard from "./components/ScanCard.jsx";
import ZoomOverlay from "./components/ZoomOverlay.jsx";
import Sheet from "./components/Sheet.jsx";
import LifetimePanel, { StatTile } from "./components/StatsPanel.jsx";
import RevealReport from "./components/RevealReport.jsx";

// Bump on every deploy so it's visible on-screen whether a live site is
// running this build or a stale cached one.
const APP_VERSION = "radar-2026-09-05";

const VISIBLE_STACK = 3;

function PrimaryButton({ onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-body font-semibold transition active:scale-95"
      style={{ backgroundColor: "var(--accent)", color: "#02120f" }}
    >
      {icon}
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-body font-medium transition active:scale-95"
      style={{ backgroundColor: "var(--surface-alt)", color: "var(--text-dim)", border: "1px solid var(--border)" }}
    >
      {icon}
      {children}
    </button>
  );
}

export default function App() {
  const [deck, setDeck] = useState([]);
  const [deckLoaded, setDeckLoaded] = useState(false);
  const [deckFailed, setDeckFailed] = useState(false);
  const [entryPlayed, setEntryPlayed] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
  const [history, setHistory] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | feedback | exiting
  const [feedback, setFeedback] = useState(null);
  const [exitDirection, setExitDirection] = useState(0);

  const [helpOpen, setHelpOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [zoomCard, setZoomCard] = useState(null);
  const [copied, setCopied] = useState(false);
  const [soundOn, setSoundOn] = useState(true);

  const [lifetime, setLifetime] = useState(DEFAULT_LIFETIME);
  const [lifetimeLoaded, setLifetimeLoaded] = useState(false);

  const timers = useRef([]);
  const soundOnRef = useRef(true);
  const audioCtxRef = useRef(null);
  const hasCommittedRef = useRef(false);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  // Load today's deck from the same Supabase "cards" table as before. No
  // fallback deck — a failed/empty fetch shows a "no signal" state instead
  // of stale placeholder content.
  useEffect(() => {
    let cancelled = false;
    fetchDailyDeck(supabase).then((cards) => {
      if (cancelled) return;
      if (cards && cards.length > 0) {
        setDeck(cards);
        setDeckLoaded(true);
        const t = setTimeout(() => {
          if (!cancelled) setEntryPlayed(true);
        }, 800);
        timers.current.push(t);
      } else {
        setDeckFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Lifetime stats + first-visit briefing, from localStorage.
  useEffect(() => {
    setLifetime(loadLifetime());
    setLifetimeLoaded(true);
    if (!hasSeenIntro()) {
      setHelpOpen(true);
      markIntroSeen();
    }
  }, []);

  /* ---------------------------- sonar tones ---------------------------- */
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };

  const ping = useCallback((freq, { duration = 0.1, type = "sine", gain = 0.06, delay = 0 } = {}) => {
    if (!soundOnRef.current) return;
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(g).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch {
      // audio unsupported/blocked — fail silently
    }
  }, []);

  const playTick = useCallback(() => ping(420, { duration: 0.06, type: "square", gain: 0.05 }), [ping]);
  const playConfirm = useCallback(() => {
    ping(720, { duration: 0.09, type: "sine", gain: 0.16 });
    ping(980, { duration: 0.13, type: "sine", gain: 0.16, delay: 0.09 });
  }, [ping]);
  const playAlert = useCallback(() => ping(150, { duration: 0.3, type: "sawtooth", gain: 0.13 }), [ping]);
  const playBlip = useCallback(() => ping(560, { duration: 0.05, type: "square", gain: 0.05 }), [ping]);

  /* ------------------------------ game state ----------------------------- */
  const dayNumber = useMemo(() => getDayNumber(), []);
  const currentCard = deck[currentIndex];
  const gameOver = deckLoaded && currentIndex >= deck.length;
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  useEffect(() => {
    if (gameOver && deck.length > 0) {
      const t = setTimeout(() => setStatsOpen(true), 450);
      timers.current.push(t);
    }
  }, [gameOver, deck.length]);

  // Commit this run into lifetime stats exactly once per completed deck.
  useEffect(() => {
    if (!gameOver || !lifetimeLoaded || hasCommittedRef.current || deck.length === 0) return;
    hasCommittedRef.current = true;
    setLifetime((prev) => recordCompletedGame(prev, { score, accuracy, history }));
  }, [gameOver, lifetimeLoaded, deck.length, score, accuracy, history]);

  const resetGame = useCallback(() => {
    setCurrentIndex(0);
    setScore({ correct: 0, total: 0, streak: 0, bestStreak: 0 });
    setHistory([]);
    setPhase("idle");
    setFeedback(null);
    setExitDirection(0);
    setStatsOpen(false);
    setCopied(false);
    hasCommittedRef.current = false;
  }, []);

  const advance = useCallback(
    (direction) => {
      setExitDirection(direction);
      setPhase("exiting");
      const t = setTimeout(() => {
        setCurrentIndex((i) => i + 1);
        setPhase("idle");
        setFeedback(null);
        setExitDirection(0);
        gestureRef.current?.reset();
      }, 300);
      timers.current.push(t);
    },
    []
  );

  const vote = useCallback(
    (choice) => {
      if (phase !== "idle" || !currentCard) return;
      const correct = (choice === "ai") === currentCard.isAI;
      const direction = choice === "ai" ? -1 : 1;

      playTick();
      const t0 = setTimeout(() => (correct ? playConfirm() : playAlert()), 90);
      timers.current.push(t0);

      setScore((s) => {
        const streak = correct ? s.streak + 1 : 0;
        return { correct: s.correct + (correct ? 1 : 0), total: s.total + 1, streak, bestStreak: Math.max(s.bestStreak, streak) };
      });
      setHistory((h) => [...h, { item: currentCard, choice, correct }]);
      setFeedback({ correct });
      setPhase("feedback");

      const t = setTimeout(() => advance(direction), 600);
      timers.current.push(t);
    },
    [phase, currentCard, advance, playTick, playConfirm, playAlert]
  );

  const gesture = useSwipeGesture({
    disabled: phase !== "idle" || !currentCard,
    onCommit: (dir) => vote(dir === "right" ? "real" : "ai"),
    onTap: () => currentCard && setZoomCard(currentCard),
  });
  // advance() needs to reset drag state, but is declared before `gesture`
  // exists — stash it in a ref so both can be defined without reordering.
  const gestureRef = useRef(gesture);
  gestureRef.current = gesture;

  // Keyboard shortcuts.
  useEffect(() => {
    function onKey(e) {
      if (gameOver || phase !== "idle") return;
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
  }, [vote, gameOver, phase]);

  const toggleSound = () => {
    setSoundOn((s) => {
      if (!s) setTimeout(() => playBlip(), 20);
      return !s;
    });
  };
  const openHelp = () => {
    playBlip();
    setHelpOpen(true);
  };
  const openStats = () => {
    playBlip();
    setStatsOpen(true);
  };

  const tier = getTier(accuracy, score.total);
  const shareGrid = history.map((h) => (h.correct ? "🟩" : "🟥")).join("");
  const shareText = `Slop Radar — Scan #${dayNumber}\n${shareGrid}\n${score.correct}/${deck.length} correct · ${accuracy}% accuracy`;
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  const shareResults = async () => {
    if (canNativeShare) {
      try {
        await navigator.share({ title: "Slop Radar", text: shareText });
      } catch {
        // share sheet dismissed — nothing to do
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      const t = setTimeout(() => setCopied(false), 2000);
      timers.current.push(t);
    } catch {
      // clipboard unavailable — silently ignore
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative" style={{ backgroundColor: "var(--bg)" }}>
      <div className="absolute inset-0 pointer-events-none bg-radar-grid" style={{ opacity: 0.45, maskImage: "linear-gradient(to bottom, black, transparent 65%)" }} />

      <Hud dayNumber={dayNumber} streak={score.streak} soundOn={soundOn} onToggleSound={toggleSound} onHelp={openHelp} onStats={openStats} />

      {deckLoaded && !deckFailed && !gameOver && (
        <ProgressRail deck={deck} history={history} currentIndex={currentIndex} accuracy={accuracy} hasAnswered={score.total > 0} />
      )}

      <main className="flex-1 w-full min-h-0 flex items-center justify-center px-3 pb-1 relative z-10" style={{ containerType: "size" }}>
        {deckFailed ? (
          <div className="w-full max-w-md text-center font-body px-6">
            <SatelliteDish size={26} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
            <p className="font-display text-lg font-semibold" style={{ color: "var(--text)" }}>
              No Signal
            </p>
            <p className="font-body text-sm mt-1" style={{ color: "var(--text-dim)" }}>
              Today's scan isn't ready yet &mdash; check back soon.
            </p>
          </div>
        ) : !deckLoaded ? (
          <div className="w-full max-w-md text-center font-body px-6">
            <ScanLine size={26} style={{ color: "var(--accent)" }} className="mx-auto mb-3 pulse-dot" />
            <p className="font-display text-lg" style={{ color: "var(--text-dim)" }}>
              Calibrating today's scan&hellip;
            </p>
          </div>
        ) : !gameOver ? (
          <div className="relative" style={{ width: "min(100cqw, 100cqh, 480px)", height: "min(100cqw, 100cqh, 480px)", touchAction: "none" }}>
            {deck.slice(currentIndex, currentIndex + VISIBLE_STACK).map((item, offset) => {
              const isTop = offset === 0;
              let transform = `translateY(${offset * 12}px) scale(${1 - offset * 0.045})`;
              let transition = "transform 0.3s cubic-bezier(0.22,1,0.36,1)";
              if (isTop) {
                const rotation = Math.max(-14, Math.min(14, gesture.drag.x / 14));
                transform = `translate(${gesture.drag.x}px, ${gesture.drag.y}px) rotate(${rotation}deg)`;
                transition = gesture.dragging ? "none" : "transform 0.32s cubic-bezier(0.22,1,0.36,1)";
                if (phase === "exiting") {
                  transform = `translate(${exitDirection * 700}px, -30px) rotate(${exitDirection * 16}deg)`;
                  transition = "transform 0.3s cubic-bezier(0.55,0,1,0.45)";
                }
              }
              return (
                <div
                  key={item.id}
                  className={`absolute inset-0${entryPlayed ? "" : " materialize"}`}
                  style={{ zIndex: VISIBLE_STACK - offset, animationDelay: entryPlayed ? undefined : `${offset * 60}ms` }}
                >
                  <ScanCard
                    item={item}
                    isTop={isTop}
                    offset={offset}
                    transform={transform}
                    transition={transition}
                    dragX={gesture.drag.x}
                    dragging={gesture.dragging}
                    phase={phase}
                    feedback={feedback}
                    cardRef={gesture.ref}
                    bind={gesture.bind}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full max-w-md text-center font-body px-6 fade-in">
            <ScanLine size={26} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
            <p className="font-display text-lg" style={{ color: "var(--text-dim)" }}>
              Scan complete.
            </p>
          </div>
        )}
      </main>

      {deckLoaded && !deckFailed && !gameOver && (
        <footer
          className="w-full flex items-center justify-center gap-9 relative z-10"
          style={{ maxWidth: 420, paddingBottom: "calc(1.1rem + env(safe-area-inset-bottom))", paddingTop: 2 }}
        >
          <button
            onClick={() => vote("ai")}
            disabled={phase !== "idle"}
            aria-label="Mark as AI slop"
            className="rounded-full flex items-center justify-center transition disabled:opacity-40 active:scale-90"
            style={{ width: 64, height: 64, backgroundColor: "var(--surface)", border: "2px solid var(--ai)", boxShadow: "0 8px 22px -10px var(--ai-dim)" }}
          >
            <img src="/icons/ai-icon.png" alt="AI slop" width={26} height={26} style={{ display: "block" }} draggable={false} />
          </button>
          <button
            onClick={() => vote("real")}
            disabled={phase !== "idle"}
            aria-label="Mark as real photo"
            className="rounded-full flex items-center justify-center transition disabled:opacity-40 active:scale-90"
            style={{ width: 64, height: 64, backgroundColor: "var(--surface)", border: "2px solid var(--real)", boxShadow: "0 8px 22px -10px var(--real-dim)" }}
          >
            <img src="/icons/real-icon.png" alt="Real photo" width={26} height={26} style={{ display: "block" }} draggable={false} />
          </button>
        </footer>
      )}

      <p className="pb-5 font-mono text-center px-4 relative z-10">
        <button
          onClick={() => setPrivacyOpen(true)}
          className="underline"
          style={{ color: "var(--text-faint)", fontSize: 10, background: "none", border: "none", cursor: "pointer" }}
        >
          Privacy Policy
        </button>
        <span style={{ color: "var(--text-faint)", fontSize: 10 }}> &middot; {APP_VERSION}</span>
      </p>

      <ZoomOverlay card={zoomCard} onClose={() => setZoomCard(null)} />

      <Sheet
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        eyebrow="Briefing"
        title="How This Works"
        footer={<PrimaryButton onClick={() => setHelpOpen(false)}>Start scanning</PrimaryButton>}
      >
        <ul className="font-body text-sm leading-relaxed space-y-3" style={{ color: "var(--text-dim)" }}>
          <li className="flex gap-2.5">
            <span className="font-mono" style={{ color: "var(--accent)" }}>
              01
            </span>
            Every image is either AI-generated or a real photograph &mdash; call it.
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono" style={{ color: "var(--accent)" }}>
              02
            </span>
            Drag the card, tap a reticle button, use the arrow keys, or swipe a trackpad.
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono" style={{ color: "var(--accent)" }}>
              03
            </span>
            Tap the image without dragging to zoom in for a closer look.
          </li>
          <li className="flex gap-2.5">
            <span className="font-mono" style={{ color: "var(--accent)" }}>
              04
            </span>
            Ten images a day. Streaks and accuracy carry over forever.
          </li>
        </ul>
      </Sheet>

      <Sheet open={privacyOpen} onClose={() => setPrivacyOpen(false)} eyebrow="Legal" title="Privacy Policy">
        <div className="font-body text-sm leading-relaxed space-y-3" style={{ color: "var(--text-dim)" }}>
          <p>Slop Radar does not collect or store any personal information, and there are no accounts, cookies, or advertising trackers on this site.</p>
          <p>
            Your stats (scans run, accuracy, streaks) live only in your own browser&apos;s local storage. They never leave your device and aren&apos;t
            visible to us. Clearing your browser data resets them.
          </p>
          <p>The images and their labels are fetched from our Supabase database to build each day&apos;s scan. No information about you is sent as part of that request.</p>
          <p>This app is hosted on Vercel, which may log basic, anonymized technical data (like request counts) for operating the service, separate from anything this app itself collects.</p>
        </div>
      </Sheet>

      <Sheet
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        eyebrow={gameOver ? `Daily Report · Scan #${dayNumber}` : "Lifetime Stats"}
        title={gameOver ? tier.title : "Your Track Record"}
        footer={
          gameOver ? (
            <>
              <PrimaryButton onClick={shareResults} icon={copied ? <Check size={16} /> : canNativeShare ? <Share2 size={16} /> : <Copy size={16} />}>
                {copied ? "Copied to clipboard" : "Share results"}
              </PrimaryButton>
              <div className="mt-2.5">
                <SecondaryButton onClick={resetGame} icon={<RotateCcw size={15} />}>
                  Play again
                </SecondaryButton>
              </div>
            </>
          ) : undefined
        }
      >
        {gameOver ? (
          <>
            <p className="font-body text-sm text-center mb-5" style={{ color: "var(--text-dim)" }}>
              {tier.blurb}
            </p>
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              <StatTile label="Correct" value={`${score.correct}/${deck.length}`} />
              <StatTile label="Accuracy" value={`${accuracy}%`} accent="var(--real)" />
              <StatTile label="Best Streak" value={score.bestStreak} accent="#ffb020" />
            </div>
            <div className="rounded-xl px-4 py-4 mb-5 text-center" style={{ backgroundColor: "var(--surface-alt)", border: "1px solid var(--border)" }}>
              <p className="tracking-widest mb-1" style={{ fontSize: 18 }}>
                {shareGrid}
              </p>
              <p className="font-mono" style={{ color: "var(--text-faint)", fontSize: 11 }}>
                {score.correct}/{deck.length} correct &middot; {accuracy}% accuracy
              </p>
            </div>
            <RevealReport history={history} />
            <LifetimePanel lifetime={lifetime} />
          </>
        ) : (
          <LifetimePanel lifetime={lifetime} />
        )}
      </Sheet>
    </div>
  );
}
