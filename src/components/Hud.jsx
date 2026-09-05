import { Radar, Volume2, VolumeX, HelpCircle, Gauge } from "lucide-react";

function IconButton({ onClick, active, children, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="rounded-full flex items-center justify-center transition active:scale-90"
      style={{
        width: 40,
        height: 40,
        color: active ? "var(--accent)" : "var(--text-dim)",
        backgroundColor: "var(--surface-alt)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </button>
  );
}

export default function Hud({ dayNumber, streak, soundOn, onToggleSound, onHelp, onStats }) {
  return (
    <header
      className="w-full px-4 font-body"
      style={{
        maxWidth: 460,
        paddingTop: "calc(0.9rem + env(safe-area-inset-top))",
        paddingBottom: "0.75rem",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: "var(--accent-dim)", border: "1px solid var(--border-strong)" }}
          >
            <Radar size={17} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h1 className="font-display font-semibold leading-none" style={{ color: "var(--text)", fontSize: 17, letterSpacing: "-0.01em" }}>
              SLOP RADAR
            </h1>
            <p className="font-mono tracking-widest mt-1" style={{ color: "var(--text-faint)", fontSize: 10 }}>
              SCAN #{String(dayNumber).padStart(3, "0")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton onClick={onToggleSound} label={soundOn ? "Mute sound" : "Unmute sound"}>
            {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </IconButton>
          <IconButton onClick={onHelp} label="How to play">
            <HelpCircle size={15} />
          </IconButton>
          <IconButton onClick={onStats} label="View stats">
            <Gauge size={15} />
          </IconButton>
          <div
            className="flex items-center gap-1 font-mono rounded-full ml-0.5"
            style={{
              fontSize: 12,
              padding: "0.55rem 0.65rem",
              color: streak > 0 ? "#ffb020" : "var(--text-faint)",
              backgroundColor: "var(--surface-alt)",
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: 13 }}>{streak > 0 ? "🔥" : "·"}</span>
            {streak}
          </div>
        </div>
      </div>
    </header>
  );
}
