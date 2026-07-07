import type { Book } from "@/types/bible";
import type { Question } from "@/types/game";
import { randomInt, shuffle } from "@/lib/utils";

export function formatReference(bookName: string, chapter: number, verse: number): string {
  return `${bookName} ${chapter}:${verse}`;
}

interface VersePick {
  bookName: string;
  chapter: number; // 1-based
  verse: number; // 1-based
  text: string;
}

function pickRandomVerse(books: Book[], minLength = 25, maxTries = 30): VersePick {
  let pick: VersePick | null = null;
  for (let i = 0; i < maxTries; i++) {
    const book = books[randomInt(0, books.length)];
    if (!book.chapters.length) continue;
    const chapterIndex = randomInt(0, book.chapters.length);
    const chapter = book.chapters[chapterIndex];
    if (!chapter.length) continue;
    const verseIndex = randomInt(0, chapter.length);
    const text = chapter[verseIndex];
    pick = {
      bookName: book.name,
      chapter: chapterIndex + 1,
      verse: verseIndex + 1,
      text,
    };
    if (text.length >= minLength) return pick;
  }
  if (!pick) throw new Error("Nenhum versículo disponível no arquivo da versão escolhida.");
  return pick;
}

function pickFakeReference(books: Book[], exclude: Set<string>): string {
  for (let i = 0; i < 60; i++) {
    const book = books[randomInt(0, books.length)];
    if (!book.chapters.length) continue;
    const chapterIndex = randomInt(0, book.chapters.length);
    const chapter = book.chapters[chapterIndex];
    if (!chapter.length) continue;
    const verseIndex = randomInt(0, chapter.length);
    const ref = formatReference(book.name, chapterIndex + 1, verseIndex + 1);
    if (!exclude.has(ref)) return ref;
  }
  throw new Error("Não foi possível gerar alternativas suficientes. Use um arquivo de versão maior.");
}

export function generateQuestion(books: Book[]): Question {
  const pick = pickRandomVerse(books);
  const correctReference = formatReference(pick.bookName, pick.chapter, pick.verse);
  const used = new Set<string>([correctReference]);
  const fakes: string[] = [];
  while (fakes.length < 3) {
    const fake = pickFakeReference(books, used);
    used.add(fake);
    fakes.push(fake);
  }
  return {
    verseText: pick.text,
    correctReference,
    options: shuffle([correctReference, ...fakes]),
  };
}

export function generateQuestions(books: Book[], count: number): Question[] {
  const questions: Question[] = [];
  const usedVerses = new Set<string>();
  let guard = 0;
  while (questions.length < count && guard < count * 20) {
    guard++;
    const q = generateQuestion(books);
    if (usedVerses.has(q.correctReference)) continue;
    usedVerses.add(q.correctReference);
    questions.push(q);
  }
  // Se a base for pequena demais, permite repetir para completar
  while (questions.length < count) {
    questions.push(generateQuestion(books));
  }
  return questions;
}
