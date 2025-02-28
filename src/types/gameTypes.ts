export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
}

export interface MobileController {
  id: string;
  nickname: string;
  isReady: boolean;
}

export interface GameSettings {
  maxPlayers: number;
  roundTime: number;
  totalRounds: number;
}

export interface Room {
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'ended';
  players: Player[];
  gameSettings: GameSettings;
  currentRound: number;
  scores: Map<string, number>;
  category: string | null;
  mobileControllers: MobileController[]; // Added mobile controllers
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

export interface GameResults {
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
  options: any; // Replace with actual option type
  timeLimit: number;
}
