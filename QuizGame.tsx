// Main quiz game component with single and multiplayer game handling
import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore, quickChatMessages } from '../store/gameStore';
import { Timer, AlertCircle, MessageSquare, X } from 'lucide-react';

export const QuizGame: React.FC = () => {
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
    submitAnswer
  } = useGameStore();
  
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [localTime, setLocalTime] = useState(15);
  const [showChat, setShowChat] = useState(false);
  
  const currentPlayer = players[0];
  const question = questions[currentQuestion];
  const isMultiplayer = mode === '1v1' || mode === 'multiplayer';

  const handleAnswerSelect = useCallback((answer: string) => {
    if (isAnswerChecked || !currentPlayer) return;
    
    setSelectedAnswer(answer);
    const correct = checkAnswer(answer);
    setIsCorrect(correct);
    setIsAnswerChecked(true);
    
    submitAnswer(answer, localTime);
  }, [currentPlayer, localTime, isAnswerChecked, checkAnswer, submitAnswer]);

  const handleTimeUp = useCallback(() => {
    if (!isAnswerChecked) {
      setIsAnswerChecked(true);
      setIsCorrect(false);
      submitAnswer('', 0);
    }
  }, [isAnswerChecked, submitAnswer]);

  const handleQuickChat = (message: string) => {
    if (currentPlayer) {
      addChatMessage(currentPlayer.id, message);
    }
  };

  // Timer effect
  useEffect(() => {
    if (!isAnswerChecked && !isGameEnded) {
      const timer = setInterval(() => {
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
  }, [isAnswerChecked, handleTimeUp, isGameEnded]);

  useEffect(() => {
    setTimeRemaining(localTime);
  }, [localTime, setTimeRemaining]);

  // Reset state for next question
  useEffect(() => {
    setSelectedAnswer(null);
    setIsAnswerChecked(false);
    setIsCorrect(false);
    setLocalTime(15);
  }, [currentQuestion]);

  if (!question) return null;

  const timerWidth = `${(localTime / 15) * 100}%`;
  const questionNumber = currentQuestion + 1;

  const getFeedbackMessage = () => {
    if (!isAnswerChecked) return '';
    if (!isCorrect) return `Time's up! The correct answer was ${question.correctAnswer}`;
    return `Correct! +${10 + Math.floor(localTime / 3)} points`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
      {/* Multiplayer scoreboard */}
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
                <span className="text-white font-bold">{player.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timer and progress */}
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

      {/* Question card */}
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
                onClick={() => !isAnswerChecked && handleAnswerSelect(option)}
                disabled={isAnswerChecked}
                className={buttonClass}
              >
                {option}
              </button>
            );
          })}
        </div>

        {/* Feedback message */}
        {isAnswerChecked && (
          <div className={`mt-6 flex items-center gap-2 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
            <AlertCircle size={20} />
            <span>{getFeedbackMessage()}</span>
          </div>
        )}
      </div>

      {/* Quick chat for multiplayer */}
      {isMultiplayer && (
        <div className="fixed bottom-4 right-4 flex flex-col items-end">
          <button
            onClick={() => setShowChat(!showChat)}
            className="mb-2 p-3 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
          >
            {showChat ? <X size={24} /> : <MessageSquare size={24} />}
          </button>

          {showChat && (
            <>
              {/* Chat messages */}
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

              {/* Quick chat buttons */}
              <div className="grid grid-cols-2 gap-2 w-64">
                {quickChatMessages.map(({ emoji, text }) => (
                  <button
                    key={text}
                    onClick={() => handleQuickChat(`${emoji} ${text}`)}
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

      {/* Score display for solo mode */}
      {!isMultiplayer && (
        <div className="mt-6 text-gray-400">
          Score: <span className="text-green-500 font-bold">{currentPlayer?.score || 0}</span>
        </div>
      )}
    </div>
  );
};