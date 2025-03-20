// 1v1 Results screen component with rematch functionality and accurate per-player response times
import React, { useEffect, useCallback } from 'react';
import { Trophy, Home, RotateCw, Share2, Timer, Target, Award, CheckCircle, XCircle, Zap, Medal, Crown } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../store/gameStore';
import type { Category, Player } from '../types';

interface OneVsOneResultsScreenProps {
  onPlayAgain: () => void;
  onHome: () => void;
}

const categoryEmojis: Record<Category, string> = {
  football: '⚽',
  basketball: '🏀',
  tennis: '🎾',
  olympics: '🏅',
  mixed: '🎯'
};

// Memoized player stats component
const PlayerStats = React.memo(({ 
  player,
  isWinner,
  totalQuestions,
  playerResponseTimes
}: {
  player: Player;
  isWinner: boolean;
  totalQuestions: number;
  playerResponseTimes: number[];
}) => {
  const correctAnswers = Math.floor(player.score / 15); // Each correct answer is worth 15 points max
  const accuracy = (correctAnswers / totalQuestions) * 100;

  // Use the passed response times array which could come from either source
  const validResponseTimes = playerResponseTimes.filter(time => time > 0 && time <= 15);
  const avgResponseTime = validResponseTimes.length > 0
    ? validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
    : 0;
  const fastestResponse = validResponseTimes.length > 0
    ? Math.min(...validResponseTimes)
    : 0;
  const slowestResponse = validResponseTimes.length > 0
    ? Math.max(...validResponseTimes)
    : 0;

  console.log(`Response times for ${player.username}:`, {
    responseTimes: playerResponseTimes,
    validResponseTimes,
    avgResponseTime,
    fastestResponse,
    slowestResponse
  });

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 ${
      isWinner ? 'ring-2 ring-yellow-400' : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isWinner && <Crown className="w-6 h-6 text-yellow-400" />}
          <h3 className="text-xl font-bold text-white">{player.username}</h3>
        </div>
        <div className="text-3xl font-bold text-green-400">{player.score}</div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Correct Answers</span>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 font-bold">{correctAnswers}/{totalQuestions}</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Accuracy</span>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 font-bold">{accuracy.toFixed(1)}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Avg Response Time</span>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 font-bold">{avgResponseTime.toFixed(1)}s</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Fastest Response</span>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-bold">{fastestResponse.toFixed(1)}s</span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400">Slowest Response</span>
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-red-400" />
            <span className="text-red-400 font-bold">{slowestResponse.toFixed(1)}s</span>
          </div>
        </div>

        {isWinner && (
          <div className="mt-4 flex items-center justify-center">
            <div className="bg-yellow-400/10 text-yellow-400 px-4 py-2 rounded-full font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Winner!
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PlayerStats.displayName = 'PlayerStats';

// Memoized action buttons component with rematch status
const ActionButtons = React.memo(({ onPlayAgain, onHome, onRematch, rematchRequested, bothPlayersRequested, onShare }: {
  onPlayAgain: () => void;
  onHome: () => void;
  onRematch: () => void;
  rematchRequested: boolean;
  bothPlayersRequested: boolean;
  onShare: () => void;
}) => (
  <div className="grid grid-cols-3 gap-4">
    <button
      onClick={onRematch}
      disabled={rematchRequested}
      className={`flex items-center justify-center gap-2 p-4 rounded-xl 
                 ${rematchRequested 
                   ? 'bg-gray-600 cursor-not-allowed' 
                   : 'bg-green-600 hover:bg-green-700'} 
                 text-white font-semibold transition-all transform 
                 hover:scale-[1.02] active:scale-[0.98] group`}
    >
      <RotateCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
      {rematchRequested ? 'Waiting...' : 'Rematch'}
    </button>
    <button
      onClick={onHome}
      className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gray-700 
               hover:bg-gray-600 text-white font-semibold transition-all transform 
               hover:scale-[1.02] active:scale-[0.98] group"
    >
      <Home className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
      Home
    </button>
    <button
      onClick={onShare}
      className="flex items-center justify-center gap-2 p-4 rounded-xl bg-blue-600 
               hover:bg-blue-700 text-white font-semibold transition-all transform 
               hover:scale-[1.02] active:scale-[0.98] group"
    >
      <Share2 className="w-5 h-5 group-hover:rotate-45 transition-transform" />
      Share
    </button>
  </div>
));

ActionButtons.displayName = 'ActionButtons';

export const OneVsOneResultsScreen = React.memo<OneVsOneResultsScreenProps>(({ onPlayAgain, onHome }) => {
  const { 
    players, 
    category, 
    questions, 
    completionTime = 0,
    gameId,
    socket,
    getCurrentPlayer,
    getPlayerResponseTimes,
    playerResponseTimes
  } = useGameStore();
  
  const [rematchRequested, setRematchRequested] = React.useState(false);
  const [bothPlayersRequested, setBothPlayersRequested] = React.useState(false);
  const currentPlayer = getCurrentPlayer();
  const categoryEmoji = categoryEmojis[category];

  // Sort players by score
  const sortedPlayers = React.useMemo(() => 
    [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  const winner = sortedPlayers[0];
  const loser = sortedPlayers[1];
  const isTied = winner?.score === loser?.score;

  // Get response times using multiple sources to ensure we have data
  const getResponseTimes = (playerId: string) => {
    // Try to get from player object first (server-side data)
    const player = players.find(p => p.id === playerId);
    if (player?.responseTimes && player.responseTimes.length > 0) {
      console.log(`Using server-side response times for ${player.username}:`, player.responseTimes);
      return player.responseTimes;
    }
    
    // Then try from the store's playerResponseTimes Map (client-side data)
    const responseTimesFromMap = playerResponseTimes.get(playerId);
    if (responseTimesFromMap && responseTimesFromMap.length > 0) {
      console.log(`Using client-side response times for ${playerId}:`, responseTimesFromMap);
      return responseTimesFromMap;
    }
    
    // Finally, try the getPlayerResponseTimes function
    const responseTimesFromFunc = getPlayerResponseTimes(playerId);
    if (responseTimesFromFunc && responseTimesFromFunc.length > 0) {
      console.log(`Using function response times for ${playerId}:`, responseTimesFromFunc);
      return responseTimesFromFunc;
    }
    
    console.warn(`No response times found for player ${playerId}`);
    return [];
  };

  // Handle rematch request
  const handleRematch = useCallback(() => {
    if (!socket || !gameId || !currentPlayer) return;
    
    setRematchRequested(true);
    socket.emit('requestRematch', { gameId, playerId: currentPlayer.id });
  }, [socket, gameId, currentPlayer]);

  // Listen for rematch-related events
  useEffect(() => {
    if (!socket) return;

    const handleRematchRequested = ({ playerId }: { playerId: string }) => {
      if (playerId !== currentPlayer?.id) {
        setBothPlayersRequested(true);
      }
    };

    const handleGoToLobby = () => {
      setRematchRequested(false);
      setBothPlayersRequested(false);
      onPlayAgain();
    };

    socket.on('rematchRequested', handleRematchRequested);
    socket.on('goToLobby', handleGoToLobby);

    return () => {
      socket.off('rematchRequested', handleRematchRequested);
      socket.off('goToLobby', handleGoToLobby);
    };
  }, [socket, currentPlayer, onPlayAgain]);

  // Trigger confetti effect on mount
  useEffect(() => {
    if (!isTied && winner) {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: NodeJS.Timer = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isTied, winner]);

  // Handle share score
  const handleShare = useCallback(async () => {
    if (!winner || !loser) return;
    
    const shareText = isTied
      ? `🎮 We tied ${winner.score}-${loser.score} in the ${category} Sports Quiz! Can you beat us? #SportsQuiz`
      : `🎮 I ${winner.username === (currentPlayer?.username || '') ? 'won' : 'lost'} ${winner.score}-${loser.score} in the ${category} Sports Quiz! Challenge me! #SportsQuiz`;
    
    try {
      if (navigator.share && navigator.canShare && navigator.canShare({ text: shareText })) {
        await navigator.share({
          title: 'Sports Quiz Match Result',
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert('Result copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Result copied to clipboard!');
      } catch (clipboardError) {
        console.error('Clipboard failed:', clipboardError);
        alert('Unable to share result. Please try again.');
      }
    }
  }, [winner, loser, category, isTied, currentPlayer]);

  // Log available data for debugging
  useEffect(() => {
    console.log("Results Screen Data:", {
      players,
      playerResponseTimes: Array.from(playerResponseTimes.entries())
    });
    
    sortedPlayers.forEach(player => {
      console.log(`Response times for ${player.username}:`, {
        fromPlayer: player.responseTimes,
        fromMap: playerResponseTimes.get(player.id),
        fromFunc: getPlayerResponseTimes(player.id),
        combined: getResponseTimes(player.id)
      });
    });
  }, [players, playerResponseTimes, getPlayerResponseTimes, sortedPlayers]);

  if (!sortedPlayers.length) {
    return <div className="text-white text-center p-8">Loading results...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="w-full max-w-3xl bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-gray-700/50">
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <Trophy className="w-24 h-24 text-yellow-400 animate-bounce filter drop-shadow-lg" />
            <span className="absolute top-12 right-0 text-4xl animate-pulse">
              {categoryEmoji}
            </span>
            <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full" />
          </div>
          
          <h2 className="text-4xl font-bold text-white mt-6 mb-2">Match Complete!</h2>
          {isTied ? (
            <p className="text-2xl text-blue-400 font-bold mb-2">It's a tie! 🤝</p>
          ) : (
            <p className="text-2xl text-green-400 font-bold mb-2">
              {winner?.username} wins! 🏆
            </p>
          )}
          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Timer className="w-4 h-4" />
            <span>Match duration: {completionTime.toFixed(1)}s</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {sortedPlayers.map((player, index) => (
            <PlayerStats
              key={player.id}
              player={player}
              isWinner={index === 0 && !isTied}
              totalQuestions={questions.length}
              playerResponseTimes={getResponseTimes(player.id)}
            />
          ))}
        </div>

        <ActionButtons
          onPlayAgain={onPlayAgain}
          onHome={onHome}
          onRematch={handleRematch}
          rematchRequested={rematchRequested}
          bothPlayersRequested={bothPlayersRequested}
          onShare={handleShare}
        />

        <div className="mt-6 text-center">
          {rematchRequested && (
            <p className="text-yellow-400 text-sm animate-pulse">
              Waiting for opponent to accept rematch...
            </p>
          )}
          {bothPlayersRequested && (
            <p className="text-green-400 text-sm">
              Opponent wants a rematch too! Starting soon...
            </p>
          )}
          <p className="text-gray-400 text-sm mt-2">
            Challenge your friends to beat your score! 🎮
          </p>
        </div>
      </div>
    </div>
  );
});

OneVsOneResultsScreen.displayName = 'OneVsOneResultsScreen';