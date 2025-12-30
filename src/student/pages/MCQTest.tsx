import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useTheme } from '../../shared/context/ThemeContext';
import { Moon, Sun, Loader2, Maximize2, X, ZoomIn, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { QuizTimer } from '../components/QuizTimer';

const MCQTest = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { theme, setTheme } = useTheme();
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(1);
    // Persist answers: Record<questionId, selectedOptionT(number | number[] | string)>
    const [answers, setAnswers] = useState<Record<number, number | number[] | string>>({});

    // Results State
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    const [loading, setLoading] = useState(true);
    const [testActive, setTestActive] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [quizSettings, setQuizSettings] = useState<any>(null);

    // Helper: finish test (Defined before useAntiCheat to be safe, though hoisting applies to functions not consts. 
    // We define it as const inside render, so it must be defined before use)
    // Actually, onAutoSubmit calls it. onAutoSubmit is a callback. 
    // The safest way with const is to rely on closure capture or define it early.
    // However, it depends on state like questions/answers.
    // It's circular if onAutoSubmit calls it but it relies on state.
    // The standard way is defining it here.

    // We need to define calculateAndShowResults BEFORE useAntiCheat if we pass it directly.
    // But since useAntiCheat is a hook, we pass a closure `() => calculateAndShowResults()`.
    // The closure captures the variable. The variable must be initialized by the time the callback executes.
    // It will be.

    // BUT! I will define it first to be clean.

    const calculateAndShowResults = useCallback(async () => {
        let calculatedScore = 0;
        questions.forEach((q) => {
            const userAnswer = answers[q.id];

            if (q.type === 'msq') {
                const correctArr = Array.isArray(q.correct) ? q.correct : [];
                const userArr = Array.isArray(userAnswer) ? userAnswer : [];
                if (userArr.length === correctArr.length &&
                    userArr.every((val: any) => correctArr.includes(val))) {
                    calculatedScore++;
                }
            } else if (q.type === 'range') {
                const userVal = Number(userAnswer);
                if (!isNaN(userVal)) {
                    try {
                        const range = q.correct;
                        if (userVal >= range.min && userVal <= range.max) {
                            calculatedScore++;
                        }
                    } catch (e) { console.error(e); }
                }
            } else {
                if (userAnswer === q.correct) {
                    calculatedScore++;
                }
            }
        });
        setScore(calculatedScore);
        setShowResults(true);
        setTestActive(false);

        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.log(err));
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && id && id !== 'combined') {
                await supabase.from('quiz_results').insert({
                    quiz_id: id,
                    student_id: user.id,
                    score: calculatedScore,
                    total_questions: questions.length,
                    percentage: (calculatedScore / questions.length) * 100
                });
            }
        } catch (err) {
            console.error("Error saving results:", err);
        }
    }, [answers, questions, id]);

    // Anti-Cheat Integration
    const {
        violations,
        isFullScreen,
        warning,
        enterFullScreen,
        remainingStrikes
    } = useAntiCheat({
        enabled: testActive && !showResults,
        level: quizSettings?.antiCheatLevel || 'standard',
        maxViolations: 3,
        onAutoSubmit: () => {
            alert("Maximum violations reached. Your test is being submitted.");
            calculateAndShowResults();
        },
        onViolation: (count, type) => {
            // Warning logic is handled by hook state, we just log here
            console.log(`Violation: ${type} (${count}/3)`);
        }
    });

    // Data Fetching
    useEffect(() => {
        const fetchQuestions = async () => {
            if (!id) return;

            let targetQuizIds: string[] = [];

            if (id === 'combined') {
                const params = new URLSearchParams(window.location.search);
                const idsParam = params.get('ids');
                if (idsParam) {
                    targetQuizIds = idsParam.split(',');
                } else {
                    navigate(-1);
                    return;
                }
            } else {
                targetQuizIds = [id];
            }

            const { data: quizData } = await supabase
                .from('quizzes')
                .select('settings, type, id')
                .in('id', targetQuizIds)
                .limit(1)
                .single();

            if (quizData) {
                if (quizData.settings) setQuizSettings(quizData.settings);

                // Security Check: Prevent unauthorized retakes
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const isMaster = quizData.type === 'master';
                    const allowRetake = quizData.settings?.allowRetake;

                    if (isMaster) {
                        const { data: existingAttempts } = await supabase
                            .from('quiz_results')
                            .select('id')
                            .eq('quiz_id', quizData.id)
                            .eq('student_id', user.id)
                            .limit(1);

                        if (existingAttempts && existingAttempts.length > 0) {
                            alert("You have already completed this assessment.");
                            navigate(`/student/practice/${id}`);
                            return;
                        }
                    }
                }
            }

            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .in('quiz_id', targetQuizIds)
                .order('id');

            if (data && data.length > 0) {
                const mapped = data.map((q: any, index: number) => ({
                    id: index + 1,
                    dbId: q.id,
                    type: q.type || 'mcq',
                    question: q.text,
                    imageUrl: q.image_url ? `${q.image_url}?t=${Date.now()}` : null,
                    options: q.choices,
                    correct: (() => {
                        if (q.type === 'msq') return JSON.parse(q.correct_answer || '[]');
                        if (q.type === 'range') {
                            try {
                                const parsed = JSON.parse(q.correct_answer || '{}');
                                if (typeof parsed === 'object' && parsed !== null && 'min' in parsed) {
                                    return parsed;
                                }
                                return { min: 0, max: 0 };
                            } catch { return { min: 0, max: 0 }; }
                        }
                        return (Number(q.correct_answer) || 0);
                    })()
                }));
                setQuestions(mapped);
                setLoading(false);
            } else {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [id, navigate]);

    // Realtime Subscriptions
    useEffect(() => {
        if (!id || loading || showResults || id === 'combined') return;
        const channel = supabase.channel(`quiz_session:${id}`, {
            config: { presence: { key: (supabase.auth.getSession() as any)?.user?.id || 'anon' } },
        });

        channel
            .on('broadcast', { event: 'test_ended' }, () => {
                alert('The teacher has ended this test session.');
                calculateAndShowResults();
            })
            .on('broadcast', { event: 'test_paused' }, () => {
                setTestActive(false);
                setIsPaused(true);
            })
            .on('broadcast', { event: 'test_resumed' }, () => {
                setIsPaused(false);
                setTestActive(true);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) await channel.track({ student_id: user.id, online_at: new Date().toISOString() });
                }
            });

        return () => { supabase.removeChannel(channel); };
    }, [id, loading, showResults, calculateAndShowResults]);

    const handleOptionSelect = useCallback((optionIndex: number) => {
        const currentQ = questions[currentQuestion - 1];
        if (currentQ.type === 'msq') {
            setAnswers(prev => {
                const current = (prev[currentQuestion] as number[]) || [];
                if (current.includes(optionIndex)) {
                    return { ...prev, [currentQuestion]: current.filter(i => i !== optionIndex) };
                } else {
                    return { ...prev, [currentQuestion]: [...current, optionIndex] };
                }
            });
        } else {
            setAnswers(prev => ({ ...prev, [currentQuestion]: optionIndex }));
        }
    }, [currentQuestion, questions]);

    const activeQuestion = useMemo(() => questions[currentQuestion - 1], [questions, currentQuestion]);

    if (loading) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>;

    if (showResults) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-surface border border-neutral-300 dark:border-neutral-600 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <h1 className="text-3xl font-bold mb-4 text-text">Test Completed</h1>
                    <div className="mb-8">
                        <div className="text-6xl font-bold text-primary mb-2">
                            {Math.round((score / questions.length) * 100)}%
                        </div>
                        <p className="text-muted">You scored {score} out of {questions.length}</p>
                    </div>
                    <p className="text-sm text-gray-400 mb-8">Violations Recorded: {violations}</p>
                    <button onClick={() => navigate(`/student/practice/${id}`)} className="w-full btn-primary py-3 rounded-xl font-bold shadow-lg shadow-primary/20">Return to Test Details</button>
                </div>
            </div>
        );
    }

    if (questions.length === 0) return (
        <div className="h-screen flex flex-col items-center justify-center bg-background">
            <h2 className="text-xl font-bold text-text">No questions found.</h2>
            <button onClick={() => navigate(-1)} className="mt-4 text-primary font-medium hover:underline">Go Back</button>
        </div>
    );

    return (
        <div
            className="min-h-screen bg-background text-text font-sans selection:bg-transparent select-none relative"
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* --- WARNING OVERLAY --- */}
            {warning && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 fade-in duration-300 w-full max-w-lg px-4">
                    <div className="bg-red-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 border-2 border-red-400">
                        <div className="p-2 bg-white/20 rounded-full shrink-0 animate-pulse">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight">Violation Detected</h3>
                            <p className="text-white/90 text-sm mt-1">{warning}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700 px-6 py-3 flex items-center justify-between transition-all">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate(`/student/practice/${id}`)}>
                        <img src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"} alt="Logo" className="h-8 w-auto object-contain rounded-lg group-hover:scale-105 transition-transform" />
                    </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-full max-w-md hidden md:flex gap-3">
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex-1">
                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(currentQuestion / questions.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-primary tabular-nums">
                        {Math.round((currentQuestion / questions.length) * 100)}%
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <QuizTimer initialSeconds={(quizSettings?.duration || 20) * 60} onTimeUp={calculateAndShowResults} />
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface transition-colors">
                        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-neutral-600" />}
                    </button>
                </div>
            </header>

            {/* --- ANTI-CHEAT & PAUSE OVERLAYS (Keep Existing Logic) --- */}
            {(!testActive || !isFullScreen) && (
                <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-surface border border-red-500/30 shadow-2xl rounded-2xl p-8 max-w-lg text-center">
                        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold mb-3 text-text">Exam Security Protocol</h2>
                        <p className="text-muted leading-relaxed mb-8">
                            This exam is monitored. Full screen mode is mandatory.
                            Switching tabs or exiting full screen will result in strict penalties.
                        </p>
                        <button
                            onClick={async () => { await enterFullScreen(); setTestActive(true); }}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-10 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/30"
                        >
                            {!testActive ? "I Understand, Start Exam" : "Resume Full Screen"}
                        </button>
                    </div>
                </div>
            )}
            {isPaused && (
                <div className="fixed inset-0 z-[80] bg-background/90 backdrop-blur flex flex-col items-center justify-center p-4">
                    <AlertTriangle className="w-20 h-20 text-yellow-500 mb-6 animate-pulse" />
                    <h2 className="text-3xl font-bold text-text">Exam Paused</h2>
                    <p className="text-xl text-muted mt-2">The proctor has paused this session.</p>
                </div>
            )}


            {/* --- MAIN LAYOUT --- */}
            <main className="max-w-7xl mx-auto p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-80px)]">

                {/* --- LEFT: QUESTION --- */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-4 min-h-[350px]">

                        {/* Question Meta */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-muted bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-xs">
                                Question {currentQuestion} / {questions.length}
                            </span>
                            <span className="text-muted font-mono text-[10px] uppercase tracking-wider">
                                {activeQuestion.type === 'msq' ? 'Multi-Select' : activeQuestion.type === 'range' ? 'Numeric Range' : 'Single Choice'}
                            </span>
                        </div>

                        {/* Question Text */}
                        <div className="prose dark:prose-invert max-w-none">
                            <h2 className="text-lg md:text-xl font-semibold leading-relaxed text-text">
                                {activeQuestion.question}
                            </h2>
                        </div>

                        {/* Optional Image */}
                        {activeQuestion.imageUrl && activeQuestion.imageUrl.length > 5 && (
                            <div className="relative group w-fit rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-black/20">
                                <img
                                    src={activeQuestion.imageUrl}
                                    alt="Question Asset"
                                    className="max-h-[300px] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in" onClick={() => setZoomedImage(activeQuestion.imageUrl)}>
                                    <ZoomIn className="text-white w-6 h-6" />
                                </div>
                            </div>
                        )}

                        {/* Options / Input */}
                        <div className="mt-2 flex flex-col gap-2">
                            {activeQuestion.type === 'range' ? (
                                <div className="max-w-xs">
                                    <label className="text-sm font-medium text-muted mb-1 block">Enter numeric answer (e.g. 5 or 5.25)</label>
                                    <input
                                        type="number"
                                        placeholder="Type answer here..."
                                        className="w-full bg-background border-2 border-neutral-200 dark:border-neutral-700 rounded-lg p-3 text-lg font-mono focus:border-primary focus:outline-none transition-all shadow-sm"
                                        value={String(answers[currentQuestion] ?? '')}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion]: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-muted mt-1 ml-1">Value must be between Min and Max specified.</p>
                                </div>
                            ) : (
                                activeQuestion.options.map((opt: any, idx: number) => {
                                    const isSelected = activeQuestion.type === 'msq'
                                        ? (answers[currentQuestion] as number[])?.includes(idx)
                                        : answers[currentQuestion] === idx;

                                    const optText = typeof opt === 'object' ? opt.text : opt;
                                    const optImg = typeof opt === 'object' ? opt.image : null;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleOptionSelect(idx)}
                                            className={cn(
                                                "group relative p-3 rounded-lg border cursor-pointer transition-all duration-200 flex items-center gap-3",
                                                isSelected
                                                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                                                    : "border-neutral-200 dark:border-neutral-700 bg-surface hover:border-primary/50 hover:bg-neutral-50 dark:hover:bg-white/5"
                                            )}
                                        >
                                            {/* Checkbox/Radio Indicator */}
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0",
                                                activeQuestion.type === 'msq' ? "rounded-md" : "rounded-full",
                                                isSelected ? "bg-primary border-primary" : "border-neutral-300 dark:border-neutral-300 dark:border-neutral-600 group-hover:border-primary/60"
                                            )}>
                                                {isSelected && activeQuestion.type === 'msq' && (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                )}
                                                {isSelected && activeQuestion.type !== 'msq' && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                                )}
                                            </div>

                                            {/* Option Content */}
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-text selection:bg-transparent">{optText}</div>
                                                {optImg && (
                                                    <img
                                                        src={optImg}
                                                        className="mt-2 h-16 rounded-md border border-neutral-200 dark:border-neutral-700"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setZoomedImage(optImg);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Navigation Bar (Desktop) */}
                    <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 flex justify-between items-center shadow-sm sticky bottom-4">
                        <button
                            onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
                            disabled={currentQuestion === 1}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm text-text hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>

                        <button
                            onClick={() => {
                                if (currentQuestion === questions.length) calculateAndShowResults();
                                else setCurrentQuestion(prev => Math.min(questions.length, prev + 1));
                            }}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-md",
                                currentQuestion === questions.length
                                    ? "bg-black dark:bg-white dark:text-black hover:scale-105"
                                    : "bg-primary hover:bg-primary-dark hover:scale-105 shadow-primary/25"
                            )}
                        >
                            {currentQuestion === questions.length ? 'Finish Exam' : 'Next Question'}
                            {currentQuestion !== questions.length && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* --- RIGHT: GRID --- */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 shadow-sm sticky top-20 w-fit mx-auto">


                        <div className="grid grid-cols-5 gap-2 place-items-center w-fit mx-auto">
                            {questions.map((q) => {
                                const isSaved = answers[q.id] !== undefined && answers[q.id] !== '';
                                const isActive = currentQuestion === q.id;
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => setCurrentQuestion(q.id)}
                                        className={cn(
                                            "w-11 h-11 rounded-lg text-xs font-bold transition-all duration-200 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center", // Added border-neutral-700
                                            isActive
                                                ? "border-primary text-primary bg-primary/10"
                                                : isSaved
                                                    ? "bg-primary/20 border-transparent text-primary dark:text-primary-foreground"
                                                    : "bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-neutral-700 text-muted hover:bg-neutral-200 dark:hover:bg-white/10" // Ensure border stays grey if not saved/active
                                        )}
                                    >
                                        {q.id}
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-6 space-y-3 pt-6 border-t border-neutral-200 dark:border-neutral-700">
                            <div className="flex items-center gap-3 text-xs text-muted">
                                <div className="w-3 h-3 rounded bg-primary/20" /> Answered
                                <div className="w-3 h-3 rounded border-2 border-primary bg-primary/10" /> Current
                                <div className="w-3 h-3 rounded bg-neutral-100 dark:bg-white/5" /> Unanswered
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* Image Zoom Overlay */}
            {zoomedImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
                    <X className="absolute top-6 right-6 w-10 h-10 text-white/70 hover:text-white transition-colors" />
                    <img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                </div>
            )}
        </div>
    );
};

export default MCQTest;
