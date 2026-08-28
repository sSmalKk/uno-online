import { UnoCard } from "@/components/UnoCard";
import { useScreen } from "@/lib/screen-store";

function Section({ title }: { title: string }) {
  return (
    <div className="bg-purple-soft/30 rounded-lg px-2 py-1">
      <h3 className="text-secondary font-bold text-xs">○ {title}</h3>
    </div>
  );
}

export function Regras() {
  const { go: _go } = useScreen();
  void _go;
  return (
    <>
      <div className="shrink-0 h-[60px]" />

      <div className="flex-1 min-h-0 px-3 pb-3">
        <div className="h-full rounded-2xl bg-gradient-card-light p-3 overflow-y-auto space-y-2 text-xs">
          <h2 className="text-center text-secondary font-extrabold text-sm">Jogabilidade</h2>

          <Section title="Conexões" />
          <p className="text-secondary/80 leading-snug">
            1. As cartas devem ser da mesma cor ou do mesmo número/símbolo da carta do topo do descarte.<br />
            2. Cartas curinga (★ e +4) podem ser jogadas a qualquer momento.
          </p>
          <div className="flex justify-around items-center">
            <div className="flex items-center gap-1">
              <UnoCard card={{ id: "r1", color: "red", value: "3" }} size="sm" />
              <UnoCard card={{ id: "r2", color: "red", value: "7" }} size="sm" />
              <UnoCard card={{ id: "r3", color: "yellow", value: "7" }} size="sm" />
            </div>
            <div className="flex items-center gap-1">
              <UnoCard card={{ id: "r4", color: "blue", value: "skip" }} size="sm" />
              <UnoCard card={{ id: "r5", color: "wild", value: "wild" }} size="sm" />
            </div>
          </div>

          <Section title="Comprar Carta" />
          <p className="text-secondary/80 leading-snug">
            Sem carta para jogar? Compre 1 do baralho. Se for jogável, você pode jogá-la; caso contrário, passa a vez.
          </p>

          <Section title="Cartas Especiais" />
          <p className="text-secondary/80 leading-snug">
            <b>+2:</b> próximo jogador compra 2 e perde a vez.<br />
            <b>⊘ Pular:</b> próximo jogador perde a vez.<br />
            <b>⇄ Inverter:</b> inverte o sentido da rodada.<br />
            <b>★ Curinga:</b> você escolhe a próxima cor.<br />
            <b>+4 Curinga:</b> escolhe a cor e o próximo compra 4.
          </p>

          <Section title="UNO!" />
          <p className="text-secondary/80 leading-snug">
            Ao jogar a penúltima carta, grite UNO! Caso esqueça, o sistema penaliza você com +2 cartas.
          </p>

          <Section title="Vitória/Derrota" />
          <p className="text-secondary/80 leading-snug">
            O primeiro jogador a jogar todas as cartas vence a partida.
          </p>

          <h3 className="text-center text-secondary font-extrabold">Modos de Jogo</h3>
          <p className="text-secondary/80 leading-snug">
            1. <b>Batalha:</b> primeiro a terminar leva 95% das moedas; todos ganham 2 Pontos.<br />
            2. <b>Livre:</b> vencer concede apenas Pontos de UNO.
          </p>
        </div>
      </div>
    </>
  );
}
