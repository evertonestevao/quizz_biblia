/**
 * Pontuação multiplayer por ordem de acerto:
 * 1º correto: 10 pontos, 2º: 9, 3º: 8 ... mínimo de 1 ponto.
 * A fonte da verdade é a função SQL submit_answer (Supabase),
 * que usa o horário do servidor. Esta função existe apenas para
 * exibição/estimativa no cliente.
 */
export function scoreForCorrectPosition(positionZeroBased: number): number {
  return Math.max(10 - positionZeroBased, 1);
}

export interface RankablePlayer {
  id: string;
  name: string;
  total_score: number;
  correct_answers: number;
}

export function rankPlayers<T extends RankablePlayer>(players: T[]): T[] {
  return [...players].sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    if (b.correct_answers !== a.correct_answers) return b.correct_answers - a.correct_answers;
    return a.name.localeCompare(b.name);
  });
}
