// Types for the Sports Quiz App with rematch support and answer feedback
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
  hasFinished?: boolean;
  isHost?: boolean;
  rematchReady?: boolean;
  responseTimes?: number[];
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
  finishedPlayers: Set<string>;
  answeredPlayers: Set<string>;
  startTime: number;
  questionStartTimes: number[];
  questionResponseTimes: number[];
  playerResponseTimes: Map<string, number[]>;
  completionTime?: number;
  isTransitioning: boolean;
  waitingForPlayers: boolean;
  currentPlayerId: string;
  scores: Map<string, number>;
  selectedAnswer: string | null;
  isAnswerChecked: boolean;
  isCorrect: boolean;
  nextQuestionPending: number | null;
}