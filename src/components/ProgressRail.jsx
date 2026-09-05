// Segmented signal-strength style progress across the deck, replacing a
// plain dot tracker — each bar fills green/orange once answered.
export default function ProgressRail({ deck, history, currentIndex, accuracy, hasAnswered }) {
  return (
    <div className="w-full px-4 pb-3" style={{ maxWidth: 460 }}>
      <div className="flex items-center gap-1 mb-2">
        {deck.map((item, i) => {
          const h = i < history.length ? history[i] : null;
          const isCurrent = i === currentIndex;
          let color = "var(--border-strong)";
          if (h) color = h.correct ? "var(--real)" : "var(--ai)";
          else if (isCurrent) color = "var(--accent)";
          return (
            <div
              key={item.id}
              className="flex-1 rounded-full transition-all duration-300"
              style={{ height: isCurrent ? 5 : 3, backgroundColor: color, opacity: h || isCurrent ? 1 : 0.5 }}
            />
          );
        })}
      </div>
      <p className="font-mono text-center" style={{ color: "var(--text-faint)", fontSize: 11, letterSpacing: "0.05em" }}>
        {Math.min(currentIndex + 1, deck.length)} / {deck.length}
        <span style={{ color: "var(--text-faint)" }}> · ACCURACY </span>
        <span style={{ color: "var(--real)", fontWeight: 600 }}>{hasAnswered ? `${accuracy}%` : "—"}</span>
      </p>
    </div>
  );
}
