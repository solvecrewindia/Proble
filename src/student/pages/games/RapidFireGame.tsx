import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Trophy, AlertCircle, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../shared/context/AuthContext';
import { saveRapidFireScore, isRapidFireLocked } from '../../utils/gameState';

interface Question {
    id: number;
    question: string;
    options: string[];
    correctKey: number; // 0-3 index
}

const GAME_DURATION = 300; // 5 minutes in seconds
const QUESTIONS_COUNT = 20;
const XP_PER_QUESTION = 20;

const RapidFireGame = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Game States: 'intro' | 'loading' | 'playing' | 'results' | 'locked'
    const [gameState, setGameState] = useState<'intro' | 'loading' | 'playing' | 'results' | 'locked'>('intro');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [score, setScore] = useState(0);
    const [earnedXP, setEarnedXP] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (user && isRapidFireLocked(user.id)) {
            setGameState('locked');
        }
    }, [user]);

    useEffect(() => {
        if (gameState === 'playing') {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        endGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const fetchQuestions = async () => {
        setGameState('loading');
        setError(null);
        try {
            // First try to get questions with specific quiz_id if known, otherwise random
            // Since we don't have a specific ID, we'll fetch random questions
            // Fetching only necessary columns to improve performance
            const { data, error } = await supabase
                .from('questions')
                .select('question, text, choices, correct_answer')
                .limit(50);

            if (error) throw error;
            if (!data || data.length < QUESTIONS_COUNT) {
                throw new Error('Not enough questions available in the database.');
            }

            // Transform and Shuffle
            const transformed = data.map((q: any, index: number) => {
                let options = [];
                try {
                    options = typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices;
                    // Handle object options
                    options = options.map((opt: any) => typeof opt === 'object' ? opt.text : opt);
                } catch (e) {
                    options = ["Option A", "Option B", "Option C", "Option D"];
                }

                return {
                    id: index, // Use local index for tracking
                    question: q.question || q.text || "Question Text Missing",
                    options: options,
                    correctKey: Number(q.correct_answer) || 0
                };
            });

            // Randomize array
            const shuffled = transformed.sort(() => 0.5 - Math.random()).slice(0, QUESTIONS_COUNT);
            setQuestions(shuffled);
            setGameState('playing');
        } catch (err: any) {
            console.error("Failed to load questions:", err);
            setError(err.message || 'Failed to load game');
            setGameState('intro');
        }
    };

    const handleAnswer = (optionIdx: number) => {
        setUserAnswers(prev => ({ ...prev, [currentQIndex]: optionIdx }));
    };

    const nextQuestion = () => {
        if (currentQIndex < questions.length - 1) {
            setCurrentQIndex(prev => prev + 1);
        } else {
            endGame();
        }
    };

    const endGame = () => {
        if (timerRef.current) clearInterval(timerRef.current);

        let correctCount = 0;
        questions.forEach((q, idx) => {
            if (userAnswers[idx] === q.correctKey) {
                correctCount++;
            }
        });

        const xp = correctCount * XP_PER_QUESTION;
        setScore(correctCount);
        setEarnedXP(xp);

        if (user) {
            saveRapidFireScore(xp, user.id);
        }

        setGameState('results');
    };

    // --- RENDERERS ---

    if (gameState === 'locked') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                    <Clock className="w-10 h-10 text-muted" />
                </div>
                <h2 className="text-3xl font-bold text-text mb-2">Come Back Tomorrow!</h2>
                <p className="text-muted max-w-md mb-8">
                    You have already played the Rapid Fire challenge for today.
                    Rest up and try again tomorrow to earn more XP!
                </p>
                <button
                    onClick={() => navigate('/student/game')}
                    className="px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all"
                >
                    Back to Games
                </button>
            </div>
        );
    }

    if (gameState === 'intro') {
        return (
            <div className="max-w-2xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 shadow-sm text-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trophy className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-4xl font-bold text-text mb-4">Rapid Fire Challenge</h1>
                    <p className="text-muted text-lg mb-8">
                        Answer 20 questions in 5 minutes!
                        <br />
                        <span className="font-bold text-primary">20 XP</span> per correct answer.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            <Clock className="w-6 h-6 text-blue-500 mb-2" />
                            <h3 className="font-bold text-text">5 Minutes</h3>
                            <p className="text-xs text-muted">Strict time limit</p>
                        </div>
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            <AlertCircle className="w-6 h-6 text-orange-500 mb-2" />
                            <h3 className="font-bold text-text">One Attempt</h3>
                            <p className="text-xs text-muted">Per day only</p>
                        </div>
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700">
                            <Trophy className="w-6 h-6 text-purple-500 mb-2" />
                            <h3 className="font-bold text-text">Weekly XP</h3>
                            <p className="text-xs text-muted">Boost your rank</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-4 justify-center">
                        <button
                            onClick={() => navigate('/student/game')}
                            className="px-6 py-3 bg-neutral-100 dark:bg-neutral-800 text-text rounded-xl font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={fetchQuestions}
                            className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all hover:scale-105 shadow-lg shadow-red-500/25"
                        >
                            Start Challenge
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (gameState === 'loading') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted animate-pulse">Loading Questions...</p>
            </div>
        );
    }

    if (gameState === 'results') {
        return (
            <div className="max-w-md mx-auto p-6 animate-in zoom-in-95 duration-500">
                <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-2xl p-8 shadow-xl text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-purple-500 to-blue-500" />

                    <h2 className="text-2xl font-bold text-text mb-2">Challenge Complete!</h2>
                    <p className="text-muted mb-8">Here is how you performed</p>

                    <div className="py-8 bg-neutral-50 dark:bg-white/5 rounded-2xl mb-8">
                        <div className="text-5xl font-black text-primary mb-2">
                            {score}<span className="text-2xl text-muted font-bold">/{QUESTIONS_COUNT}</span>
                        </div>
                        <div className="text-sm font-bold text-muted uppercase tracking-wider">Correct Answers</div>
                    </div>

                    <div className="flex justify-center items-center gap-2 mb-8 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 py-2 px-4 rounded-full mx-auto w-fit">
                        <Trophy className="w-4 h-4" />
                        <span className="font-bold">+{earnedXP} XP Earned</span>
                    </div>

                    <button
                        onClick={() => navigate('/student/game')}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all"
                    >
                        Back to Games
                    </button>
                </div>
            </div>
        );
    }

    // PLAYING STATE
    const q = questions[currentQIndex];

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 bg-surface p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="text-sm font-bold text-muted">
                        Q.{currentQIndex + 1} <span className="text-neutral-400">/ {QUESTIONS_COUNT}</span>
                    </div>
                </div>
                <div className={`
                    font-mono font-bold text-xl tabular-nums px-4 py-1 rounded-lg transition-colors
                    ${timeLeft < 60 ? 'bg-red-500/10 text-red-600 animate-pulse' : 'bg-neutral-100 dark:bg-neutral-800 text-text'}
                `}>
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Question Card */}
            <div className="flex-1 bg-surface border border-neutral-200 dark:border-neutral-700 rounded-2xl p-6 md:p-8 shadow-sm flex flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <h3 className="text-xl md:text-2xl font-bold text-text leading-relaxed mb-8">
                    {q.question}
                </h3>

                <div className="space-y-3">
                    {q.options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            className={`
                                w-full p-4 rounded-xl text-left font-medium transition-all duration-200 border flex items-center gap-3 group
                                ${userAnswers[currentQIndex] === idx
                                    ? 'border-primary bg-primary/5 text-primary shadow-[0_0_0_1px_rgba(var(--primary),1)]'
                                    : 'border-neutral-200 dark:border-neutral-700 hover:border-primary/50 hover:bg-neutral-50 dark:hover:bg-white/5 text-text'
                                }
                            `}
                        >
                            <div className={`
                                w-8 h-8 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 font-bold text-sm
                                ${userAnswers[currentQIndex] === idx
                                    ? 'bg-primary text-white border-primary'
                                    : 'border-neutral-300 text-neutral-400 group-hover:border-primary/50'
                                }
                            `}>
                                {String.fromCharCode(65 + idx)}
                            </div>
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end">
                <button
                    onClick={nextQuestion}
                    className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold hover:scale-105 transition-all flex items-center gap-2"
                >
                    {currentQIndex === questions.length - 1 ? 'Finish' : 'Next Question'}
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default RapidFireGame;
