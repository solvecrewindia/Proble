import React, { useState, useEffect } from 'react';
import { dailyChallengeService } from '../../services/dailyChallengeService';

import { getDailyContent } from '../../utils/gameUtils';
import { debuggerData } from '../../data/gameData';
import { ArrowLeft, Bug, Check, X, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DebuggerGame = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const loadGame = async () => {
            const daily = await dailyChallengeService.getDailyChallenge();
            if (daily && daily.debugger) {
                setQuestions(daily.debugger);
            } else {
                const gameData = getDailyContent(debuggerData, 3);
                setQuestions(gameData);
            }
        };
        loadGame();
    }, []);

    const handleOptionClick = (index: number) => {
        if (showResult) return;
        setSelectedOption(index);
        setShowResult(true);

        if (index === questions[currentIndex].correct) {
            setScore(prev => prev + 1);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowResult(false);
        } else {
            setCompleted(true);
        }
    };

    if (questions.length === 0) return <div className="p-8 text-center">Loading Daily Bugs...</div>;

    if (completed) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center animate-in zoom-in duration-500">
                <div className="bg-surface p-12 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Bug className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Debugging Session Complete!</h2>
                    <p className="text-2xl font-bold text-primary mb-2">{score} / {questions.length} Bugs Squashed</p>
                    <p className="text-muted mb-8">Good eye! Keep practicing to write cleaner code.</p>
                    <button
                        onClick={() => navigate('/student/game')}
                        className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
                    >
                        Back to Games
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/student/game')}
                    className="flex items-center gap-2 text-muted hover:text-text transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>
                <div className="flex items-center gap-2 text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-full">
                    <Bug className="w-4 h-4" />
                    Bug {currentIndex + 1} / {questions.length}
                </div>
            </div>

            <div className="bg-surface rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 flex items-center gap-3">
                    <Code className="w-5 h-5 text-muted" />
                    <h3 className="font-bold text-lg">{currentQuestion.title}</h3>
                </div>

                <div className="p-6 md:p-8 bg-[#1e1e1e] text-white overflow-x-auto">
                    <pre className="font-mono text-sm md:text-base leading-relaxed">
                        <code>{currentQuestion.snippet}</code>
                    </pre>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option: string, idx: number) => (
                    <button
                        key={idx}
                        onClick={() => handleOptionClick(idx)}
                        disabled={showResult}
                        className={`
                            p-4 rounded-xl text-left font-medium transition-all border-2
                            ${showResult
                                ? idx === currentQuestion.correct
                                    ? 'bg-green-100 border-green-500 text-green-800'
                                    : idx === selectedOption
                                        ? 'bg-red-100 border-red-500 text-red-800'
                                        : 'bg-surface border-neutral-200 opacity-50'
                                : 'bg-surface border-neutral-200 hover:border-primary hover:bg-primary/5'
                            }
                        `}
                    >
                        <div className="flex items-center justify-between">
                            {option}
                            {showResult && idx === currentQuestion.correct && <Check className="w-5 h-5 text-green-600" />}
                            {showResult && idx === selectedOption && idx !== currentQuestion.correct && <X className="w-5 h-5 text-red-600" />}
                        </div>
                    </button>
                ))}
            </div>

            {showResult && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-6 rounded-xl">
                        <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Analysis:</h4>
                        <p className="text-blue-700 dark:text-blue-200">{currentQuestion.explanation}</p>
                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={handleNext}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Next Bug
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebuggerGame;
