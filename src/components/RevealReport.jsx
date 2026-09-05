import { Check, X } from "lucide-react";

function Column({ label, color, cards }) {
  return (
    <div>
      <p className="font-mono uppercase text-center mb-2" style={{ color, fontSize: 11, letterSpacing: "0.15em" }}>
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cards.map((h, i) => (
          <div
            key={i}
            className="relative rounded-lg overflow-hidden"
            style={{ border: `1.5px solid ${color}66`, backgroundColor: "var(--surface-alt)", aspectRatio: "1 / 1" }}
          >
            <img
              src={h.item.url}
              alt={h.item.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span
              className="absolute top-1 right-1 rounded-full flex items-center justify-center"
              style={{ width: 18, height: 18, backgroundColor: "rgba(5,8,10,0.85)" }}
            >
              {h.correct ? (
                <Check size={11} style={{ color: "var(--real)" }} strokeWidth={3.5} />
              ) : (
                <X size={11} style={{ color: "var(--ai)" }} strokeWidth={3.5} />
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RevealReport({ history }) {
  const slop = history.filter((h) => h.item.isAI);
  const real = history.filter((h) => !h.item.isAI);
  return (
    <div className="mb-5">
      <p className="font-mono uppercase text-center mb-3" style={{ color: "var(--text-faint)", fontSize: 10, letterSpacing: "0.2em" }}>
        Full Scan Log
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Column label="Slop" color="var(--ai)" cards={slop} />
        <Column label="Real" color="var(--real)" cards={real} />
      </div>
    </div>
  );
}
