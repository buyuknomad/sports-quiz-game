// Main quiz game component with improved score tracking and concurrency fixes
import React, { useState, useEffect, useCallback, startTransition } from 'react';
import { useGameStore } from '../store/gameStore';
import { quickChatMessages } from '../constants/chat';
import { Timer, AlertCircle, MessageCircle, X, Clock } from 'lucide-react';

const QuizGame: React.FC = () => {
  const { 
    timeRemaining, 
    setTimeRemaining, 
    currentQuestion, 
    questions,
    checkAnswer,
    players,
    mode,
    chatMessages,
    addChatMessage,
    isGameEnded,
    submitAnswer,
    isTransitioning,
    setIsTransitioning,
    getCurrentPlayer,
    getPlayerResponseTimes
  } = useGameStore();
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [localTime, setLocalTime] = useState(15);
  const [showChat, setShowChat] = useState(false);
  const [isButtonEnabled, setIsButtonEnabled] = useState(true);
  const [earnedPoints, setEarnedPoints] = useState(0);
  
  const currentPlayer = getCurrentPlayer();
  const question = questions[currentQuestion];
  const isMultiplayer = mode === '1v1' || mode === 'multiplayer';

  // Get response times for current player
  const currentPlayerResponseTimes = currentPlayer ? getPlayerResponseTimes(currentPlayer.id) : [];
  const lastResponseTime = currentPlayerResponseTimes[currentPlayerResponseTimes.length - 1];
  const totalResponseTime = currentPlayerResponseTimes.reduce((sum, time) => sum + time, 0);

  useEffect(() => {
    console.log('Question changed, resetting state:', {
      currentQuestion,
      questionContent: question?.question
    });
    
    startTransition(() => {
      setIsButtonEnabled(true);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
      setIsCorrect(false);
      setLocalTime(15);
      setEarnedPoints(0);
    });
  }, [currentQuestion, question]);

  const handleAnswerSelect = useCallback((answer: string) => {
    if (!isButtonEnabled || !currentPlayer) return;
    
    setIsButtonEnabled(false);
    setSelectedAnswer(answer);
    const correct = checkAnswer(answer);
    setIsCorrect(correct);
    setIsAnswerChecked(true);

    // Calculate earned points
    let points = 0;
    if (correct) {
      points = 10 + Math.floor(localTime / 3);
    }
    setEarnedPoints(points);

    // Get current total score and calculate new total
    const currentScore = currentPlayer.score || 0;
    const newTotalScore = currentScore + points;

    // Submit answer with new total score
    startTransition(() => {
      submitAnswer(answer, localTime, points, newTotalScore);
    });
  }, [currentPlayer, localTime, checkAnswer, submitAnswer, isButtonEnabled]);

  const handleTimeUp = useCallback(() => {
    if (!isAnswerChecked && isButtonEnabled && currentPlayer) {
      setIsButtonEnabled(false);
      setIsAnswerChecked(true);
      setIsCorrect(false);
      setEarnedPoints(0);
      
      // When time is up, no points are earned
      const currentScore = currentPlayer.score || 0;
      startTransition(() => {
        submitAnswer('', 0, 0, currentScore);
      });
    }
  }, [isAnswerChecked, submitAnswer, isButtonEnabled, currentPlayer]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isAnswerChecked && !isGameEnded && isButtonEnabled) {
      timer = setInterval(() => {
        setLocalTime((prev) => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isAnswerChecked, handleTimeUp, isGameEnded, isButtonEnabled]);

  useEffect(() => {
    startTransition(() => {
      setTimeRemaining(localTime);
    });
  }, [localTime, setTimeRemaining]);

  const getResponseTimeColor = (time: number) => {
    if (time < 3) return 'text-green-400';
    if (time < 7) return 'text-yellow-400';
    return 'text-orange-400';
  };

  if (isGameEnded || !question) return null;

  const timerWidth = `${(localTime / 15) * 100}%`;
  const questionNumber = currentQuestion + 1;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
      {isMultiplayer && (
        <div className="w-full max-w-2xl mb-6 bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === currentPlayer?.id ? 'bg-green-600' : 'bg-gray-700'
                }`}
              >
                <span className="text-white font-medium truncate">
                  {player.username}
                </span>
                <span className="text-white font-bold">{player.score || 0}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-gray-400">
            <Timer size={20} />
            <span>{localTime} seconds</span>
          </div>
          <div className="text-gray-400">
            Question {questionNumber}/{questions.length}
          </div>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
            style={{ width: timerWidth }}
          />
        </div>
      </div>

      <div className="w-full max-w-2xl bg-gray-800 rounded-2xl p-8 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-8">
          {question.question}
        </h2>
        
        <div className="grid gap-4">
          {question.options.map((option) => {
            let buttonClass = "p-4 rounded-xl text-left transition-all transform hover:scale-[1.02] ";
            
            if (!isAnswerChecked) {
              buttonClass += "bg-gray-700 hover:bg-gray-600 text-white";
            } else if (option === question.correctAnswer) {
              buttonClass += "bg-green-600 text-white";
            } else if (option === selectedAnswer) {
              buttonClass += "bg-red-600 text-white";
            } else {
              buttonClass += "bg-gray-700 text-gray-400";
            }

            return (
              <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={!isButtonEnabled}
                className={buttonClass}
              >
                {option}
              </button>
            );
          })}
        </div>

        {isAnswerChecked && (
          <div className="mt-6 flex flex-col gap-2">
            <div className={`flex items-center gap-2 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              <AlertCircle size={20} />
              <span>
                {isCorrect 
                  ? `Correct! +${earnedPoints} points` 
                  : `Wrong! The correct answer was ${question.correctAnswer}`}
              </span>
            </div>
            {lastResponseTime !== undefined && (
              <div className={`flex items-center gap-2 ${getResponseTimeColor(lastResponseTime)}`}>
                <Clock size={16} />
                <span className="text-sm">
                  You answered in {lastResponseTime.toFixed(1)} seconds
                  {totalResponseTime > 0 && ` (total ${totalResponseTime.toFixed(1)} seconds)`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {isMultiplayer && (
        <div className="fixed bottom-4 right-4 flex flex-col items-end">
          <button
            onClick={() => setShowChat(!showChat)}
            className="mb-2 p-3 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            {showChat ? <X size={24} /> : <MessageCircle size={24} />}
          </button>

          {showChat && (
            <>
              <div className="mb-2 w-64 bg-gray-800 rounded-lg p-3 max-h-40 overflow-y-auto">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-2 text-sm ${
                      msg.playerId === currentPlayer?.id
                        ? 'text-green-400'
                        : 'text-white'
                    }`}
                  >
                    <span className="font-bold">{msg.playerName}:</span> {msg.message}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 w-64">
                {quickChatMessages.map(({ emoji, text }) => (
                  <button
                    key={text}
                    onClick={() => currentPlayer && addChatMessage(currentPlayer.id, `${emoji} ${text}`)}
                    className="p-2 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    {emoji} {text}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!isMultiplayer && (
        <div className="mt-6 text-gray-400">
          Score: <span className="text-green-500 font-bold">{currentPlayer?.score || 0}</span>
        </div>
      )}
    </div>
  );
};

export default QuizGame;