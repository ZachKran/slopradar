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
      setDrag({ x: dx, y: dy * 0.3 });
    },
    [disabled, dragging]
  );

  const onPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    settle();
  }, [dragging, settle]);

  const onPointerCancel = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    reset();
  }, [dragging, reset]);

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
