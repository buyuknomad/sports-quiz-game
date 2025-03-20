// Welcome screen component with updated game mode selection design and preserved login state
import React from 'react';
import { Trophy, User } from 'lucide-react';
import type { GameMode } from '../types';

interface WelcomeScreenProps {
  onStart: (username: string, mode: GameMode) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  const username = localStorage.getItem('username') || '';
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-4xl md:text-5xl font-bold mb-12 text-white text-center">
        Select Game Mode
      </h1>
      
      <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => onStart(username, 'solo')}
          className="group relative bg-gray-800 rounded-2xl p-8 hover:bg-gray-700 
                   transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center bg-green-600 
                          rounded-full group-hover:bg-green-500 transition-colors">
              <Trophy size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Solo 🏀</h2>
            <p className="text-gray-400 text-center text-sm">
              Practice mode with no time pressure
            </p>
          </div>
        </button>

        <button
          onClick={() => onStart(username, '1v1')}
          className="group relative bg-gray-800 rounded-2xl p-8 hover:bg-gray-700 
                   transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center bg-green-600 
                          rounded-full group-hover:bg-green-500 transition-colors">
              <User size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">1v1 ⚽</h2>
            <p className="text-gray-400 text-center text-sm">
              Challenge a friend in real-time
            </p>
          </div>
        </button>
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-400">
          Playing as: <span className="text-green-400 font-semibold">{username}</span>
        </p>
      </div>
    </div>
  );
}