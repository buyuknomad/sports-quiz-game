// Types for the Sports Quiz App
export type GameMode = 'solo' | '1v1' | 'multiplayer';
export type Category = 'football' | 'basketball' | 'tennis' | 'olympics' | 'mixed';

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

export interface Player {
  id: string;
  username: string;
  score: number;
  isReady?: boolean;
}

export interface Question {
  id: string;
  category: Category;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface GameState {
  gameId: string;
  mode: GameMode;
  category: Category;
  players: Player[];
  currentQuestion: number;
  questions: Question[];
  timeRemaining: number;
  isGameStarted: boolean;
  isGameEnded: boolean;
  chatMessages: ChatMessage[];
  startCountdown: number | null;
}