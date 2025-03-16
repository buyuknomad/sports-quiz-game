// Multiplayer lobby component with ready system and automatic start
import React, { useState } from 'react';
import { Copy, MessageCircle, Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const MultiplayerLobby: React.FC = () => {
  const { 
    gameId, 
    players,
    setPlayerReady,
    mode,
    addChatMessage,
    startCountdown,
    getCurrentPlayer
  } = useGameStore();
  
  const [message, setMessage] = useState('');
  const currentPlayer = getCurrentPlayer();
  const isHost = players.indexOf(currentPlayer) === 0;
  const requiredPlayers = mode === '1v1' ? 2 : 2;

  const copyInviteCode = () => {
    navigator.clipboard.writeText(gameId);
  };

  const handleSendMessage = () => {
    if (message.trim() && currentPlayer) {
      addChatMessage(currentPlayer.id, message.trim());
      setMessage('');
    }
  };

  const handleReady = () => {
    if (currentPlayer) {
      setPlayerReady();
    }
  };

  const allPlayersReady = players.length >= requiredPlayers && players.every(p => p.isReady);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl bg-gray-800 rounded-lg p-6 shadow-xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Game Lobby</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={gameId}
              readOnly
              className="bg-gray-700 text-white px-3 py-1 rounded font-mono text-sm"
            />
            <button
              onClick={copyInviteCode}
              className="p-2 rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
              title="Copy invite code"
            >
              <Copy size={20} />
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl text-white flex items-center gap-2">
              <Users size={24} />
              Players ({players.length}/{mode === '1v1' ? '2' : '6'})
            </h3>
            {currentPlayer && !currentPlayer.isReady && (
              <button
                onClick={handleReady}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Ready Up
              </button>
            )}
          </div>

          <div className="grid gap-3">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  player.id === currentPlayer?.id ? 'bg-gray-700' : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-white font-medium">{player.username}</span>
                  {player.id === currentPlayer?.id && (
                    <span className="text-xs bg-green-600/20 text-green-400 px-2 py-1 rounded">
                      You
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {player.isReady ? (
                    <span className="text-green-400">Ready</span>
                  ) : (
                    <span className="text-gray-400">Not Ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Send a message..."
              className="flex-1 p-2 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={handleSendMessage}
              className="p-2 rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
            >
              <MessageCircle size={20} />
            </button>
          </div>

          {startCountdown !== null && (
            <div className="text-center">
              <p className="text-2xl text-green-400 font-bold animate-pulse">
                Game starting in {startCountdown}...
              </p>
            </div>
          )}

          {startCountdown === null && (
            <div className="text-center text-gray-400">
              {allPlayersReady ? (
                <p>All players ready! Starting game...</p>
              ) : (
                <p>Waiting for all players to be ready...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};