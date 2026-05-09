import { create } from 'zustand';
import type { Question } from './lib/types';

interface TestState {
  questions: Question[];
  answers: Record<string, string>;    // questionId → answer string
  currentIndex: number;
  startTime: number | null;
  mode: string;                        // 'master' | 'section-<id>'
  seed: number;

  // Actions
  startTest: (questions: Question[], mode: string, seed: number) => void;
  setAnswer: (questionId: string, answer: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  reset: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  questions: [],
  answers: {},
  currentIndex: 0,
  startTime: null,
  mode: 'master',
  seed: 0,

  startTest: (questions, mode, seed) =>
    set({ questions, answers: {}, currentIndex: 0, startTime: Date.now(), mode, seed }),

  setAnswer: (questionId, answer) =>
    set(state => ({ answers: { ...state.answers, [questionId]: answer } })),

  nextQuestion: () =>
    set(state => ({ currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1) })),

  prevQuestion: () =>
    set(state => ({ currentIndex: Math.max(state.currentIndex - 1, 0) })),

  reset: () =>
    set({ questions: [], answers: {}, currentIndex: 0, startTime: null }),
}));
