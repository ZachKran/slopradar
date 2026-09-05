import { Check, X } from "lucide-react";
import AIIcon from "./AIIcon.jsx";
import RealIcon from "./RealIcon.jsx";

const CORNER = ({ style }) => (
  <div
    className="absolute"
    style={{ width: 22, height: 22, borderColor: "var(--accent)", opacity: 0.85, ...style }}
  />
);

function TargetFrame() {
  const t = "2px solid var(--accent)";
  return (
    <>
      <CORNER style={{ top: 10, left: 10, borderTop: t, borderLeft: t, borderRadius: "6px 0 0 0" }} />
      <CORNER style={{ top: 10, right: 10, borderTop: t, borderRight: t, borderRadius: "0 6px 0 0" }} />
      <CORNER style={{ bottom: 10, left: 10, borderBottom: t, borderLeft: t, borderRadius: "0 0 0 6px" }} />
      <CORNER style={{ bottom: 10, right: 10, borderBottom: t, borderRight: t, borderRadius: "0 0 6px 0" }} />
    </>
  );
}

function VerdictTag({ side, dragX, dragging }) {
  const isReal = side === "right";
  const progress = Math.min(1, Math.abs(dragX) / 110);
  const visible = isReal ? dragX > 15 : dragX < -15;
  return (
    <div
      className="absolute top-4 font-display font-semibold flex items-center gap-1.5 pointer-events-none"
      style={{
        [isReal ? "right" : "left"]: 14,
        fontSize: 13,
        padding: "6px 10px",
        borderRadius: 8,
        color: isReal ? "var(--real)" : "var(--ai)",
        border: `2px solid ${isReal ? "var(--real)" : "var(--ai)"}`,
        backgroundColor: "rgba(5,8,10,0.85)",
        transform: `rotate(${isReal ? -6 : 6}deg)`,
        opacity: visible ? Math.min(1, progress * 1.4) : 0,
        transition: dragging ? "none" : "opacity 0.15s ease-out",
      }}
    >
      {isReal ? <RealIcon size={15} /> : <AIIcon size={15} />}
      {isReal ? "REAL" : "SLOP"}
    </div>
  );
}

export default function ScanCard({
  item,
  isTop,
  offset,
  transform,
  transition,
  dragX = 0,
  dragging = false,
  phase,
  feedback,
  cardRef,
  bind,
}) {
  const borderColor =
    isTop && phase === "feedback" && feedback ? (feedback.correct ? "var(--real)" : "var(--ai)") : "var(--border-strong)";

  return (
    <div
      ref={isTop ? cardRef : undefined}
      className="absolute inset-0 rounded-2xl overflow-hidden no-callout"
      style={{
        backgroundColor: "var(--surface)",
        border: `1.5px solid ${borderColor}`,
        boxShadow: isTop ? "0 20px 50px -16px rgba(0,0,0,0.7)" : "0 8px 24px -12px rgba(0,0,0,0.5)",
        transform,
        transition,
        touchAction: "none",
        cursor: isTop ? (dragging ? "grabbing" : "grab") : "default",
      }}
      {...(isTop ? bind : {})}
    >
      <div className="absolute inset-3 rounded-xl overflow-hidden" style={{ backgroundColor: "#090c0d" }}>
        <img
          src={item.url}
          alt={item.title}
          draggable={false}
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            e.currentTarget.parentElement.style.background = "linear-gradient(160deg,#0d1416,#1a2224)";
          }}
        />
        <div className="absolute inset-0 pointer-events-none bg-scanlines" />

        {isTop && <TargetFrame />}

        {isTop && (
          <>
            <VerdictTag side="right" dragX={dragX} dragging={dragging} />
            <VerdictTag side="left" dragX={dragX} dragging={dragging} />
          </>
        )}

        {isTop && phase === "feedback" && feedback && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center blip-in sweep-flash"
            style={{ backgroundColor: feedback.correct ? "rgba(15,40,30,0.88)" : "rgba(46,20,14,0.88)" }}
          >
            {feedback.correct ? (
              <Check size={38} style={{ color: "var(--real)" }} strokeWidth={3} />
            ) : (
              <X size={38} style={{ color: "var(--ai)" }} strokeWidth={3} />
            )}
            <p
              className="font-mono font-semibold uppercase tracking-widest mt-2"
              style={{ fontSize: 13, color: feedback.correct ? "var(--real)" : "var(--ai)" }}
            >
              {feedback.correct ? "Confirmed" : "Misread"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
