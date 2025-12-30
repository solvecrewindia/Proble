import React, { useState, useEffect } from 'react';
import { dailyChallengeService } from '../../services/dailyChallengeService';
import { getDailyContent } from '../../utils/gameUtils';
import { flashCardsData } from '../../data/gameData';
import { saveFlashCardScore, isFlashCardLocked } from '../../utils/gameState';
import { ArrowLeft, Check, Clock, Brain, Trophy, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../shared/context/AuthContext';

const FlashCardGame = () => {
    const navigate = useNavigate();
    const { user } = useAuth();


    const [phase, setPhase] = useState<'study' | 'quiz' | 'result'>('study');

    // Data
    const [studiedCards, setStudiedCards] = useState<any[]>([]); // All 6
    const [quizCards, setQuizCards] = useState<any[]>([]); // 3 selected for quiz
    const [flippedCards, setFlippedCards] = useState<number[]>([]);
    const [quizIndex, setQuizIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

    // Timer
    const [timer, setTimer] = useState(60);
    const [timerActive, setTimerActive] = useState(true); // Start immediately

    // Initial Load
    useEffect(() => {
        if (isFlashCardLocked()) {
            navigate('/student/game');
            return;
        }

        const loadDailyFlashcards = async () => {
            const daily = await dailyChallengeService.getDailyChallenge();
            if (daily && daily.flashcards) {
                setStudiedCards(daily.flashcards.map((c: any, i: number) => ({ ...c, id: c.id || i })));
                // Quiz on just 1 random card
                const shuffled = [...daily.flashcards].map((c: any, i: number) => ({ ...c, id: c.id || i })).sort(() => 0.5 - Math.random());
                setQuizCards(shuffled.slice(0, 1));
            } else {
                // Fallback to static if daily fails? or just show empty/error?
                // For now, consistent with user request "trigger new game questions", we expect daily to work.
                // But let's keep a fallback to static just in case of failure to avoid white screen.
                const dsCards = flashCardsData.filter(c => c.subtopic === 'Data Structures');
                const sourceData = dsCards.length >= 6 ? dsCards : flashCardsData;
                const loaded = getDailyContent(sourceData, 6);
                setStudiedCards(loaded);
                const shuffled = [...loaded].sort(() => 0.5 - Math.random());
                setQuizCards(shuffled.slice(0, 1));
            }
        };

        loadDailyFlashcards();
    }, []);

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (timerActive && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0 && phase === 'study') {
            handleStartQuiz();
        }
        return () => clearInterval(interval);
    }, [timerActive, timer, phase]);

    // Format Timer
    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // --- Actions ---

    const handleFlipCard = (id: number) => {
        setFlippedCards(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const handleStartQuiz = () => {
        setTimerActive(false);
        setPhase('quiz');
    };

    const handleQuizOption = (optionIndex: number) => {
        setQuizAnswers(prev => ({ ...prev, [quizIndex]: optionIndex }));
    };

    const handleNextQuestion = () => {
        if (quizIndex < quizCards.length - 1) {
            setQuizIndex(prev => prev + 1);
        } else {
            finishGame();
        }
    };

    const finishGame = () => {
        let finalScore = 0;
        quizCards.forEach((card, idx) => {
            if (quizAnswers[idx] === card.correctAnswer) {
                finalScore += 200;
            }
        });
        setScore(finalScore);
        saveFlashCardScore(finalScore, user?.id);
        setPhase('result');
    };

    // --- Renderers ---

    if (phase === 'study') {
        return (
            <div className="max-w-7xl mx-auto p-4 md:p-8 min-h-screen flex flex-col">
                <header className="flex items-center justify-between mb-8">
                    <button onClick={() => navigate('/student/game')} className="flex items-center gap-2 text-muted hover:text-text">
                        <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <div className="flex items-center gap-2 text-xl font-mono font-bold text-amber-500 bg-amber-50 dark:bg-amber-900/10 px-4 py-2 rounded-lg border border-amber-200">
                        <Clock className="w-6 h-6" />
                        {formatTime(timer)}
                    </div>
                    <button
                        onClick={handleStartQuiz}
                        className="text-sm font-bold text-primary hover:underline"
                    >
                        I'm Ready for Quiz
                    </button>
                </header>

                <div className="mb-6 text-center">
                    <p className="text-muted">Study these concepts carefully. You will be quizzed on one of them.</p>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {studiedCards.map((card) => {
                        const isFlipped = flippedCards.includes(card.id);
                        return (
                            <div
                                key={card.id}
                                className="perspective-1000 h-[280px] w-full cursor-pointer group"
                                onClick={() => handleFlipCard(card.id)}
                            >
                                <div className={`relative w-full h-full transition-all duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                                    {/* Front */}
                                    <div className="absolute inset-0 backface-hidden">
                                        <div className="w-full h-full bg-surface rounded-2xl shadow-sm border-2 border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center p-6 hover:border-primary/50 transition-colors">
                                            <span className="text-xs text-primary font-bold tracking-wider uppercase mb-3">{card.subtopic}</span>
                                            <h2 className="text-2xl font-bold text-center text-text">{card.term}</h2>
                                            <p className="text-muted mt-4 text-[10px] font-bold uppercase tracking-widest opacity-50">Tap to Flip</p>
                                        </div>
                                    </div>

                                    {/* Back */}
                                    <div className="absolute inset-0 backface-hidden rotate-y-180">
                                        <div className="w-full h-full bg-primary/5 rounded-2xl shadow-sm border-2 border-primary/20 flex flex-col items-center justify-center p-6 text-center">
                                            <span className="text-xs text-primary font-bold tracking-wider uppercase mb-3">Definition</span>
                                            <p className="text-base text-text font-medium leading-relaxed">
                                                {card.definition}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <style>{`
                    .perspective-1000 { perspective: 1000px; }
                    .transform-style-3d { transform-style: preserve-3d; }
                    .backface-hidden { backface-visibility: hidden; }
                    .rotate-y-180 { transform: rotateY(180deg); }
                `}</style>
            </div>
        );
    }

    if (phase === 'quiz') {
        const card = quizCards[quizIndex];
        const hasAnswered = quizAnswers.hasOwnProperty(quizIndex);

        return (
            <div className="max-w-2xl mx-auto p-4 md:p-8 min-h-screen flex flex-col justify-center">
                <div className="mb-8 flex justify-between items-center">
                    <span className="font-bold text-muted">Question {quizIndex + 1} / {quizCards.length}</span>
                    <Brain className="w-6 h-6 text-purple-500" />
                </div>

                <div className="bg-surface p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-lg mb-6">
                    <h2 className="text-xl font-bold mb-6">{card.question}</h2>

                    <div className="space-y-3">
                        {card.options.map((opt: string, idx: number) => (
                            <button
                                key={idx}
                                onClick={() => handleQuizOption(idx)}
                                disabled={hasAnswered}
                                className={`
                                    w-full text-left p-4 rounded-xl border-2 transition-all font-medium
                                    ${hasAnswered
                                        ? idx === card.correctAnswer
                                            ? 'border-green-500 bg-green-50 text-green-700'
                                            : idx === quizAnswers[quizIndex]
                                                ? 'border-red-500 bg-red-50 text-red-700'
                                                : 'border-neutral-200 opacity-50'
                                        : 'border-neutral-200 hover:border-primary hover:bg-primary/5'
                                    }
                                `}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>

                {hasAnswered && (
                    <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
                        <button
                            onClick={handleNextQuestion}
                            className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary/90"
                        >
                            {quizIndex < quizCards.length - 1 ? 'Next Question' : 'Finish Quiz'}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (phase === 'result') {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center animate-in zoom-in duration-500 min-h-screen flex flex-col justify-center">
                <div className="bg-surface p-12 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700">
                    <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <Trophy className="w-12 h-12" />
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                            +{score} XP
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold mb-2">Session Complete!</h2>
                    <p className="text-muted mb-8 text-lg">You've successfully studied {studiedCards.length} topics today.</p>

                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-6 mb-8">
                        <div className="text-sm font-bold text-muted uppercase mb-1">Total Score Today</div>
                        <div className="text-3xl font-black text-primary">{score}</div>
                    </div>

                    <div className="text-sm text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg mb-8 flex items-center justify-center gap-2">
                        <Trophy className="w-4 h-4" />
                        <span>Great job! Come back anytime to practice more.</span>
                    </div>

                    <button
                        onClick={() => navigate('/student/game')}
                        className="bg-primary text-white px-10 py-4 rounded-full font-bold hover:bg-primary/90 transition-colors w-full md:w-auto"
                    >
                        Back to Game Center
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default FlashCardGame;
