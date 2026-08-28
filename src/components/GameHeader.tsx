import { Briefcase, Share2, Power, Flame, Trophy, ChevronRight, Crown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import avatarMe from "@/assets/avatar-me.png";
import { usePlayer } from "@/lib/player-store";

export function GameHeader() {
  const { name, id, coins } = usePlayer();
  return (
    <header className="relative px-3 pt-3 pb-2 text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={avatarMe}
            alt="Seu avatar"
            width={48}
            height={48}
            className="h-12 w-12 rounded-full border-2 border-gold object-cover"
          />
          <div className="leading-tight">
            <div className="font-bold text-sm flex items-center gap-1">
              <span className="opacity-80">🍖🍖</span> {name}
            </div>
            <div className="text-[10px] opacity-70">ID:{id}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-white/90">
          <button aria-label="Inventário"><Briefcase className="h-5 w-5" /></button>
          <button aria-label="Compartilhar"><Share2 className="h-5 w-5" /></button>
          <Link to="/" aria-label="Sair"><Power className="h-5 w-5" /></Link>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-gold" />
            <span>{coins}</span>
          </div>
          <button className="flex items-center gap-1 text-sm font-semibold bg-white/10 rounded-full px-2 py-0.5">
            <Flame className="h-4 w-4 text-orange-400" />
            <span>50+</span>
            <ChevronRight className="h-3 w-3 opacity-70" />
          </button>
        </div>
        <div className="flex items-center gap-1 text-sm font-semibold">
          <Crown className="h-4 w-4 text-gold" />
          <span>1</span>
        </div>
      </div>
    </header>
  );
}
