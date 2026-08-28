import type { Dispatch } from "react";
import type { Action } from "@/lib/game-reducer";
import { HUMAN } from "@/lib/game-reducer";

/**
 * DEBUG: botão para adicionar cartas à mão do humano.
 * Para remover: apague este arquivo e a importação em Mesa.tsx.
 */
export function DebugAddCardsButton({
  dispatch,
  count = 10,
  player = HUMAN,
}: {
  dispatch: Dispatch<Action>;
  count?: number;
  player?: number;
}) {
  return (
    <button
      type="button"
      onClick={() => dispatch({ type: "DEBUG_ADD_CARDS", player, count })}
      className="absolute bottom-20 right-2 z-50 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 active:translate-y-0.5 text-white text-[11px] font-bold px-3 py-1.5 shadow-lg border-2 border-white/60"
    >
      TEST +{count}
    </button>
  );
}
