import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, RefreshCw, AlertCircle, Lock, Clock } from 'lucide-react';
import { dailyChallengeService, DailyChallenge, ChallengeQuestion } from '../../services/dailyChallengeService';
import { getFlashCardState, isDailyChallengeLocked, setDailyChallengeCompleted, saveFlashCardScore } from '../../utils/gameState';
import { useAuth } from '../../../shared/context/AuthContext';

const DailyGame = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, any>>({});
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);

    // Lock State
    const [isLocked, setIsLocked] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');

    useEffect(() => {
        if (!user) return; // Wait for user to avail

        // Check if locked
        if (isDailyChallengeLocked(user.id)) {
            setIsLocked(true);
            setLoading(false);
            startTimer();
        } else {
            loadChallenge();
        }
    }, [user]);

    const startTimer = () => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const diff = tomorrow.getTime() - now.getTime();
            if (diff <= 0) {
                // Unlock
                setIsLocked(false);
                window.location.reload(); // Refresh to load new challenge
                return;
            }

            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(`${h}h ${m}m ${s}s`);
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    };

    const loadChallenge = async () => {
        setLoading(true);
        const data = await dailyChallengeService.getDailyChallenge();
        setChallenge(data);
        setLoading(false);
    };

    const handleAnswer = (questionId: number, answer: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const submitChallenge = () => {
        if (!challenge || !user) return;

        let newScore = 0;
        challenge.mixed.forEach(q => {
            const userAnswer = answers[q.id];
            // Unified validation for all types (quiz, flashcard, puzzle)
            // Now that Puzzle has 'correctAnswer' (index) from SQL, it works the same way.
            if (q.type === 'quiz' || q.type === 'flashcard' || q.type === 'debugger' || q.type === 'puzzle') {
                if (userAnswer === q.content.correctAnswer || userAnswer === q.content.correct) {
                    newScore += 10;
                }
            }
        });

        // Save Completion & Score
        if (user && user.id) {
            setDailyChallengeCompleted(user.id);
            saveFlashCardScore(newScore, user.id);
        }

        setScore(newScore);
        setShowResult(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                <p className="text-muted">Generating your daily challenge...</p>
                <p className="text-xs text-muted/60">Using Gemini AI (Preloaded)</p>
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 mt-10">
                <div className="bg-surface p-12 rounded-xl border border-neutral-200 dark:border-neutral-700 text-center flex flex-col items-center">
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded-full mb-6">
                        <Lock className="w-12 h-12 text-muted" />
                    </div>
                    <h2 className="text-3xl font-bold text-text mb-2">Challenge Locked</h2>
                    <p className="text-muted mb-8 max-w-md">
                        You have already completed today's challenge. Come back tomorrow for a new set of questions!
                    </p>

                    <div className="flex items-center gap-3 text-2xl font-mono font-bold text-primary bg-primary/10 px-6 py-3 rounded-lg mb-8">
                        <Clock className="w-6 h-6" />
                        {timeRemaining}
                    </div>

                    <button
                        onClick={() => navigate('/student/game')}
                        className="px-6 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200"
                    >
                        Back to Games
                    </button>
                </div>
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <p className="text-text">Failed to load daily challenge.</p>
                <button
                    onClick={loadChallenge}
                    className="px-4 py-2 bg-primary text-white rounded-lg"
                >
                    Retry
                </button>
            </div>
        );
    }

    if (showResult) {
        return (
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-surface p-8 rounded-xl border border-neutral-200 dark:border-neutral-700 text-center">
                    <h2 className="text-3xl font-bold text-text mb-4">Challenge Complete!</h2>
                    <div className="text-6xl font-bold text-primary mb-4">{score} XP</div>
                    <p className="text-muted mb-6">Come back tomorrow for new challenges.</p>
                    <button
                        onClick={() => navigate('/student/game')}
                        className="px-6 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg hover:bg-neutral-200"
                    >
                        Back to Games
                    </button>
                </div>
            </div>
        );
    }

    const currentQuestion = challenge.mixed[currentIndex];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <header className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/student/game')}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text">Daily Challenge</h1>
                    <p className="text-sm text-muted">{challenge.date}</p>
                </div>
            </header>

            <div className="bg-surface p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-medium text-muted">
                        Question {currentIndex + 1} of {challenge.mixed.length}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs uppercase font-bold">
                        {currentQuestion.type}
                    </span>
                </div>

                <div className="mb-8">
                    {/* RENDER QUESTION BASED ON TYPE */}
                    {currentQuestion.type === 'quiz' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-medium">{currentQuestion.content.question}</h3>
                            <div className="grid gap-3">
                                {currentQuestion.content.options.map((opt: string, idx: number) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleAnswer(currentQuestion.id, idx)}
                                        className={`w-full text-left p-4 rounded-lg border transition-all ${answers[currentQuestion.id] === idx
                                            ? 'border-primary bg-primary/5'
                                            : 'border-neutral-200 dark:border-neutral-700 hover:border-primary/50'
                                            }`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Unified Render for Flashcard, Debugger, and Puzzle with Options */}
                    {(currentQuestion.type === 'flashcard' || currentQuestion.type === 'debugger' || currentQuestion.type === 'puzzle') && (
                        <div className="space-y-4">
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg font-mono text-sm mb-4">
                                {currentQuestion.content.snippet || currentQuestion.content.term || currentQuestion.content.question}
                            </div>

                            {currentQuestion.content.options && (
                                <div className="grid gap-3">
                                    {currentQuestion.content.options.map((opt: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswer(currentQuestion.id, idx)}
                                            className={`w-full text-left p-4 rounded-lg border transition-all ${answers[currentQuestion.id] === idx
                                                ? 'border-primary bg-primary/5'
                                                : 'border-neutral-200 dark:border-neutral-700 hover:border-primary/50'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between mt-auto pt-6 border-t border-neutral-200 dark:border-neutral-700">
                    <button
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex(prev => prev - 1)}
                        className="px-4 py-2 text-muted hover:text-text disabled:opacity-50"
                    >
                        Previous
                    </button>

                    {currentIndex < challenge.mixed.length - 1 ? (
                        <button
                            onClick={() => setCurrentIndex(prev => prev + 1)}
                            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={submitChallenge}
                            disabled={!user}
                            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!user ? "Please log in to complete" : "Submit your daily challenge"}
                        >
                            {user ? "Complete Challenge" : "Log in to Complete"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DailyGame;
