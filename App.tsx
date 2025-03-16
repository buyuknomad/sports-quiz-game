// Main App component with updated routing for Home screen
import React, { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CategorySelect } from './components/CategorySelect';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { QuizGame } from './components/QuizGame';
import { ResultsScreen } from './components/ResultsScreen';
import { InviteSystem } from './components/InviteSystem';
import { useGameStore } from './store/gameStore';
import type { GameMode } from './types';

function App() {
  const [gameState, setGameState] = useState<'home' | 'welcome' | 'invite' | 'category' | 'lobby' | 'game' | 'results'>('home');
  const { initializeGame, addPlayer, mode, getCurrentPlayer, players, isGameStarted } = useGameStore();

  const handleHomeStart = (username: string) => {
    localStorage.setItem('username', username);
    setGameState('welcome');
  };

  const handleStart = (username: string, selectedMode: GameMode) => {
    initializeGame(selectedMode, 'mixed');
    addPlayer(username);
    if (selectedMode === 'solo') {
      setGameState('category');
    } else {
      setGameState('invite');
    }
  };

  const handleInviteSuccess = () => {
    const currentPlayer = getCurrentPlayer();
    // If player is the host (first player), go to category selection
    // Otherwise, go directly to lobby
    if (currentPlayer && players.indexOf(currentPlayer) === 0) {
      setGameState('category');
    } else {
      setGameState('lobby');
    }
  };

  const handleCategorySelect = (category: Category) => {
    if (mode === 'solo') {
      setGameState('game');
    } else {
      setGameState('lobby');
    }
  };

  const handlePlayAgain = () => {
    setGameState('category');
  };

  const handleHome = () => {
    setGameState('home');
  };

  // Listen for game start
  useEffect(() => {
    if (isGameStarted && gameState !== 'game') {
      setGameState('game');
    }
  }, [isGameStarted, gameState]);

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {gameState === 'home' && (
        <Home onStart={handleHomeStart} />
      )}
      {gameState === 'welcome' && (
        <WelcomeScreen onStart={handleStart} />
      )}
      {gameState === 'invite' && (
        <InviteSystem onJoinSuccess={handleInviteSuccess} />
      )}
      {gameState === 'category' && (
        <CategorySelect onSelect={handleCategorySelect} />
      )}
      {gameState === 'lobby' && (
        <MultiplayerLobby />
      )}
      {gameState === 'game' && (
        <QuizGame />
      )}
      {gameState === 'results' && (
        <ResultsScreen onPlayAgain={handlePlayAgain} onHome={handleHome} />
      )}
    </div>
  );
}

export default App;