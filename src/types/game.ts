export interface Question {
  verseText: string;
  correctReference: string;
  options: string[];
}

export interface SoloStats {
  answered: number;
  correct: number;
}
