import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { COLOR_HEX, VALUE_LABEL, type Card, type CardColor } from "@/lib/uno";

type Props = {
  card?: Card;
  size?: "sm" | "md" | "lg";
  variant?: "front" | "back";
  className?: string;
  onClick?: () => void;
  highlight?: boolean;
  dimmed?: boolean;
};

const SIZES = {
  sm: { w: 38, h: 56, fz: 14, corner: 10 },
  md: { w: 50, h: 74, fz: 18, corner: 11 },
  lg: { w: 70, h: 104, fz: 26, corner: 13 },
};

function colorBg(color: CardColor): string {
  if (color === "wild") {
    return "linear-gradient(135deg,#dc2626 0 25%,#f59e0b 25% 50%,#16a34a 50% 75%,#2563eb 75%)";
  }
  return COLOR_HEX[color];
}

export const UnoCard = forwardRef<HTMLButtonElement, Props>(function UnoCard(
  { card, size = "md", variant = "front", className, onClick, highlight, dimmed },
  ref,
) {
  const s = SIZES[size];

  if (variant === "back" || !card) {
    return (
      <div
        className={cn(
          "rounded-md border border-black/40 shadow-[0_1px_3px_oklch(0_0_0/45%)] grid place-items-center select-none",
          className,
        )}
        style={{
          width: s.w,
          height: s.h,
          background: "linear-gradient(135deg,#1a1a1a 0%,#2a0a0a 50%,#1a1a1a 100%)",
        }}
      >
        <div
          className="rounded-full grid place-items-center text-white font-extrabold italic"
          style={{
            width: s.w * 0.7,
            height: s.h * 0.45,
            background: "#dc2626",
            transform: "rotate(-18deg)",
            fontSize: s.fz * 0.7,
            border: "2px solid white",
            letterSpacing: 1,
          }}
        >
          UNO
        </div>
      </div>
    );
  }

  const label = VALUE_LABEL[card.value];
  const bg = colorBg(card.color);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "relative rounded-md border border-black/40 select-none overflow-hidden",
        "transition-all duration-200 ease-out",
        highlight && "-translate-y-2",
        onClick && "active:scale-90 cursor-pointer hover:-translate-y-1",
        dimmed && "opacity-60",
        "shadow-[0_1px_3px_oklch(0_0_0/35%)]",
        className,
      )}
      style={{ width: s.w, height: s.h, background: bg }}
    >
      {/* corner top-left */}
      <span
        className="absolute font-extrabold text-white drop-shadow"
        style={{ top: 2, left: 4, fontSize: s.corner, lineHeight: 1 }}
      >
        {label}
      </span>
      {/* corner bottom-right */}
      <span
        className="absolute font-extrabold text-white drop-shadow"
        style={{ bottom: 2, right: 4, fontSize: s.corner, lineHeight: 1, transform: "rotate(180deg)" }}
      >
        {label}
      </span>
      {/* center oval */}
      <span
        className="absolute left-1/2 top-1/2 grid place-items-center font-extrabold italic"
        style={{
          width: s.w * 0.72,
          height: s.h * 0.5,
          transform: "translate(-50%,-50%) rotate(-22deg)",
          background: "white",
          borderRadius: "50%",
          color: card.color === "wild" ? "#1f2937" : COLOR_HEX[card.color as Exclude<CardColor, "wild">],
          fontSize: s.fz,
          textShadow: "0 1px 0 rgba(0,0,0,.06)",
        }}
      >
        {label}
      </span>
    </button>
  );
});
