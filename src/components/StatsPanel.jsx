import { Trophy } from "lucide-react";

export function StatTile({ label, value, accent = "var(--text)", icon }) {
  return (
    <div
      className="rounded-xl px-2 py-3 flex flex-col items-center gap-1 font-body"
      style={{ backgroundColor: "var(--surface-alt)", border: "1px solid var(--border)" }}
    >
      {icon && <span style={{ color: accent }}>{icon}</span>}
      <span className="font-display font-semibold text-lg" style={{ color: accent }}>
        {value}
      </span>
      <span className="font-mono uppercase tracking-wide" style={{ color: "var(--text-faint)", fontSize: 9 }}>
        {label}
      </span>
    </div>
  );
}

function BarRow({ label, value, hasData, color, track }) {
  return (
    <div>
      <div className="flex items-center justify-between font-mono uppercase tracking-wide mb-1" style={{ color: "var(--text-faint)", fontSize: 10 }}>
        <span>{label}</span>
        <span style={{ color: hasData ? color : "var(--text-faint)" }}>{hasData ? `${value}%` : "—"}</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: track }}>
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: hasData ? `${value}%` : "0%", backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function LifetimePanel({ lifetime }) {
  const realAcc = lifetime.realTotal > 0 ? Math.round((lifetime.realCorrect / lifetime.realTotal) * 100) : 0;
  const aiAcc = lifetime.aiTotal > 0 ? Math.round((lifetime.aiCorrect / lifetime.aiTotal) * 100) : 0;
  const lifetimeAccuracy = lifetime.totalAnswered > 0 ? Math.round((lifetime.totalCorrect / lifetime.totalAnswered) * 100) : 0;

  return (
    <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "var(--surface-alt)", border: "1px solid var(--border)" }}>
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 font-body mb-4" style={{ color: "var(--text-dim)", fontSize: 13 }}>
        <span>Scans run</span>
        <span className="text-right font-semibold" style={{ color: "var(--text)" }}>
          {lifetime.gamesPlayed}
        </span>
        <span>All-time accuracy</span>
        <span className="text-right font-semibold" style={{ color: "var(--real)" }}>
          {lifetime.totalAnswered > 0 ? `${lifetimeAccuracy}%` : "—"}
        </span>
        <span className="flex items-center gap-1">
          <Trophy size={12} style={{ color: "#ffb020" }} /> Best streak
        </span>
        <span className="text-right font-semibold" style={{ color: "#ffb020" }}>
          {lifetime.bestStreak}
        </span>
      </div>
      <div className="space-y-2.5">
        <BarRow label="Real photos" value={realAcc} hasData={lifetime.realTotal > 0} color="var(--real)" track="var(--real-dim)" />
        <BarRow label="AI slop" value={aiAcc} hasData={lifetime.aiTotal > 0} color="var(--ai)" track="var(--ai-dim)" />
      </div>
    </div>
  );
}
