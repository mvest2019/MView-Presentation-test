"use client";

import { useRef, useState, type PointerEvent, type KeyboardEvent } from "react";

/*
 * Drag-by-handle for the floating map cards.
 *
 * Shared because there are two of them and the fiddly parts — folding the drag
 * offset into the same transform as the horizontal centring, and clamping
 * against a card whose height changes as sections open — are worth getting
 * right once.
 */

/** Resting gap from the bottom of the map, matching the cards' `bottom-6`. */
const RESTING_GAP = 24;
const EDGE_MARGIN = 8;
const KEY_STEP = 12;

export function useDraggableCard() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    fromX: number;
    fromY: number;
  } | null>(null);

  /** Keeps the card inside the map, whatever the drag asks for. */
  const clamp = (next: { x: number; y: number }) => {
    const card = cardRef.current;
    const parent = card?.offsetParent as HTMLElement | null;
    if (!card || !parent) return next;

    const cardBox = card.getBoundingClientRect();
    const parentBox = parent.getBoundingClientRect();

    const maxX = Math.max(
      0,
      (parentBox.width - cardBox.width) / 2 - EDGE_MARGIN,
    );
    const maxUp = Math.max(
      0,
      parentBox.height - cardBox.height - RESTING_GAP - EDGE_MARGIN,
    );

    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(RESTING_GAP - EDGE_MARGIN, Math.max(-maxUp, next.y)),
    };
  };

  const handleProps = {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": "Move this card",
    title: "Drag to move",

    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      event.preventDefault();
      dragRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        fromX: offset.x,
        fromY: offset.y,
      };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capture is an optimisation; the drag still tracks without it.
      }
    },

    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const start = dragRef.current;
      if (!start) return;
      setOffset(
        clamp({
          x: start.fromX + (event.clientX - start.pointerX),
          y: start.fromY + (event.clientY - start.pointerY),
        }),
      );
    },

    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      dragRef.current = null;
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Already released.
      }
    },

    onPointerCancel(event: PointerEvent<HTMLDivElement>) {
      dragRef.current = null;
      try {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      } catch {
        // Already released.
      }
    },

    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key === "Home") {
        event.preventDefault();
        setOffset({ x: 0, y: 0 });
        return;
      }
      const moves: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -KEY_STEP, y: 0 },
        ArrowRight: { x: KEY_STEP, y: 0 },
        ArrowUp: { x: 0, y: -KEY_STEP },
        ArrowDown: { x: 0, y: KEY_STEP },
      };
      const move = moves[event.key];
      if (!move) return;
      event.preventDefault();
      setOffset((current) =>
        clamp({ x: current.x + move.x, y: current.y + move.y }),
      );
    },

    className:
      "flex cursor-grab touch-none justify-center py-[7px] active:cursor-grabbing focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mv-green-deep",
  };

  return {
    cardRef,
    handleProps,
    /** The -50% is the horizontal centring; the offset rides along with it. */
    style: {
      transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)`,
    },
  };
}
