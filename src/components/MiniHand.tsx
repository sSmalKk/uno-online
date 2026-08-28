export function MiniHand({ count }: { count: number }) {
  if (count <= 0) return null;
  const MAX = 5;
  const shown = Math.min(MAX, count);
  // miniatura de carta UNO (proporção 1:1.4 aproximada)
  const W = 16;
  const H = 22;
  const STEP = 5;
  return (
    <div
      className="relative shrink-0"
      style={{ width: W + (shown - 1) * STEP, height: H + (shown - 1) * 2 }}
    >
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-[3px] border border-black/50 shadow-[0_1px_2px_oklch(0_0_0/50%)] overflow-hidden grid place-items-center"
          style={{
            width: W,
            height: H,
            left: i * STEP,
            top: i * 2,
            zIndex: i,
            background: "linear-gradient(135deg,#1a1a1a 0%,#2a0a0a 60%,#1a1a1a 100%)",
          }}
        >
          <span
            className="text-white italic font-extrabold"
            style={{ fontSize: 6, transform: "rotate(-20deg)", letterSpacing: 0.5 }}
          >
            UNO
          </span>
        </div>
      ))}
      <span
        style={{ zIndex: MAX + 1 }}
        className="absolute -bottom-2 -right-2 text-[8px] font-extrabold text-white bg-secondary/90 rounded-full px-1 leading-tight border border-white/50"
      >
        {count}
      </span>
    </div>
  );
}
