// Game state management using Zustand with single and multiplayer support
import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { io } from 'socket.io-client';
import type { GameState, GameMode, Category, Player, Question, ChatMessage } from '../types';

// Determine the Socket.IO server URL based on the environment
const SOCKET_URL = import.meta.env.PROD 
  ? 'https://sports-quiz-server.onrender.com'  // Production server URL
  : 'http://localhost:3000'; // Development server

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000
});

// Socket connection status logging
socket.on('connect', () => {
  console.log('Connected to Socket.IO server');
});

socket.on('connect_error', (error) => {
  console.error('Socket.IO connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from Socket.IO server:', reason);
});

const sampleQuestions: Question[] = [
  {
    id: nanoid(),
    category: 'football',
    question: 'Which country won the 2022 FIFA World Cup?',
    options: ['France', 'Brazil', 'Argentina', 'Germany'],
    correctAnswer: 'Argentina'
  },
  {
    id: nanoid(),
    category: 'football',
    question: 'Who holds the record for most goals in World Cup history?',
    options: ['Pelé', 'Miroslav Klose', 'Ronaldo', 'Just Fontaine'],
    correctAnswer: 'Miroslav Klose'
  },
  {
    id: nanoid(),
    category: 'basketball',
    question: 'Which NBA team has won the most championships?',
    options: ['Los Angeles Lakers', 'Boston Celtics', 'Chicago Bulls', 'Golden State Warriors'],
    correctAnswer: 'Boston Celtics'
  },
  {
    id: nanoid(),
    category: 'basketball',
    question: 'Who holds the NBA record for most points in a single game?',
    options: ['Michael Jordan', 'Kobe Bryant', 'Wilt Chamberlain', 'LeBron James'],
    correctAnswer: 'Wilt Chamberlain'
  },
  {
    id: nanoid(),
    category: 'tennis',
    question: 'Who has won the most Grand Slam singles titles in tennis history?',
    options: ['Roger Federer', 'Rafael Nadal', 'Novak Djokovic', 'Serena Williams'],
    correctAnswer: 'Novak Djokovic'
  },
  {
    id: nanoid(),
    category: 'tennis',
    question: 'Which Grand Slam tournament is played on clay courts?',
    options: ['Wimbledon', 'US Open', 'French Open', 'Australian Open'],
    correctAnswer: 'French Open'
  },
  {
    id: nanoid(),
    category: 'olympics',
    question: 'Which city hosted the 2020 Summer Olympics (held in 2021)?',
    options: ['Paris', 'Tokyo', 'London', 'Rio de Janeiro'],
    correctAnswer: 'Tokyo'
  },
  {
    id: nanoid(),
    category: 'olympics',
    question: 'Who is the most decorated Olympian of all time?',
    options: ['Usain Bolt', 'Michael Phelps', 'Simone Biles', 'Carl Lewis'],
    correctAnswer: 'Michael Phelps'
  },
  {
    id: nanoid(),
    category: 'mixed',
    question: 'In which sport would you perform a "slam dunk"?',
    options: ['Volleyball', 'Basketball', 'Tennis', 'Football'],
    correctAnswer: 'Basketball'
  },
  {
    id: nanoid(),
    category: 'mixed',
    question: 'What is the diameter of a basketball hoop in inches?',
    options: ['16 inches', '18 inches', '20 inches', '24 inches'],
    correctAnswer: '18 inches'
  }
];

export const quickChatMessages = [
  { emoji: '⚽', text: 'Great shot!' },
  { emoji: '👍', text: 'Nice one!' },
  { emoji: '🎯', text: 'Perfect answer!' },
  { emoji: '🔥', text: 'On fire!' },
  { emoji: '💪', text: 'Keep it up!' },
];

interface GameStore extends GameState {
  initializeGame: (mode: GameMode, category: Category) => void;
  addPlayer: (username: string) => void;
  joinGame: (gameId: string, username: string) => void;
  updateScore: (playerId: string, timeRemaining: number, isFirstAnswer: boolean) => void;
  setTimeRemaining: (time: number) => void;
  setCategory: (category: Category) => void;
  startGame: () => void;
  endGame: () => void;
  nextQuestion: () => void;
  checkAnswer: (answer: string) => boolean;
  addChatMessage: (playerId: string, message: string) => void;
  setPlayerReady: () => void;
  getCurrentPlayer: () => Player | undefined;
  submitAnswer: (answer: string, timeRemaining: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  // Game event handlers
  socket.on('gameCreated', (game) => {
    console.log('Game created:', game);
    set(game);
  });

  socket.on('gameUpdated', (game) => {
    console.log('Game updated:', game);
    set(game);
  });

  socket.on('gameStarted', (game) => {
    console.log('Game started:', game);
    set({ ...game, isGameStarted: true });
  });

  socket.on('gameOver', (game) => {
    console.log('Game over:', game);
    set({ ...game, isGameEnded: true });
  });

  socket.on('nextQuestion', (game) => {
    console.log('Next question:', game);
    set(game);
  });

  socket.on('newChatMessage', (message) => {
    console.log('New chat message:', message);
    set((state) => ({
      ...state,
      chatMessages: [...state.chatMessages, message]
    }));
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return {
    gameId: '',
    mode: 'solo',
    category: 'mixed',
    players: [],
    currentQuestion: 0,
    questions: sampleQuestions,
    timeRemaining: 15,
    isGameStarted: false,
    isGameEnded: false,
    chatMessages: [],
    startCountdown: null,

    initializeGame: (mode, category) => {
      if (mode === 'solo') {
        const filteredQuestions = category === 'mixed' 
          ? sampleQuestions 
          : sampleQuestions.filter(q => q.category === category);

        set({
          mode,
          category,
          players: [],
          currentQuestion: 0,
          questions: filteredQuestions,
          timeRemaining: 15,
          isGameStarted: true,
          isGameEnded: false,
          chatMessages: [],
          startCountdown: null
        });
      } else {
        const username = localStorage.getItem('username') || 'Guest';
        console.log('Creating multiplayer game:', { mode, category, username });
        socket.emit('createGame', { mode, category, username });
      }
    },

    joinGame: (gameId, username) => {
      console.log('Joining game:', { gameId, username });
      socket.emit('joinGame', { gameId, username });
    },

    getCurrentPlayer: () => {
      const state = get();
      return state.players.find(p => p.id === socket.id);
    },

    addPlayer: (username) => {
      const state = get();
      if (state.mode === 'solo') {
        set((state) => ({
          ...state,
          players: [{
            id: nanoid(),
            username,
            score: 0,
            isReady: false
          }]
        }));
      }
    },

    setPlayerReady: () => {
      const state = get();
      console.log('Setting player ready:', { gameId: state.gameId });
      socket.emit('playerReady', { gameId: state.gameId });
    },

    updateScore: (playerId, timeRemaining, isFirstAnswer) => {
      const basePoints = 10;
      let speedBonus = 0;

      if (timeRemaining > 10) {
        speedBonus = isFirstAnswer ? 5 : 1;
      } else if (timeRemaining > 5) {
        speedBonus = isFirstAnswer ? 3 : 1;
      } else {
        speedBonus = 1;
      }

      const totalPoints = basePoints + speedBonus;

      set((state) => ({
        ...state,
        players: state.players.map((player) =>
          player.id === playerId
            ? { ...player, score: player.score + totalPoints }
            : player
        )
      }));
    },

    addChatMessage: (playerId, message) => {
      const state = get();
      console.log('Sending chat message:', { gameId: state.gameId, message });
      socket.emit('chatMessage', { gameId: state.gameId, message });
    },

    setCategory: (category) => {
      const filteredQuestions = category === 'mixed' 
        ? sampleQuestions 
        : sampleQuestions.filter(q => q.category === category);

      set((state) => ({ 
        ...state, 
        category,
        questions: filteredQuestions
      }));
    },

    setTimeRemaining: (time) => set((state) => ({
      ...state,
      timeRemaining: time
    })),

    startGame: () => {
      const state = get();
      console.log('Starting game:', { gameId: state.gameId });
      socket.emit('startGame', { gameId: state.gameId });
    },

    endGame: () => set((state) => ({
      ...state,
      isGameEnded: true
    })),

    nextQuestion: () => set((state) => ({
      ...state,
      currentQuestion: state.currentQuestion + 1,
      timeRemaining: 15,
    })),

    checkAnswer: (answer) => {
      const state = get();
      const currentQ = state.questions[state.currentQuestion];
      return currentQ.correctAnswer === answer;
    },

    submitAnswer: (answer, timeRemaining) => {
      const state = get();
      if (state.mode === 'solo') {
        const isCorrect = get().checkAnswer(answer);
        const player = state.players[0];
        
        if (isCorrect && player) {
          get().updateScore(player.id, timeRemaining, true);
        }

        if (state.currentQuestion === state.questions.length - 1) {
          setTimeout(() => {
            get().endGame();
          }, 1500);
        } else {
          setTimeout(() => {
            get().nextQuestion();
          }, 1500);
        }
      } else {
        console.log('Submitting answer:', { gameId: state.gameId, answer, timeRemaining });
        socket.emit('submitAnswer', {
          gameId: state.gameId,
          answer,
          timeRemaining
        });
      }
    },
  };
});