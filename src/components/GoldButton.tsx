import { cn } from "@/lib/utils";
import { forwardRef, ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: "sm" | "md" | "lg";
};

export const GoldButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, size = "md", children, ...rest }, ref) => {
    const sizes = {
      sm: "h-9 px-4 text-sm",
      md: "h-12 px-8 text-base",
      lg: "h-14 px-10 text-lg",
    };
    return (
      <button
        ref={ref}
        {...rest}
        className={cn(
          "rounded-full font-extrabold text-primary-foreground",
          "bg-gradient-gold border-2 border-[oklch(0.55_0.18_40)]",
          "shadow-gold active:translate-y-1 active:shadow-gold-sm transition-all",
          "disabled:opacity-60 disabled:active:translate-y-0",
          sizes[size],
          className
        )}
      >
        {children}
      </button>
    );
  }
);
GoldButton.displayName = "GoldButton";
