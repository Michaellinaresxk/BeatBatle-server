export interface Room {
  roomCode: string;
  hostId: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  gameSettings: GameSettings;
  currentRound: number;
  scores: Map<string, number>;
}

export interface Player {
  id: string;
  nickname: string;
  isHost: boolean;
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
}

export interface GameSettings {
  maxPlayers: number;
  roundTime: number;
  totalRounds: number;
}
