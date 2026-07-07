import { Crown, User } from "lucide-react";
import type { Player } from "@/types/room";

interface PlayerListProps {
  players: Player[];
  hostPlayerId: string | null;
  currentPlayerId?: string;
}

export function PlayerList({ players, hostPlayerId, currentPlayerId }: PlayerListProps) {
  return (
    <ul className="space-y-2">
      {players.map((player) => (
        <li
          key={player.id}
          className="glass flex animate-popIn items-center gap-3 px-4 py-3"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-300">
            {player.id === hostPlayerId ? (
              <Crown className="h-4.5 w-4.5" />
            ) : (
              <User className="h-4.5 w-4.5" />
            )}
          </span>
          <span className="flex-1 font-medium text-parchment">
            {player.name}
            {player.id === currentPlayerId && (
              <span className="ml-2 text-xs text-gold-400">(você)</span>
            )}
          </span>
          {player.id === hostPlayerId && (
            <span className="text-[11px] uppercase tracking-widest text-gold-400">Anfitrião</span>
          )}
        </li>
      ))}
    </ul>
  );
}
