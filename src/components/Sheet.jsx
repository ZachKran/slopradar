import { X } from "lucide-react";

// Mobile-native bottom sheet used for every overlay in the app (help, stats,
// privacy) instead of a centered dialog box — one tap on the scrim or the
// close button dismisses it.
export default function Sheet({ open, onClose, eyebrow, title, children, footer, maxHeight = "86dvh" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center scrim-in"
      style={{ backgroundColor: "rgba(2,4,5,0.72)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="sheet-up w-full flex flex-col"
        style={{
          maxWidth: 480,
          maxHeight,
          backgroundColor: "var(--surface)",
          borderTop: "1px solid var(--border-strong)",
          borderLeft: "1px solid var(--border-strong)",
          borderRight: "1px solid var(--border-strong)",
          borderRadius: "20px 20px 0 0",
          boxShadow: "0 -24px 60px -20px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center pt-2.5 pb-1 shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "var(--border-strong)" }} />
        </div>

        <div className="flex items-start justify-between px-6 pt-2 pb-4 shrink-0">
          <div>
            {eyebrow && (
              <p className="font-mono uppercase mb-1" style={{ color: "var(--accent)", fontSize: 10, letterSpacing: "0.2em" }}>
                {eyebrow}
              </p>
            )}
            {title && (
              <h2 className="font-display font-semibold text-xl" style={{ color: "var(--text)" }}>
                {title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full flex items-center justify-center shrink-0"
            style={{ width: 34, height: 34, backgroundColor: "var(--surface-alt)", color: "var(--text-dim)" }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-4">{children}</div>

        {footer && (
          <div
            className="px-6 pt-3 shrink-0"
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))", borderTop: "1px solid var(--border)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
