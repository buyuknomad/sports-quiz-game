// Main App component with improved state management and player persistence
import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './components/Home';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CategorySelect } from './components/CategorySelect';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import QuizGame from './components/QuizGame';
import SoloResultsScreen from './components/SoloResultsScreen';
import { MultiplayerResultsScreen } from './components/MultiplayerResultsScreen';
import { OneVsOneResultsScreen } from './components/OneVsOneResultsScreen';
import { InviteSystem } from './components/InviteSystem';
import { useGameStore } from './store/gameStore';
import type { GameMode, Category } from './types';

function App() {
  const [gameState, setGameState] = useState<'home' | 'welcome' | 'invite' | 'category' | 'lobby' | 'game' | 'results'>('home');
  const { 
    initializeGame, 
    addPlayer,
    setCategory,
    mode, 
    getCurrentPlayer, 
    players, 
    isGameStarted, 
    isGameEnded,
    resetGame 
  } = useGameStore();

  const handleHomeStart = (username: string) => {
    localStorage.setItem('username', username);
    resetGame();
    setGameState('welcome');
  };

  const handleStart = (username: string, selectedMode: GameMode) => {
    resetGame();
    initializeGame(selectedMode, 'mixed');
    if (selectedMode === 'solo') {
      addPlayer(username);
    }
    setGameState(selectedMode === 'solo' ? 'category' : 'invite');
  };

  const handlePlayAgain = () => {
    const username = localStorage.getItem('username') || 'Guest';
    const currentMode = mode;
    
    resetGame();
    initializeGame(currentMode, 'mixed');
    
    if (currentMode === 'solo') {
      addPlayer(username);
    }
    
    setGameState('category');
  };

  const handleInviteSuccess = () => {
    const currentPlayer = getCurrentPlayer();
    const isHost = currentPlayer?.isHost;
    
    if (mode === '1v1' && !isHost) {
      setGameState('lobby');
    } else {
      setGameState(isHost ? 'category' : 'lobby');
    }
  };

  const handleCategorySelect = (category: Category) => {
    setCategory(category);
    setGameState('lobby');
  };

  const handleReturnToModeSelect = () => {
    resetGame();
    setGameState('welcome');
  };

  const handleSoloHome = () => {
    handleReturnToModeSelect();
  };

  const handleMultiplayerHome = () => {
    handleReturnToModeSelect();
  };

  useEffect(() => {
    if (isGameStarted && !isGameEnded && gameState !== 'game') {
      setGameState('game');
    }
  }, [isGameStarted, isGameEnded, gameState]);

  useEffect(() => {
    if (isGameEnded && gameState !== 'results') {
      setGameState('results');
    }
  }, [isGameEnded, gameState]);

  useEffect(() => {
    if (gameState === 'category' && mode === '1v1') {
      const currentPlayer = getCurrentPlayer();
      if (currentPlayer && !currentPlayer.isHost) {
        setGameState('lobby');
      }
    }
  }, [gameState, mode, getCurrentPlayer]);

  return (
    <ErrorBoundary>
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
          mode === '1v1' ? (
            getCurrentPlayer()?.isHost ? (
              <CategorySelect onSelect={handleCategorySelect} />
            ) : (
              <MultiplayerLobby />
            )
          ) : (
            <CategorySelect onSelect={handleCategorySelect} />
          )
        )}
        {gameState === 'lobby' && (
          <MultiplayerLobby />
        )}
        {gameState === 'game' && (
          <QuizGame />
        )}
        {gameState === 'results' && players.length > 0 && (
          mode === 'solo' ? (
            <SoloResultsScreen onPlayAgain={handlePlayAgain} onHome={handleSoloHome} />
          ) : mode === '1v1' ? (
            <OneVsOneResultsScreen onPlayAgain={handlePlayAgain} onHome={handleMultiplayerHome} />
          ) : (
            <MultiplayerResultsScreen onPlayAgain={handlePlayAgain} onHome={handleMultiplayerHome} />
          )
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;