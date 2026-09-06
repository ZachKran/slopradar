import { useCallback, useEffect, useRef, useState } from "react";

const THRESHOLD = 110;
const TAP_THRESHOLD = 6;

/**
 * Unified drag-to-classify gesture for mouse, pen, and touch, plus trackpad
 * two-finger swipes. Pointer Events cover mouse/pen/touch in one code path;
 * `touch-action: none` on the bound element (set by the caller) is what
 * stops the browser from scrolling during a touch drag, so no manual
 * preventDefault gymnastics are needed there. Wheel events are the one
 * exception: browsers attach React's onWheel as a passive listener, so
 * preventDefault silently no-ops unless the listener is bound natively —
 * this hook does that itself via the returned ref.
 *
 * onCommit("left" | "right") fires once the drag clears THRESHOLD.
 * onTap() fires when a press moves less than TAP_THRESHOLD in either axis.
 */
export function useSwipeGesture({ disabled, onCommit, onTap }) {
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const elRef = useRef(null);
  const start = useRef({ x: 0, y: 0 });
  const delta = useRef({ x: 0, y: 0 });
  const wheelDx = useRef(0);
  const wheelTimer = useRef(null);
  const rafId = useRef(null);

  // Touch fires pointermove far more often than the screen can repaint, so
  // setState-per-event was queuing more React re-renders than a mobile
  // device can keep up with, which read as choppy dragging. Mouse/pen
  // dragging isn't affected by this — it's low-frequency enough already —
  // so only touch input is coalesced to one state update per animation
  // frame here.
  const scheduleDrag = useCallback(() => {
    if (rafId.current != null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      setDrag({ x: delta.current.x, y: delta.current.y * 0.3 });
    });
  }, []);

  const reset = useCallback(() => {
    delta.current = { x: 0, y: 0 };
    setDrag({ x: 0, y: 0 });
  }, []);

  const settle = useCallback(() => {
    const { x, y } = delta.current;
    if (Math.abs(x) < TAP_THRESHOLD && Math.abs(y) < TAP_THRESHOLD) {
      reset();
      onTap?.();
      return;
    }
    if (Math.abs(x) > THRESHOLD) {
      onCommit?.(x > 0 ? "right" : "left");
    } else {
      reset();
    }
  }, [onCommit, onTap, reset]);

  const onPointerDown = useCallback(
    (e) => {
      if (disabled) return;
      start.current = { x: e.clientX, y: e.clientY };
      delta.current = { x: 0, y: 0 };
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDragging(true);
    },
    [disabled]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (disabled || !dragging) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      delta.current = { x: dx, y: dy };
      if (e.pointerType === "touch") {
        scheduleDrag();
      } else {
        setDrag({ x: dx, y: dy * 0.3 });
      }
    },
    [disabled, dragging, scheduleDrag]
  );

  const cancelScheduledDrag = useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    cancelScheduledDrag();
    setDragging(false);
    settle();
  }, [dragging, settle, cancelScheduledDrag]);

  const onPointerCancel = useCallback(() => {
    if (!dragging) return;
    cancelScheduledDrag();
    setDragging(false);
    reset();
  }, [dragging, reset, cancelScheduledDrag]);

  useEffect(() => () => cancelScheduledDrag(), [cancelScheduledDrag]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    function onWheel(e) {
      if (disabled) return;
      e.preventDefault();
      wheelDx.current -= e.deltaX;
      setDragging(true);
      setDrag({ x: wheelDx.current, y: 0 });

      clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        setDragging(false);
        const x = wheelDx.current;
        wheelDx.current = 0;
        delta.current = { x, y: 0 };
        settle();
      }, 150);
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(wheelTimer.current);
    };
  }, [disabled, settle]);

  return {
    ref: elRef,
    drag,
    dragging,
    reset,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
