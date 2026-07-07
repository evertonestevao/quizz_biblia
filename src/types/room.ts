export type RoomStatus = "lobby" | "playing" | "finished";
export type QuestionStatus = "waiting" | "active" | "finished";

export interface Room {
  id: string;
  code: string;
  host_player_id: string | null;
  status: RoomStatus;
  question_count: number;
  question_duration: number;
  current_question_index: number;
  bible_version: string;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  total_score: number;
  correct_answers: number;
  joined_at: string;
}

export interface RoomQuestion {
  id: string;
  room_id: string;
  question_index: number;
  verse_text: string;
  correct_reference: string;
  options: string[];
  started_at: string | null;
  ends_at: string | null;
  duration_seconds: number;
  status: QuestionStatus;
  created_at: string;
}

export interface Answer {
  id: string;
  room_id: string;
  question_id: string;
  player_id: string;
  selected_reference: string;
  is_correct: boolean;
  score_awarded: number;
  answered_at: string;
}

export interface SubmitAnswerResult {
  accepted: boolean;
  reason?: string;
  is_correct?: boolean;
  score?: number;
  correct_reference?: string;
}
