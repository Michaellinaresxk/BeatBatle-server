export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  hasAnswered?: boolean; // Added to track if player has answered current question
}

export interface MobileController {
  id: string;
  nickname: string;
  isReady: boolean;
  score?: number;
  correctAnswers?: number;
  wrongAnswers?: number;
  hasAnswered?: boolean; // Added to track if controller has answered current question
}

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface Room {
  quizType: string;
  roomCode: string;
  hostId: string;
  status: RoomStatus;
  players: Player[];
  gameSettings: GameSettings;
  currentRound: number;
  scores: Map<string, number>;
  category: string | null;
  categoryType: string;
  mobileControllers: MobileController[];
  currentQuestion: QuestionData | null;
  timer?: NodeJS.Timeout;
  timeRemaining?: number;
}

export interface GameSettings {
  maxPlayers: number;
  roundTime: number;
  totalRounds: number;
}

export interface Question {
  id: string;
  question: string;
  options: { [key: string]: string };
  correctOptionId: string;
  audioUrl?: string;
  order: number;
  totalQuestions: number;
}

export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctOptionId: string;
  audioUrl?: string;
}

export interface Option {
  id: string;
  text: string;
}

export interface PlayerAnswer {
  playerId: string;
  nickname: string;
  answer: string;
  isCorrect: boolean;
}

export interface GameResult {
  [playerId: string]: {
    nickname: string;
    score: number;
    correctAnswers: number;
    totalAnswers: number;
  };
}

export interface QuestionData {
  question: {
    id: string;
    question: string;
    correctOptionId: string;
    order: number;
    totalQuestions: number;
  };
  options: { [key: string]: string } | Option[]; // Support both formats
  timeLimit: number;
}
