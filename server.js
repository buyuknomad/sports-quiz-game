// Enhanced production server with security and performance optimizations
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import helmet from 'helmet';
import compression from 'compression';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serialization helper function
const serializeGameState = (game) => {
  if (!game) return null;
  
  // Create a copy to avoid modifying the original
  const serialized = { ...game };
  
  // Convert Sets to Arrays
  if (game.answeredPlayers instanceof Set) {
    serialized.answeredPlayers = Array.from(game.answeredPlayers);
  }
  
  if (game.finishedPlayers instanceof Set) {
    serialized.finishedPlayers = Array.from(game.finishedPlayers);
  }
  
  // Convert Maps to Arrays of [key, value] pairs
  if (game.scores instanceof Map) {
    serialized.scores = Array.from(game.scores.entries());
  }
  
  // Make sure player objects are properly formatted
  if (Array.isArray(game.players)) {
    serialized.players = game.players.map(player => ({
      ...player,
      // Ensure responseTimes is an array
      responseTimes: Array.isArray(player.responseTimes) ? player.responseTimes : []
    }));
  }
  
  return serialized;
};

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compression middleware
app.use(compression());

const corsOrigin = process.env.NODE_ENV === 'production'
  ? process.env.CLIENT_URL || true
  : "http://localhost:5173";

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

app.use(express.json());

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({ status: 'Server is running' });
  });
}

const activeGames = new Map();

const sampleQuestions = [
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

// Function to get questions based on category with consistent order
const getQuestionsForCategory = (category) => {
  // First, filter by category or use all for mixed
  let filteredQuestions = category === 'mixed' 
    ? [...sampleQuestions] 
    : sampleQuestions.filter(q => q.category === category);
  
  // Ensure we have at least 10 questions
  if (filteredQuestions.length < 10 && category !== 'mixed') {
    const remainingCount = 10 - filteredQuestions.length;
    const mixedQuestions = sampleQuestions.filter(q => q.category !== category);
    filteredQuestions = [...filteredQuestions, ...mixedQuestions.slice(0, remainingCount)];
  }
  
  // Return exactly 10 questions
  return filteredQuestions.slice(0, 10);
};

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createGame', ({ mode, category, username }) => {
    const gameId = nanoid(6);
    
    // Get consistent questions for this game
    const gameQuestions = getQuestionsForCategory(category);

    const game = {
      gameId,
      mode,
      category,
      players: [{
        id: socket.id,
        username,
        score: 0,
        isReady: false,
        hasFinished: false,
        isHost: true,
        rematchReady: false,
        responseTimes: []
      }],
      currentQuestion: 0,
      questions: gameQuestions,
      isGameStarted: false,
      isGameEnded: false,
      chatMessages: [],
      startCountdown: null,
      answeredPlayers: new Set(),
      finishedPlayers: new Set(),
      scores: new Map([[socket.id, 0]]),
      questionStartTime: Date.now()
    };

    activeGames.set(gameId, game);
    socket.join(gameId);
    
    // Serialize game state before sending
    socket.emit('gameCreated', serializeGameState(game));
    console.log(`Game created: ${gameId} by ${username} (Host) with ${gameQuestions.length} questions`);
  });

  socket.on('joinGame', ({ gameId, username }) => {
    const game = activeGames.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    const newPlayer = {
      id: socket.id,
      username,
      score: 0,
      isReady: false,
      hasFinished: false,
      isHost: false,
      rematchReady: false,
      responseTimes: []
    };

    game.players.push(newPlayer);
    game.scores.set(socket.id, 0);
    
    socket.join(gameId);
    
    // Serialize game state before sending
    io.to(gameId).emit('gameUpdated', serializeGameState(game));
    console.log(`Player ${username} joined game: ${gameId}`);
  });

  socket.on('requestRematch', ({ gameId, playerId }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    player.rematchReady = true;
    io.to(gameId).emit('rematchRequested', { playerId });

    // Check if all players in 1v1 have requested rematch
    const allRematch = game.mode === '1v1' && 
                      game.players.length === 2 && 
                      game.players.every(p => p.rematchReady);

    if (allRematch) {
      // Reset game state but keep the same gameId
      const newQuestions = getQuestionsForCategory(game.category);
      
      game.isGameStarted = false;
      game.isGameEnded = false;
      game.currentQuestion = 0;
      game.finishedPlayers = new Set();
      game.answeredPlayers = new Set();
      game.startCountdown = null;
      game.chatMessages = [];
      game.questions = newQuestions;
      game.questionStartTime = Date.now();
      
      // Reset player states
      game.players.forEach(p => {
        p.score = 0;
        p.isReady = false;
        p.hasFinished = false;
        p.rematchReady = false;
        p.responseTimes = [];
        game.scores.set(p.id, 0);
      });

      // Send players back to lobby
      io.to(gameId).emit('goToLobby', serializeGameState(game));
      
      console.log(`Game ${gameId} reset for rematch with new questions`);
    }
  });

  socket.on('updateCategory', ({ gameId, category }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    game.category = category;
    game.questions = getQuestionsForCategory(category);

    io.to(gameId).emit('categoryUpdated', serializeGameState(game));
    
    console.log(`Category updated to ${category} in game: ${gameId} with ${game.questions.length} questions`);
  });

  socket.on('playerReady', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    player.isReady = true;
    io.to(gameId).emit('gameUpdated', serializeGameState(game));
    
    console.log(`Player ${player.username} ready in game: ${gameId}`);

    const allReady = game.players.length >= 2 && game.players.every(p => p.isReady);
    
    if (allReady && game.startCountdown === null) {
      game.startCountdown = 3;
      io.to(gameId).emit('gameUpdated', serializeGameState(game));

      const countdownInterval = setInterval(() => {
        if (game.startCountdown > 0) {
          game.startCountdown--;
          io.to(gameId).emit('gameUpdated', serializeGameState(game));
        } else {
          clearInterval(countdownInterval);
          game.isGameStarted = true;
          game.startCountdown = null;
          game.questionStartTime = Date.now();
          
          io.to(gameId).emit('gameStarted', serializeGameState(game));
          
          console.log(`Game ${gameId} started with synchronized questions`);
        }
      }, 1000);
    }
  });

  socket.on('submitAnswer', ({ gameId, playerId, answer, timeRemaining, points, totalScore, responseTime, allResponseTimes }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return;

    // Store response time in the player object
    if (!player.responseTimes) {
      player.responseTimes = [];
    }
    
    // Add current response time to player's array
    player.responseTimes.push(responseTime);
    
    // Update player score
    player.score = totalScore;
    game.scores.set(playerId, totalScore);
    
    // Broadcast score and response time updates to all clients
    io.to(gameId).emit('scoreUpdate', { 
      playerId, 
      score: totalScore,
      responseTime
    });
    
    // Also broadcast the full array of response times
    io.to(gameId).emit('responseTimeUpdate', {
      playerId,
      responseTimes: player.responseTimes
    });
    
    console.log(`Player ${playerId} score updated to ${totalScore} in game: ${gameId}`);
    console.log(`Player ${playerId} response times updated:`, player.responseTimes);

    game.answeredPlayers.add(playerId);
    console.log(`Player ${playerId} submitted answer in game: ${gameId}`);

    if (game.answeredPlayers.size === game.players.length) {
      console.log(`All players answered in game: ${gameId}`);
      game.answeredPlayers.clear();
      
      if (game.currentQuestion < 9) {
        console.log('Delaying next question by 1 second...');
        
        // Add a 1-second delay before moving to the next question
        setTimeout(() => {
          game.currentQuestion++;
          game.questionStartTime = Date.now();
          
          // Update scores first
          game.players.forEach(player => {
            io.to(gameId).emit('scoreUpdate', { 
              playerId: player.id, 
              score: player.score
            });
            
            io.to(gameId).emit('responseTimeUpdate', {
              playerId: player.id,
              responseTimes: player.responseTimes || []
            });
          });
          
          // Then emit the next question
          io.to(gameId).emit('nextQuestion', serializeGameState(game));
          console.log(`(1v1) After 1s delay, sending nextQuestion #${game.currentQuestion} in game: ${gameId}`);
        }, 1000);
      }
    }
  });

  socket.on('playerFinished', ({ gameId, playerId }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    game.finishedPlayers.add(socket.id);
    io.to(gameId).emit('playerFinished', socket.id);

    if (game.finishedPlayers.size === game.players.length) {
      game.isGameEnded = true;
      io.to(gameId).emit('gameOver', serializeGameState(game));
      console.log(`Game ${gameId} ended - all players finished`);
    }
  });

  socket.on('chatMessage', ({ gameId, message }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (player) {
      const chatMessage = {
        id: nanoid(),
        playerId: socket.id,
        playerName: player.username,
        message,
        timestamp: Date.now()
      };

      game.chatMessages.push(chatMessage);
      io.to(gameId).emit('newChatMessage', chatMessage);
      console.log(`Chat message from ${player.username} in game: ${gameId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    for (const [gameId, game] of activeGames.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        game.scores.delete(socket.id);
        
        if (game.players.length === 0) {
          activeGames.delete(gameId);
          console.log(`Game ${gameId} deleted - no players remaining`);
        } else {
          io.to(gameId).emit('gameUpdated', serializeGameState(game));
          console.log(`Player removed from game: ${gameId}`);
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});