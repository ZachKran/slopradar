import { X } from "lucide-react";

export default function ZoomOverlay({ card, onClose }) {
  if (!card) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 fade-in"
      style={{ backgroundColor: "rgba(2,4,5,0.95)", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      onClick={onClose}
    >
      <img
        src={card.url}
        alt={card.title}
        className="rounded-xl"
        style={{ maxWidth: "92vw", maxHeight: "80dvh", objectFit: "contain", boxShadow: "0 20px 60px -10px rgba(0,0,0,0.7)" }}
      />
      <button
        onClick={onClose}
        aria-label="Close zoomed image"
        className="absolute rounded-full flex items-center justify-center"
        style={{
          top: "calc(1.25rem + env(safe-area-inset-top))",
          right: "1.25rem",
          width: 38,
          height: 38,
          backgroundColor: "var(--surface-alt)",
          border: "1px solid var(--border-strong)",
          color: "var(--text)",
        }}
      >
        <X size={18} strokeWidth={2.5} />
      </button>
      <p className="absolute bottom-6 left-0 right-0 text-center font-mono" style={{ color: "var(--text-faint)", fontSize: 11 }}>
        Tap anywhere to close
      </p>
    </div>
  );
}
