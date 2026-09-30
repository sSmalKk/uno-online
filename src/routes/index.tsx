import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ScreenProvider, useScreen } from "@/lib/screen-store";
import { Lobby } from "@/components/screens/Lobby";
import { Selecao } from "@/components/screens/Selecao";
import { Regras } from "@/components/screens/Regras";
import { Mesa } from "@/components/screens/Mesa";
import { SalaEntry } from "@/components/screens/SalaEntry";
import { WaitingRoom } from "@/components/screens/WaitingRoom";
import { MesaOnline } from "@/components/screens/MesaOnline";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UNO — Jogo" },
      { name: "description", content: "Jogue UNO nos modos Batalha, Livre e Sala online por código." },
    ],
  }),
  component: GameRoot,
});

function GameRoot() {
  return (
    <ScreenProvider>
      <PersistentBack />
      <ScreenSwitch />
    </ScreenProvider>
  );
}

function PersistentBack() {
  const { screen, go } = useScreen();
  const handleBack = () => {
    switch (screen) {
      case "regras": return go("selecao");
      case "selecao":
      case "sala-entry":
      case "waiting":
      case "mesa":
      case "mesa-online":
        return go("lobby", { roomCode: null, mode: "batalha" });
      default:
        return; // já está na home
    }
  };
  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Voltar"
      className="absolute top-3 left-3 z-50 h-9 w-9 rounded-full bg-gradient-gold border-2 border-[oklch(0.55_0.18_40)] shadow-gold-sm grid place-items-center text-primary-foreground active:translate-y-px"
    >
      <ArrowLeft className="h-5 w-5" strokeWidth={3} />
    </button>
  );
}

function ScreenSwitch() {
  const { screen } = useScreen();
  switch (screen) {
    case "selecao": return <Selecao />;
    case "regras": return <Regras />;
    case "mesa": return <Mesa />;
    case "sala-entry": return <SalaEntry />;
    case "waiting": return <WaitingRoom />;
    case "mesa-online": return <MesaOnline />;
    case "lobby":
    default: return <Lobby />;
  }
}
