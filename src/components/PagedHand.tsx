import { useEffect, useRef, useState } from "react";
import { UnoCard } from "@/components/UnoCard";
import type { Card } from "@/lib/uno";
import { cn } from "@/lib/utils";

type Props = {
  cards: Card[];
  pageSize?: number;
  isPlayable: (c: Card) => boolean;
  canInteract: boolean;
  onCardClick: (c: Card) => void;
  registerRef: (id: string, el: HTMLButtonElement | null) => void;
};

const CARD_W = 38; // sm width
const GAP = 4;
const STACK_W = 56;
const OUTER_PAD = 8;

export function PagedHand({
  cards,
  pageSize: pageSizeProp,
  isPlayable,
  canInteract,
  onCardClick,
  registerRef,
}: Props) {
  // Cartas jogáveis primeiro
  const sorted = [...cards].sort((a, b) => {
    const pa = isPlayable(a) ? 0 : 1;
    const pb = isPlayable(b) ? 0 : 1;
    return pa - pb;
  });

  const outerRef = useRef<HTMLDivElement | null>(null);
  const [outerWidth, setOuterWidth] = useState(0);

  useEffect(() => {
    if (pageSizeProp) return;
    const el = outerRef.current;
    if (!el) return;
    const compute = () => setOuterWidth(el.clientWidth);
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageSizeProp]);

  function fits(width: number) {
    const w = Math.max(0, width);
    return Math.max(1, Math.floor((w + GAP) / (CARD_W + GAP)));
  }

  let pageSize: number;
  if (pageSizeProp) {
    pageSize = pageSizeProp;
  } else if (outerWidth === 0) {
    pageSize = cards.length || 1;
  } else {
    const availableNoStacks = outerWidth - OUTER_PAD;
    const noStackFits = fits(availableNoStacks);
    if (noStackFits >= cards.length) {
      pageSize = cards.length;
    } else {
      const availableWithStacks = availableNoStacks - 2 * (STACK_W + GAP);
      pageSize = fits(availableWithStacks);
    }
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const [page, setPage] = useState(0);
  const prevPageRef = useRef(0);
  const direction = page >= prevPageRef.current ? "right" : "left";
  useEffect(() => { prevPageRef.current = page; }, [page]);

  useEffect(() => {
    if (page > totalPages - 1) setPage(totalPages - 1);
  }, [totalPages, page]);

  const start = page * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  const showStacks = cards.length > pageSize;

  return (
    <div ref={outerRef} className="flex items-center gap-1 h-full w-full px-1">
      {showStacks && (
        <Stack
          cards={sorted.slice(0, start)}
          side="left"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        />
      )}

      <div className="flex-1 min-w-0 flex items-center justify-center gap-1 h-full overflow-visible">
        {visible.map((c, i) => {
          const playable = isPlayable(c);
          const animName = direction === "right" ? "hand-in-from-right" : "hand-in-from-left";
          return (
            <div
              key={`${page}-${c.id}`}
              style={{
                animation: `${animName} 280ms cubic-bezier(0.22,1,0.36,1) both`,
                animationDelay: `${i * 35}ms`,
              }}
            >
              <UnoCard
                ref={(el) => registerRef(c.id, el)}
                card={c}
                size="sm"
                onClick={canInteract && playable ? () => onCardClick(c) : undefined}
                highlight={canInteract && playable}
                dimmed={!playable && canInteract}
                className={cn(!playable && canInteract && "opacity-60")}
              />
            </div>
          );
        })}
      </div>

      {showStacks && (
        <Stack
          cards={sorted.slice(start + visible.length)}
          side="right"
          disabled={page >= totalPages - 1}
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      )}
    </div>
  );
}

const MAX_LAYERS = 5;

function Stack({
  cards,
  side,
  disabled,
  onClick,
}: {
  cards: Card[];
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const count = cards.length;
  const hasAny = count > 0;
  const layerCards = cards.slice(-Math.min(MAX_LAYERS, Math.max(1, count)));

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !hasAny}
      aria-label={side === "left" ? "página anterior" : "próxima página"}
      className={cn(
        "relative shrink-0 h-full w-14 grid place-items-center transition",
        hasAny && !disabled ? "active:scale-95" : "opacity-30 pointer-events-none"
      )}
    >
      <div className="relative h-14 w-10">
        {layerCards.map((c, i) => {
          const offset = i * 3;
          const dx = side === "left" ? -offset : offset;
          return (
            <div
              key={c.id}
              style={{ transform: `translate(${dx}px, ${-offset}px)`, zIndex: i }}
              className="absolute inset-0"
            >
              <UnoCard card={c} size="sm" />
            </div>
          );
        })}
        {hasAny && (
          <span
            style={{ zIndex: MAX_LAYERS + 1 }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-extrabold text-white bg-secondary/90 rounded-full px-1.5 leading-tight border border-white/50"
          >
            {count}
          </span>
        )}
      </div>
    </button>
  );
}
