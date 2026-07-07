import type { SoloStats } from "@/types/game";

export function applySoloAnswer(stats: SoloStats, isCorrect: boolean): SoloStats {
  return {
    answered: stats.answered + 1,
    correct: stats.correct + (isCorrect ? 1 : 0),
  };
}

export const INITIAL_SOLO_STATS: SoloStats = { answered: 0, correct: 0 };
