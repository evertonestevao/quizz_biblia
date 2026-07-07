import { Crown, Medal } from "lucide-react";
import type { Player } from "@/types/room";
import { cn } from "@/lib/utils";

export function RankingPodium({ topThree }: { topThree: Player[] }) {
  const [first, second, third] = topThree;
  const slots = [
    { player: second, place: 2, height: "h-24", delay: 120 },
    { player: first, place: 1, height: "h-36", delay: 0 },
    { player: third, place: 3, height: "h-20", delay: 240 },
  ];

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-5">
      {slots.map(({ player, place, height, delay }) =>
        player ? (
          <div
            key={player.id}
            className="flex w-24 animate-fadeUp flex-col items-center gap-2 sm:w-32"
            style={{ animationDelay: `${delay}ms` }}
          >
            {place === 1 ? (
              <Crown className="h-8 w-8 text-gold-300" />
            ) : (
              <Medal className={cn("h-6 w-6", place === 2 ? "text-slate-300" : "text-amber-600")} />
            )}
            <p className="max-w-full truncate text-center text-sm font-semibold text-parchment">
              {player.name}
            </p>
            <p className={cn("font-display font-bold", place === 1 ? "text-2xl gold-text" : "text-lg text-muted2")}>
              {player.total_score} pts
            </p>
            <div
              className={cn(
                "w-full rounded-t-xl border border-b-0",
                height,
                place === 1
                  ? "border-gold-400/60 bg-gradient-to-b from-gold-500/40 to-gold-600/10 animate-glow"
                  : place === 2
                    ? "border-slate-300/40 bg-gradient-to-b from-slate-300/25 to-slate-400/5"
                    : "border-amber-700/50 bg-gradient-to-b from-amber-700/30 to-amber-800/5"
              )}
            >
              <p className="pt-2 text-center font-display text-2xl font-bold text-parchment/80">
                {place}º
              </p>
            </div>
          </div>
        ) : (
          <div key={place} className="w-24 sm:w-32" />
        )
      )}
    </div>
  );
}
