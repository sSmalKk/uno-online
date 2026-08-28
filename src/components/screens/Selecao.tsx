import { HelpCircle, FileText, Trophy, Check } from "lucide-react";
import { useState } from "react";
import { GoldButton } from "@/components/GoldButton";
import swords from "@/assets/swords.png";
import coin from "@/assets/coin.png";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/lib/player-store";
import { useScreen, type Mode } from "@/lib/screen-store";

type Ingresso = 100 | 300 | 600;

export function Selecao() {
  const { coins } = usePlayer();
  const { mode, ingresso, go } = useScreen();
  const [localMode, setLocalMode] = useState<Mode>(mode);
  const [localIngresso, setLocalIngresso] = useState<Ingresso>(ingresso as Ingresso);

  const canPlay = localMode === "livre" || coins >= localIngresso;

  function start() {
    if (!canPlay) return;
    go("mesa", { mode: localMode, ingresso: localIngresso });
  }

  return (
    <>
      <UnoLogo className="absolute left-1/2 -translate-x-1/2 -top-10 z-10 pointer-events-none" />

      <div className="shrink-0 h-[72px] pt-3 px-3 flex items-start justify-between gap-2">
        <div className="h-10 w-10" />
        <button onClick={() => go("regras")} className="h-10 w-10 rounded-full bg-gradient-to-b from-sky-300 to-sky-500 border-2 border-sky-700 shadow-gold-sm grid place-items-center text-white">
          <HelpCircle className="h-5 w-5" />
        </button>
        <div className="flex-1" />
        <button className="h-10 w-10 rounded-full bg-gradient-to-b from-emerald-300 to-emerald-500 border-2 border-emerald-700 shadow-gold-sm grid place-items-center text-white">
          <FileText className="h-5 w-5" />
        </button>
        <button className="h-10 w-10 rounded-full bg-gradient-gold border-2 border-[oklch(0.55_0.18_40)] shadow-gold-sm grid place-items-center text-primary-foreground">
          <Trophy className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 px-3 overflow-hidden">
        <div className="h-full rounded-2xl bg-gradient-card-light p-3 flex flex-col gap-2">
          <div>
            <h2 className="text-secondary font-bold text-sm mb-1">Modo de seleção</h2>
            <p className="text-[10px] leading-snug text-secondary/80 bg-purple-soft/30 rounded-lg p-2">
              No Modo Batalha, o primeiro a terminar recebe 95% das moedas, e todos recebem 2 Pontos de UNO.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
            <ModeCard active={localMode === "batalha"} onClick={() => setLocalMode("batalha")} label="Batalha" icon={swords} accent="gold" />
            <ModeCard active={localMode === "livre"} onClick={() => setLocalMode("livre")} label="Livre" icon={coin} accent="purple" />
          </div>

          <div>
            <h3 className="text-secondary font-bold text-sm mb-1">Selecione o ingresso</h3>
            <div className="grid grid-cols-3 gap-2">
              {([100, 300, 600] as Ingresso[]).map((v) => (
                <IngressoPill key={v} value={v} active={localIngresso === v} onClick={() => setLocalIngresso(v)} />
              ))}
            </div>
            {localMode === "batalha" && coins < localIngresso && (
              <p className="mt-1 text-[10px] text-destructive">Moedas insuficientes ({coins})</p>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 flex justify-center items-center py-2">
        <GoldButton size="md" onClick={start} disabled={!canPlay}>
          Abrir
        </GoldButton>
      </div>
    </>
  );
}

function UnoLogo({ className }: { className?: string }) {
  return (
    <div className={cn("h-24 w-24 grid place-items-center drop-shadow-2xl", className)}>
      <div
        className="h-20 w-20 rounded-full grid place-items-center"
        style={{
          background: "radial-gradient(circle at 30% 30%, #f59e0b 0%, #dc2626 70%)",
          border: "4px solid white",
          boxShadow: "0 6px 20px rgba(0,0,0,.45), inset 0 0 0 6px #b91c1c",
        }}
      >
        <span
          className="font-extrabold italic text-white"
          style={{ fontSize: 24, letterSpacing: 2, transform: "rotate(-14deg)", textShadow: "0 2px 0 #7f1d1d" }}
        >
          UNO
        </span>
      </div>
    </div>
  );
}

function ModeCard({
  active, onClick, label, icon, accent,
}: { active: boolean; onClick: () => void; label: string; icon: string; accent: "gold" | "purple" }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-2xl border-4 transition-all p-2 grid place-items-center min-h-0",
        active
          ? accent === "gold"
            ? "bg-gradient-gold border-[oklch(0.55_0.18_40)] shadow-gold-sm"
            : "bg-gradient-purple-card border-purple-soft shadow-purple"
          : "bg-white/60 border-purple-soft/40"
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <img src={icon} alt="" width={120} height={120} className="h-12 w-12 object-contain" loading="lazy" />
        <span className={cn("font-extrabold text-xs", active ? "text-white drop-shadow" : "text-secondary")}>
          {label}
        </span>
      </div>
      {active && (
        <span className="absolute bottom-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-gradient-gold border border-[oklch(0.55_0.18_40)] text-primary-foreground">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function IngressoPill({
  value, active, onClick,
}: { value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-9 rounded-full border-2 flex items-center justify-center gap-1 font-extrabold text-xs transition-all",
        active
          ? "bg-gradient-gold border-[oklch(0.55_0.18_40)] text-primary-foreground shadow-gold-sm"
          : "bg-purple-soft/40 border-purple-soft/60 text-secondary"
      )}
    >
      <img src={coin} alt="" width={32} height={32} className="h-4 w-4" loading="lazy" />
      {value}
      {active && <Check className="h-3 w-3 ml-0.5" strokeWidth={3} />}
    </button>
  );
}
