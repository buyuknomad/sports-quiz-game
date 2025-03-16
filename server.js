// Express server for handling multiplayer game state with environment-aware CORS and WebSocket configuration
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Configure CORS based on environment
const corsOrigin = process.env.NODE_ENV === 'production'
  ? process.env.CLIENT_URL || true  // Use CLIENT_URL if set, otherwise allow all origins
  : "http://localhost:5173";

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true, // Enable compatibility mode
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

app.use(express.json());

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In development, provide a simple health check endpoint
  app.get('/', (req, res) => {
    res.json({ status: 'Server is running' });
  });
}

// Store active games in memory
const activeGames = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle creating a new game
  socket.on('createGame', ({ mode, category, username }) => {
    const gameId = nanoid(6);
    const game = {
      gameId,
      mode,
      category,
      players: [{
        id: socket.id,
        username,
        score: 0,
        isReady: false
      }],
      currentQuestion: 0,
      isGameStarted: false,
      isGameEnded: false,
      chatMessages: [],
      startCountdown: null,
      answeredPlayers: new Set()
    };

    activeGames.set(gameId, game);
    socket.join(gameId);
    socket.emit('gameCreated', game);
    console.log(`Game created: ${gameId} by ${username}`);
  });

  // Handle joining a game
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
      isReady: false
    };

    game.players.push(newPlayer);
    socket.join(gameId);
    io.to(gameId).emit('gameUpdated', game);
    console.log(`Player ${username} joined game: ${gameId}`);
  });

  // Handle player ready state
  socket.on('playerReady', ({ gameId }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    const player = game.players.find(p => p.id === socket.id);
    if (!player) return;

    player.isReady = true;
    io.to(gameId).emit('gameUpdated', game);
    console.log(`Player ${player.username} ready in game: ${gameId}`);

    // Check if all players are ready
    const allReady = game.players.length >= 2 && game.players.every(p => p.isReady);
    
    if (allReady && game.startCountdown === null) {
      // Start countdown from 3
      game.startCountdown = 3;
      io.to(gameId).emit('gameUpdated', game);

      const countdownInterval = setInterval(() => {
        if (game.startCountdown > 0) {
          game.startCountdown--;
          io.to(gameId).emit('gameUpdated', game);
        } else {
          clearInterval(countdownInterval);
          game.isGameStarted = true;
          game.startCountdown = null;
          io.to(gameId).emit('gameStarted', game);
          console.log(`Game ${gameId} started`);
        }
      }, 1000);
    }
  });

  // Handle answer submission
  socket.on('submitAnswer', ({ gameId, answer, timeRemaining }) => {
    const game = activeGames.get(gameId);
    if (!game) return;

    game.answeredPlayers.add(socket.id);
    console.log(`Player ${socket.id} submitted answer in game: ${gameId}`);

    // Check if all players have answered
    if (game.answeredPlayers.size === game.players.length) {
      game.answeredPlayers.clear();
      
      // Check if this was the last question
      if (game.currentQuestion === 9) { // Assuming 10 questions total (0-9)
        game.isGameEnded = true;
        io.to(gameId).emit('gameOver', game);
        console.log(`Game ${gameId} ended`);
      } else {
        game.currentQuestion++;
        io.to(gameId).emit('nextQuestion', game);
        console.log(`Next question (${game.currentQuestion}) in game: ${gameId}`);
      }
    }
  });

  // Handle chat messages
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

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Remove player from their game
    for (const [gameId, game] of activeGames.entries()) {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        if (game.players.length === 0) {
          activeGames.delete(gameId);
          console.log(`Game ${gameId} deleted - no players remaining`);
        } else {
          io.to(gameId).emit('gameUpdated', game);
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