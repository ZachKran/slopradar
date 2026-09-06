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
 * The drag position is written straight to the bound element's own
 * `style.transform` (throttled to one write per animation frame) instead of
 * going through React state. Piping every pointermove through setState was
 * re-rendering the whole app on every touch event — on a big component tree
 * that's more re-render work than a phone can keep up with per frame, which
 * is what read as choppy dragging. `dragging` is still real React state
 * since it only flips twice per gesture (start/end), not once per frame.
 * Callers that need the live position (e.g. to fade in a "REAL"/"AI" badge)
 * get it via the onFrame(dx, dy) callback, which they should also apply by
 * mutating their own element directly rather than via setState.
 *
 * onCommit("left" | "right") fires once the drag clears THRESHOLD.
 * onTap() fires when a press moves less than TAP_THRESHOLD in either axis.
 */
export function useSwipeGesture({ disabled, onCommit, onTap, onFrame }) {
  const [dragging, setDragging] = useState(false);
  const elRef = useRef(null);
  const start = useRef({ x: 0, y: 0 });
  const delta = useRef({ x: 0, y: 0 });
  const rafId = useRef(null);
  const wheelDx = useRef(0);
  const wheelTimer = useRef(null);

  const paint = useCallback(
    (dx, dy, animate) => {
      const el = elRef.current;
      if (el) {
        const rotation = Math.max(-14, Math.min(14, dx / 14));
        el.style.transition = animate ? "transform 0.32s cubic-bezier(0.22,1,0.36,1)" : "none";
        el.style.transform = `translate(${dx}px, ${dy * 0.3}px) rotate(${rotation}deg)`;
      }
      onFrame?.(dx, dy);
    },
    [onFrame]
  );

  const cancelFrame = useCallback(() => {
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
  }, []);

  const scheduleFrame = useCallback(() => {
    if (rafId.current != null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      paint(delta.current.x, delta.current.y, false);
    });
  }, [paint]);

  const reset = useCallback(() => {
    cancelFrame();
    delta.current = { x: 0, y: 0 };
    paint(0, 0, true);
  }, [cancelFrame, paint]);

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
      scheduleFrame();
    },
    [disabled, dragging, scheduleFrame]
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    cancelFrame();
    setDragging(false);
    settle();
  }, [dragging, settle, cancelFrame]);

  const onPointerCancel = useCallback(() => {
    if (!dragging) return;
    cancelFrame();
    setDragging(false);
    reset();
  }, [dragging, reset, cancelFrame]);

  useEffect(() => cancelFrame, [cancelFrame]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    function onWheel(e) {
      if (disabled) return;
      e.preventDefault();
      wheelDx.current -= e.deltaX;
      setDragging(true);
      delta.current = { x: wheelDx.current, y: 0 };
      paint(wheelDx.current, 0, false);

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
  }, [disabled, settle, paint]);

  return {
    ref: elRef,
    dragging,
    reset,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
