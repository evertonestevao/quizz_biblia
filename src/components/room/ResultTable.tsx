import type { Player } from "@/types/room";
import { cn } from "@/lib/utils";

export function ResultTable({
  players,
  currentPlayerId,
}: {
  players: Player[];
  currentPlayerId?: string;
}) {
  return (
    <div className="glass overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-widest text-muted2">
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Jogador</th>
            <th className="px-4 py-3 text-center font-medium">Acertos</th>
            <th className="px-4 py-3 text-right font-medium">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr
              key={player.id}
              className={cn(
                "border-b border-white/5 last:border-0",
                index < 3 && "bg-gold-500/[0.06]",
                player.id === currentPlayerId && "bg-white/[0.07]"
              )}
            >
              <td className="px-4 py-3 font-display font-bold text-gold-300">{index + 1}º</td>
              <td className="px-4 py-3 font-medium text-parchment">
                {player.name}
                {player.id === currentPlayerId && (
                  <span className="ml-2 text-xs text-gold-400">(você)</span>
                )}
              </td>
              <td className="px-4 py-3 text-center text-muted2">{player.correct_answers}</td>
              <td className="px-4 py-3 text-right font-semibold text-parchment">
                {player.total_score}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
