// Invite system component for creating and joining games
import React, { useState } from 'react';
import { Copy, UserPlus, Users } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

interface InviteSystemProps {
  onJoinSuccess: () => void;
}

export const InviteSystem: React.FC<InviteSystemProps> = ({ onJoinSuccess }) => {
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const { gameId, joinGame } = useGameStore();
  const username = localStorage.getItem('username') || '';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gameId);
  };

  const handleJoinGame = () => {
    if (joinCode.trim()) {
      joinGame(joinCode.trim(), username);
      onJoinSuccess();
    } else {
      setError('Please enter a game code');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          {showJoin ? 'Join Game 🎮' : 'Create Game 🎮'}
        </h1>

        {!showJoin ? (
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">
                Share this code with your friends
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={gameId}
                  readOnly
                  className="flex-1 p-3 rounded-lg bg-gray-700 text-white font-mono text-lg"
                />
                <button
                  onClick={handleCopyCode}
                  className="p-3 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  <Copy size={24} />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowJoin(true)}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Want to join instead?
              </button>
              <button
                onClick={onJoinSuccess}
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white 
                         transition-colors flex items-center gap-2"
              >
                <Users size={20} />
                Continue
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="mb-6">
              <label className="block text-gray-400 text-sm mb-2">
                Enter game code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value);
                  setError('');
                }}
                placeholder="Enter code"
                className="w-full p-3 rounded-lg bg-gray-700 text-white font-mono text-lg 
                         border-2 border-transparent focus:border-green-500 focus:outline-none"
              />
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowJoin(false)}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                Create a game instead?
              </button>
              <button
                onClick={handleJoinGame}
                className="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white 
                         transition-colors flex items-center gap-2"
              >
                <UserPlus size={20} />
                Join Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};