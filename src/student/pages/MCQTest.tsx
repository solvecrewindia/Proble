import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useTheme } from '../../shared/context/ThemeContext';
import { Moon, Sun, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

import { useAntiCheat } from '../hooks/useAntiCheat';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const MCQTest = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { theme, setTheme } = useTheme();
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(1);
    // Persist answers: Record<questionId, selectedOptionIndex>
    const [answers, setAnswers] = useState<Record<number, number>>({});

    // Results State
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    const [timeLeft, setTimeLeft] = useState(1200);
    const [loading, setLoading] = useState(true);
    const [testActive, setTestActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Quiz Metadata
    const [quizSettings, setQuizSettings] = useState<any>(null);

    // Anti-Cheat Integration
    const {
        violations,
        isFullScreen,
        warning,
        enterFullScreen,
        remainingStrikes
    } = useAntiCheat({
        enabled: testActive && !showResults, // Disable anti-cheat when showing results
        level: quizSettings?.antiCheatLevel || 'standard',
        maxViolations: 3,
        onAutoSubmit: () => {
            alert("Test terminated due to multiple violations.");
            calculateAndShowResults();
        }
    });

    useEffect(() => {
        const fetchQuestions = async () => {
            if (!id) return;

            // 1. Fetch Quiz Settings (for anti-cheat level)
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('settings, status')
                .eq('id', id)
                .single();

            if (quizData && quizData.settings) {
                setQuizSettings(quizData.settings);
            }
            if (quizData && quizData.status !== 'active' && quizData.status !== 'paused') {
                alert("This test is not currently active.");
                navigate('/student/dashboard');
                return;
            }

            // Fetch questions from Supabase
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', id)
                .order('id'); // Ensure stable order or use created_at

            if (data && data.length > 0) {
                const mapped = data.map((q: any, index: number) => ({
                    id: index + 1, // logical number
                    dbId: q.id,
                    question: q.text,
                    options: q.choices,
                    correct: q.correct_answer // Expecting text match usually, need to check if it's index or text
                }));
                setQuestions(mapped);
                setLoading(false);
            } else {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [id]);

    useEffect(() => {
        if (!id || loading || showResults) return;

        // Join Realtime Channel
        const channel = supabase.channel(`quiz_session:${id}`, {
            config: {
                presence: {
                    key: (supabase.auth.getSession() as any)?.user?.id || 'anon',
                },
            },
        });

        channel
            .on('broadcast', { event: 'test_ended' }, (payload) => {
                alert('The teacher has ended this test session.');
                calculateAndShowResults();
            })
            .on('broadcast', { event: 'test_paused' }, () => {
                setTestActive(false); // Disable anti-cheat to pause
                setIsPaused(true);
            })
            .on('broadcast', { event: 'test_resumed' }, () => {
                setIsPaused(false);
                setTestActive(true);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        await channel.track({ student_id: user.id, online_at: new Date().toISOString() });
                    }
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, loading, showResults]);

    useEffect(() => {
        if (loading || showResults) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    calculateAndShowResults();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [loading, showResults]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')} Min`;
    };

    const handleOptionSelect = (optionIndex: number) => {
        setAnswers(prev => ({
            ...prev,
            [currentQuestion]: optionIndex
        }));
    };

    const calculateAndShowResults = async () => {
        let calculatedScore = 0;
        questions.forEach((q) => {
            const userAnswerIndex = answers[q.id];
            if (userAnswerIndex !== undefined) {
                const userAnswerText = q.options[userAnswerIndex];
                // Check exact match with correct answer string
                if (userAnswerText === q.correct) {
                    calculatedScore++;
                }
            }
        });
        setScore(calculatedScore);
        setShowResults(true);
        setTestActive(false); // Stop anti-cheat monitoring

        // Optional: Exit fullscreen for results
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log(err));
        }

        // Save Results to Supabase
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && id) {
                const { error } = await supabase.from('quiz_results').insert({
                    quiz_id: id,
                    student_id: user.id,
                    score: calculatedScore,
                    total_questions: questions.length,
                    percentage: (calculatedScore / questions.length) * 100
                });
                if (error) console.error("Error saving results:", error);
            }
        } catch (err) {
            console.error("Unexpected error saving results:", err);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    if (showResults) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Test Completed</h1>

                    <div className="mb-8">
                        <div className="text-6xl font-bold text-primary mb-2">
                            {Math.round((score / questions.length) * 100)}%
                        </div>
                        <p className="text-gray-500">
                            You scored {score} out of {questions.length}
                        </p>
                    </div>

                    <p className="text-sm text-gray-400 mb-8">
                        Violations Recorded: {violations}
                    </p>

                    <button
                        onClick={() => navigate('/student/dashboard')}
                        className="w-full bg-primary text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) return (
        <div className="h-screen flex flex-col items-center justify-center">
            <h2 className="text-xl font-bold">No questions found for this quiz.</h2>
            <button onClick={() => navigate(-1)} className="mt-4 text-primary">Go Back</button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F7F9FC] dark:bg-background font-sans text-black dark:text-text">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 px-7 py-3 shadow-[0_1px_4px_rgba(16,24,40,0.06)] flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-bold">Proble</span>
                </div>

                <div className="flex items-center gap-3 w-[260px]">
                    <span className="text-sm font-medium min-w-[40px] text-right">
                        {Math.round((currentQuestion / questions.length) * 100)}%
                    </span>
                    <div className="flex-1 h-2.5 bg-[#DCEBFF] dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#0ebcdb] rounded-full transition-all duration-300"
                            style={{ width: `${(currentQuestion / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-[#F2F2F2] dark:bg-gray-800 rounded-full flex items-center justify-center text-base">
                            ⏱
                        </div>
                        <div>
                            <div className="text-sm font-medium">{formatTime(timeLeft)}</div>
                            <div className="text-xs text-gray-500">Time Left</div>
                        </div>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-700" />}
                    </button>
                </div>
            </header>

            {/* Anti-Cheat: Full Screen Enforcer / Start Screen */}
            {(!testActive || !isFullScreen) && (
                <div className="fixed inset-0 z-[60] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="bg-white dark:bg-black border border-red-200 dark:border-red-900 shadow-2xl rounded-2xl p-8 max-w-md text-center">
                        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                            {!testActive ? "Exam Security Protocol" : "Security Violation Detected!"}
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            {!testActive
                                ? "This exam is monitored. Full screen mode is required. Switching tabs or exiting full screen will result in warnings and potential termination."
                                : "You have exited full screen mode. Please return to full screen immediately to continue your exam."}
                        </p>
                        <button
                            onClick={async () => {
                                await enterFullScreen();
                                setTestActive(true);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105"
                        >
                            {!testActive ? "I Understand, Start Exam" : "Return to Exam"}
                        </button>
                    </div>
                </div>
            )}

            {/* Pause Overlay */}
            {isPaused && (
                <div className="fixed inset-0 z-[80] bg-white/95 dark:bg-gray-900/95 backdrop-blur flex flex-col items-center justify-center p-4">
                    <div className="text-center">
                        <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Test Paused</h2>
                        <p className="text-xl text-gray-600 dark:text-gray-400">
                            The faculty has paused this test. Please wait...
                        </p>
                    </div>
                </div>
            )}

            {/* Anti-Cheat: Active Violation Warning Toast */}
            {warning && !isPaused && (
                <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[70] animate-bounce">
                    <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 font-bold border-2 border-white">
                        <AlertTriangle className="w-5 h-5 fill-current" />
                        {warning}
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="p-10 max-w-[1400px] mx-auto">
                <h1 className="text-3xl font-semibold mb-6">Quiz Session</h1>

                <div className="flex gap-10 items-start">
                    {/* Left Side - Question */}
                    <div className="flex-1">
                        <div className="bg-[#F7F9FC] dark:bg-gray-900 p-10 rounded-none dark:border dark:border-gray-800">
                            <div className="text-[15px] opacity-60 mb-2">Question {currentQuestion}</div>
                            <div className="text-lg font-semibold mb-6 text-black dark:text-gray-100">
                                {questions[currentQuestion - 1].question}
                            </div>

                            <div className="space-y-4">
                                {questions[currentQuestion - 1].options.map((opt: string, idx: number) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleOptionSelect(idx)}
                                        className={cn(
                                            "bg-[#eeeeee] dark:bg-gray-800 rounded-[14px] p-4 shadow-[0_1px_4px_rgba(16,24,40,0.06)] dark:shadow-none cursor-pointer flex justify-between items-center transition-colors hover:bg-[#e4e4e4] dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100",
                                            answers[currentQuestion] === idx && "bg-white dark:bg-gray-800 border-2 border-[#0ebcdb] font-semibold"
                                        )}
                                    >
                                        {opt}
                                        <div className={cn(
                                            "w-[18px] h-[18px] border-2 border-[#666] dark:border-gray-400 rounded-full",
                                            answers[currentQuestion] === idx && "bg-[#0ebcdb] border-white dark:border-gray-800"
                                        )} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex gap-4 justify-center">
                            <button
                                className="px-7 py-3 rounded-full bg-[#EAEEF5] dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100 hover:bg-[#dfe4ef] dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
                                disabled={currentQuestion === 1}
                            >
                                Previous
                            </button>
                            <button
                                className="px-7 py-3 rounded-full bg-[#EAEEF5] dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100 hover:bg-[#dfe4ef] dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                onClick={() => {
                                    setCurrentQuestion(prev => Math.min(questions.length, prev + 1));
                                }}
                                disabled={currentQuestion === questions.length}
                            >
                                Next
                            </button>
                            <button
                                className="px-7 py-3 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                                onClick={calculateAndShowResults}
                            >
                                Finish
                            </button>
                        </div>
                    </div>

                    {/* Right Side - Question Grid */}
                    <div className="w-[240px] flex flex-col gap-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Questions</h3>
                        <div className="grid grid-cols-5 gap-1.5">
                            {questions.map((q) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestion(q.id)}
                                    className={cn(
                                        "aspect-square rounded-md text-xs font-semibold flex items-center justify-center transition-colors",
                                        currentQuestion === q.id
                                            ? "bg-[#dcdcdc] dark:bg-gray-700 text-black dark:text-gray-100"
                                            : answers[q.id] !== undefined
                                                ? "bg-[#0ebcdb] text-white"
                                                : "bg-gray-200 dark:bg-gray-800 text-gray-500"
                                    )}
                                >
                                    {q.id}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MCQTest;
