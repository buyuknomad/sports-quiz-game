// Category selection component with updated design and animations
import React from 'react';
import { Trophy, ShoppingBasket as Basketball, Tent as Tennis, Medal, Dumbbell } from 'lucide-react';
import type { Category } from '../types';
import { useGameStore } from '../store/gameStore';

interface CategorySelectProps {
  onSelect: (category: Category) => void;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({ onSelect }) => {
  const { setCategory } = useGameStore();

  const categories = [
    { id: 'football', name: 'Football', emoji: '⚽', icon: Trophy },
    { id: 'basketball', name: 'Basketball', emoji: '🏀', icon: Basketball },
    { id: 'tennis', name: 'Tennis', emoji: '🎾', icon: Tennis },
    { id: 'olympics', name: 'Olympics', emoji: '🏅', icon: Medal },
    { id: 'mixed', name: 'Mixed Sports', emoji: '🎯', icon: Dumbbell },
  ] as const;

  const handleCategorySelect = (category: Category) => {
    setCategory(category);
    onSelect(category);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center mb-12">
          Choose Your Category
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(({ id, name, emoji, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleCategorySelect(id as Category)}
              className="group relative bg-gray-800 rounded-2xl p-8 hover:bg-gray-700 
                       transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 flex items-center justify-center bg-green-600 
                              rounded-full group-hover:bg-green-500 transition-colors">
                  <Icon size={32} className="text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                    <span>{name}</span>
                    <span className="text-3xl">{emoji}</span>
                  </h2>
                  <p className="mt-2 text-gray-400 text-sm">
                    Test your {name.toLowerCase()} knowledge
                  </p>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 h-1 bg-green-600 transform scale-x-0 
                            group-hover:scale-x-100 transition-transform origin-left rounded-b-2xl">
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};