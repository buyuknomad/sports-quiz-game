import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { io, Socket } from 'socket.io-client';
import type { GameState, GameMode, Category, Player, Question, ChatMessage } from '../types';

const SOCKET_URL = import.meta.env.PROD 
  ? window.location.origin  // In production, use the same origin as the app
  : 'http://localhost:3000';

const socket: Socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  timeout: 20000,
  autoConnect: false
});

socket.on('connect', () => {
  console.log('Socket connected with ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
  setTimeout(() => socket.connect(), 2000);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from Socket.IO server:', reason);
  if (reason === 'io server disconnect') {
    socket.connect();
  }
});

// Helper function to safely convert server data to client state
const convertServerDataToState = (serverData: any) => {
  try {
    const state: Partial<GameState> = { ...serverData };

    // Convert scores array to Map if it exists
    if (Array.isArray(serverData.scores)) {
      state.scores = new Map(serverData.scores);
    } else {
      state.scores = new Map();
    }

    // Convert playerResponseTimes array to Map if it exists
    if (Array.isArray(serverData.playerResponseTimes)) {
      state.playerResponseTimes = new Map(serverData.playerResponseTimes);
    } else {
      state.playerResponseTimes = new Map();
    }

    // Convert answeredPlayers array to Set if it exists
    if (Array.isArray(serverData.answeredPlayers)) {
      state.answeredPlayers = new Set(serverData.answeredPlayers);
    } else {
      state.answeredPlayers = new Set();
    }

    // Convert finishedPlayers array to Set if it exists
    if (Array.isArray(serverData.finishedPlayers)) {
      state.finishedPlayers = new Set(serverData.finishedPlayers);
    } else {
      state.finishedPlayers = new Set();
    }

    // Ensure players array exists
    if (!Array.isArray(state.players)) {
      state.players = [];
    }

    // Ensure questions array exists
    if (!Array.isArray(state.questions)) {
      state.questions = [];
    }

    return state;
  } catch (error) {
    console.error('Error converting server data:', error);
    return {};
  }
};

const initialState: GameState = {
  gameId: '',
  mode: 'solo',
  category: 'mixed',
  players: [],
  currentQuestion: 0,
  questions: [],
  timeRemaining: 15,
  isGameStarted: false,
  isGameEnded: false,
  chatMessages: [],
  startCountdown: null,
  finishedPlayers: new Set<string>(),
  answeredPlayers: new Set<string>(),
  startTime: Date.now(),
  questionStartTimes: [],
  questionResponseTimes: [],
  playerResponseTimes: new Map<string, number[]>(),
  isTransitioning: false,
  waitingForPlayers: true,
  currentPlayerId: '',
  scores: new Map<string, number>(),
  selectedAnswer: null,
  isAnswerChecked: false,
  isCorrect: false,
  nextQuestionPending: null
};

interface GameStore extends GameState {
  initializeGame: (mode: GameMode, category: Category) => void;
  addPlayer: (username: string) => void;
  joinGame: (gameId: string, username: string) => void;
  setTimeRemaining: (time: number) => void;
  setCategory: (category: Category) => void;
  startGame: () => void;
  endGame: () => void;
  nextQuestion: () => void;
  checkAnswer: (answer: string) => boolean;
  addChatMessage: (playerId: string, message: string) => void;
  setPlayerReady: () => void;
  getCurrentPlayer: () => Player | undefined;
  submitAnswer: (answer: string, timeRemaining: number, points: number, totalScore: number) => void;
  resetGame: () => void;
  setIsTransitioning: (value: boolean) => void;
  handleRematch: (gameId: string, playerId: string) => void;
  getPlayerResponseTimes: (playerId: string) => number[];
}

const calculateScore = (timeRemaining: number, isCorrect: boolean): number => {
  if (!isCorrect) return 0;
  const basePoints = 10;
  const timeBonus = Math.min(5, Math.floor(timeRemaining / 3));
  return basePoints + timeBonus;
};

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

// Client-side questions are only used for solo mode now
// For multiplayer games, questions come from the server
const getFilteredQuestions = (category: Category) => {
  const questions = category === 'mixed' 
    ? sampleQuestions 
    : sampleQuestions.filter(q => q.category === category);
  
  if (questions.length < 10) {
    const remainingCount = 10 - questions.length;
    const mixedQuestions = sampleQuestions.filter(q => q.category !== category);
    questions.push(...mixedQuestions.slice(0, remainingCount));
  }
  
  return questions.slice(0, 10);
};

export const useGameStore = create<GameStore>((set, get) => {
  let transitionTimeout: NodeJS.Timeout | null = null;

  const clearTimeouts = () => {
    if (transitionTimeout) {
      clearTimeout(transitionTimeout);
      transitionTimeout = null;
    }
  };

  const updatePlayerScore = (playerId: string, points: number, totalScore: number) => {
    set(state => {
      const newScores = new Map(state.scores);
      newScores.set(playerId, totalScore);
      
      const updatedPlayers = state.players.map(player => 
        player.id === playerId 
          ? { ...player, score: totalScore } 
          : player
      );
      
      return {
        scores: newScores,
        players: updatedPlayers
      };
    });
  };

  socket.on('scoreUpdate', ({ playerId, score }) => {
    console.log('Received score update:', { playerId, score });
    updatePlayerScore(playerId, 0, score);
  });

  socket.on('responseTimeUpdate', ({ playerId, responseTimes }) => {
    console.log('Received response time update:', { playerId, responseTimes });
    set(state => {
      const newPlayerResponseTimes = new Map(state.playerResponseTimes);
      newPlayerResponseTimes.set(playerId, responseTimes);
      
      return {
        playerResponseTimes: newPlayerResponseTimes
      };
    });
  });

  socket.on('nextQuestion', (game) => {
    try {
      console.log('Received nextQuestion event from server (after 1s delay)');
      
      const serverState = convertServerDataToState(game);
      
      // Store the next question in pending state
      set((state) => ({
        ...state,
        nextQuestionPending: game.currentQuestion
      }));

      // Wait an additional second before actually showing the next question
      setTimeout(() => {
        set((state) => ({
          ...state,
          ...serverState,
          currentQuestion: game.currentQuestion,
          answeredPlayers: new Set<string>(),
          questionStartTimes: [...state.questionStartTimes, Date.now()],
          isTransitioning: false,
          currentPlayerId: socket.id,
          selectedAnswer: null,
          isAnswerChecked: false,
          isCorrect: false,
          nextQuestionPending: null
        }));
        console.log('Applied next question after local delay');
      }, 1000);
    } catch (error) {
      console.error('Error handling nextQuestion:', error);
    }
  });

  socket.on('gameCreated', (game) => {
    try {
      const serverState = convertServerDataToState(game);
      
      set({
        ...initialState,
        ...serverState,
        isGameStarted: false,
        isGameEnded: false,
        startTime: Date.now(),
        questionStartTimes: [],
        questionResponseTimes: [],
        isTransitioning: false,
        waitingForPlayers: true,
        currentPlayerId: socket.id,
        selectedAnswer: null,
        isAnswerChecked: false,
        isCorrect: false,
        nextQuestionPending: null
      });
      console.log('Game created with socket ID:', socket.id, 'and', game.questions.length, 'questions');
    } catch (error) {
      console.error('Error handling gameCreated:', error);
    }
  });

  socket.on('gameUpdated', (game) => {
    try {
      const serverState = convertServerDataToState(game);
      
      set((state) => ({
        ...state,
        ...serverState,
        questionStartTimes: state.questionStartTimes,
        questionResponseTimes: state.questionResponseTimes,
        isTransitioning: false,
        waitingForPlayers: game.players.length < 2,
        currentPlayerId: socket.id,
        selectedAnswer: state.selectedAnswer,
        isAnswerChecked: state.isAnswerChecked,
        isCorrect: state.isCorrect,
        nextQuestionPending: state.nextQuestionPending
      }));
    } catch (error) {
      console.error('Error handling gameUpdated:', error);
    }
  });

  socket.on('gameStarted', (game) => {
    try {
      const serverState = convertServerDataToState(game);
      
      set((state) => ({
        ...state,
        ...serverState,
        isGameStarted: true,
        isGameEnded: false,
        startTime: Date.now(),
        questionStartTimes: [Date.now()],
        questionResponseTimes: [],
        isTransitioning: false,
        waitingForPlayers: false,
        currentPlayerId: socket.id,
        selectedAnswer: null,
        isAnswerChecked: false,
        isCorrect: false,
        nextQuestionPending: null
      }));
    } catch (error) {
      console.error('Error handling gameStarted:', error);
    }
  });

  socket.on('gameOver', (game) => {
    try {
      const endTime = Date.now();
      const totalTime = (endTime - get().startTime) / 1000;
      
      const serverState = convertServerDataToState(game);
      
      set((state) => ({
        ...state,
        ...serverState,
        isGameStarted: false,
        isGameEnded: true,
        completionTime: totalTime,
        isTransitioning: false,
        currentPlayerId: socket.id,
        nextQuestionPending: null
      }));
    } catch (error) {
      console.error('Error handling gameOver:', error);
    }
  });

  socket.on('playerFinished', (playerId: string) => {
    try {
      set((state) => {
        const newFinishedPlayers = new Set(state.finishedPlayers);
        newFinishedPlayers.add(playerId);
        return {
          ...state,
          finishedPlayers: newFinishedPlayers,
          isTransitioning: false
        };
      });
    } catch (error) {
      console.error('Error handling playerFinished:', error);
    }
  });

  socket.on('goToLobby', (game) => {
    try {
      const serverState = convertServerDataToState(game);
      
      set((state) => ({
        ...state,
        ...serverState,
        isGameStarted: false,
        isGameEnded: false,
        currentQuestion: 0,
        finishedPlayers: new Set<string>(),
        answeredPlayers: new Set<string>(),
        startTime: Date.now(),
        questionStartTimes: [],
        questionResponseTimes: [],
        isTransitioning: false,
        waitingForPlayers: false,
        selectedAnswer: null,
        isAnswerChecked: false,
        isCorrect: false,
        nextQuestionPending: null
      }));
      console.log('Returned to lobby with synchronized questions for rematch');
    } catch (error) {
      console.error('Error handling goToLobby:', error);
    }
  });

  return {
    ...initialState,

    resetGame: () => {
      console.log('Resetting game state');
      clearTimeouts();
      
      if (socket.connected) {
        socket.disconnect();
      }

      set({
        ...initialState,
        startTime: Date.now(),
        isTransitioning: false,
        isGameStarted: false,
        currentPlayerId: ''
      });
    },

    getPlayerResponseTimes: (playerId: string) => {
      const state = get();
      // If this is the current player, use local response times
      if (playerId === state.currentPlayerId) {
        return state.questionResponseTimes;
      }
      // Otherwise, get from the shared map
      return state.playerResponseTimes.get(playerId) || [];
    },

    submitAnswer: (answer: string, timeRemaining: number, points: number, totalScore: number) => {
      console.log('Submitting answer:', { answer, timeRemaining, points, totalScore });
      const state = get();
      clearTimeouts();

      const currentTime = Date.now();
      const questionStartTime = state.questionStartTimes[state.currentQuestion];
      const responseTime = (currentTime - questionStartTime) / 1000;
      const currentPlayer = get().getCurrentPlayer();
      const newResponseTimes = [...state.questionResponseTimes, responseTime];

      // Check if answer is correct
      const isCorrect = state.questions[state.currentQuestion].correctAnswer === answer;

      if (state.mode === 'solo') {
        if (currentPlayer) {
          updatePlayerScore(currentPlayer.id, points, totalScore);
        }

        set({
          questionResponseTimes: newResponseTimes,
          isTransitioning: true,
          selectedAnswer: answer,
          isAnswerChecked: true,
          isCorrect
        });

        if (state.currentQuestion === state.questions.length - 1) {
          const endTime = Date.now();
          const totalTime = (endTime - state.startTime) / 1000;
          
          set({
            isGameStarted: false,
            isGameEnded: true,
            completionTime: totalTime,
            isTransitioning: false
          });
        } else {
          // Only use local transition for solo mode
          transitionTimeout = setTimeout(() => {
            get().nextQuestion();
          }, 1500);
        }
      } else {
        // For multiplayer, only emit the answer and let the server control transitions
        if (currentPlayer) {
          console.log('Emitting submitAnswer to server');
          socket.emit('submitAnswer', {
            gameId: state.gameId,
            playerId: currentPlayer.id,
            answer,
            timeRemaining,
            points,
            totalScore,
            responseTime,
            allResponseTimes: newResponseTimes
          });

          updatePlayerScore(currentPlayer.id, points, totalScore);
          
          // Update local player response times
          const newPlayerResponseTimes = new Map(state.playerResponseTimes);
          newPlayerResponseTimes.set(currentPlayer.id, newResponseTimes);
          
          set({
            questionResponseTimes: newResponseTimes,
            playerResponseTimes: newPlayerResponseTimes,
            isTransitioning: true,
            selectedAnswer: answer,
            isAnswerChecked: true,
            isCorrect
          });
        }

        if (state.currentQuestion === state.questions.length - 1) {
          socket.emit('playerFinished', { 
            gameId: state.gameId,
            playerId: currentPlayer?.id
          });
        }
      }
    },

    initializeGame: (mode: GameMode, category: Category) => {
      console.log('Starting new game:', { mode, category });
      clearTimeouts();

      const username = localStorage.getItem('username') || 'Guest';
      const playerId = socket.id || nanoid();

      // For solo mode, set up questions locally
      const localQuestions = mode === 'solo' ? getFilteredQuestions(category) : [];

      const newState = {
        ...initialState,
        mode,
        category,
        questions: localQuestions,
        players: [{
          id: playerId,
          username,
          score: 0,
          isReady: false,
          hasFinished: false,
          rematchReady: false
        }],
        isGameStarted: false,
        isGameEnded: false,
        startTime: Date.now(),
        questionStartTimes: [],
        questionResponseTimes: [],
        playerResponseTimes: new Map<string, number[]>(),
        isTransitioning: false,
        waitingForPlayers: mode === '1v1',
        currentPlayerId: playerId,
        scores: new Map([[playerId, 0]]),
        selectedAnswer: null,
        isAnswerChecked: false,
        isCorrect: false,
        nextQuestionPending: null
      };

      set(newState);

      if (mode !== 'solo') {
        socket.connect();
        socket.emit('createGame', { mode, category, username });
      }
    },

    addPlayer: (username: string) => {
      console.log('Adding player:', username);
      const state = get();
      
      if (state.mode === 'solo') {
        const playerId = socket.id || nanoid();
        set({
          players: [{
            id: playerId,
            username,
            score: 0,
            isReady: false,
            hasFinished: false
          }],
          currentPlayerId: playerId,
          scores: new Map([[playerId, 0]]),
          questions: getFilteredQuestions(state.category) // For solo mode, create local questions
        });
      }
    },

    joinGame: (gameId: string, username: string) => {
      socket.connect();
      socket.emit('joinGame', { gameId, username });
    },

    getCurrentPlayer: () => {
      const state = get();
      return state.players.find(p => p.id === state.currentPlayerId);
    },

    setPlayerReady: () => {
      const state = get();
      console.log('Setting player ready. Current player ID:', state.currentPlayerId);
      socket.emit('playerReady', { gameId: state.gameId });
    },

    setCategory: (category: Category) => {
      console.log('Setting category:', category);
      const state = get();
      
      if (state.mode === '1v1') {
        set({ 
          category,
          // Don't set questions here - they'll come from the server
          isGameStarted: false,
          waitingForPlayers: true
        });
        
        if (socket.connected) {
          socket.emit('updateCategory', { gameId: state.gameId, category });
        }
      } else {
        // For solo mode, we can still use local questions
        set({ 
          category,
          questions: getFilteredQuestions(category),
          isGameStarted: true,
          startTime: Date.now(),
          questionStartTimes: [Date.now()],
          questionResponseTimes: [],
          playerResponseTimes: new Map<string, number[]>(),
          isTransitioning: false
        });
      }
    },

    setTimeRemaining: (time: number) => set({ timeRemaining: time }),

    startGame: () => {
      const state = get();
      socket.emit('startGame', { gameId: state.gameId });
    },

    endGame: () => {
      const state = get();
      if (state.mode === 'solo') {
        const endTime = Date.now();
        const totalTime = (endTime - state.startTime) / 1000;
        
        set({
          isGameStarted: false,
          isGameEnded: true,
          completionTime: totalTime,
          isTransitioning: false
        });
      } else {
        socket.emit('gameOver', { gameId: state.gameId });
      }
    },

    nextQuestion: () => {
      clearTimeouts();
      // Only used for solo mode now
      set((state) => ({
        currentQuestion: state.currentQuestion + 1,
        timeRemaining: 15,
        answeredPlayers: new Set<string>(),
        questionStartTimes: [...state.questionStartTimes, Date.now()],
        isTransitioning: false,
        selectedAnswer: null,
        isAnswerChecked: false,
        isCorrect: false
      }));
    },

    checkAnswer: (answer: string) => {
      const state = get();
      const currentQ = state.questions[state.currentQuestion];
      return currentQ.correctAnswer === answer;
    },

    addChatMessage: (playerId: string, message: string) => {
      const state = get();
      socket.emit('chatMessage', { gameId: state.gameId, message });
    },

    setIsTransitioning: (value: boolean) => {
      console.log('Setting transition state:', value);
      set({ isTransitioning: value });
    },

    handleRematch: (gameId: string, playerId: string) => {
      if (!socket || !gameId) return;
      socket.emit('requestRematch', { gameId, playerId });
    }
  };
});