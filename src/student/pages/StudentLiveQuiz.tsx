import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { Loader2, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../shared/context/ThemeContext';

export default function StudentLiveQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { theme } = useTheme();

    // State
    const [quiz, setQuiz] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [status, setStatus] = useState<'waiting' | 'active' | 'completed'>('waiting');
    const [viewMode, setViewMode] = useState<'voting' | 'results'>('voting');

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isTimeUp, setIsTimeUp] = useState(false);

    // Realtime Status
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    const fetchQuizState = async () => {
        if (!id || !user) return;
        try {
            // 1. Fetch Quiz & Questions
            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', id)
                .single();

            if (quizError) throw quizError;

            // Update Quiz State
            setQuiz(quizData);

            // Update Local State based on settings
            if (quizData.settings) {
                if (typeof quizData.settings.currentQuestionIndex === 'number') {
                    setCurrentQuestionIndex((prev) => {
                        if (prev !== quizData.settings.currentQuestionIndex) {
                            // New Question: Reset state
                            setSelectedOption(null);
                            setIsSubmitted(false);
                            setIsTimeUp(false);
                            setTimeLeft(null);
                            return quizData.settings.currentQuestionIndex;
                        }
                        return prev;
                    });
                }
                if (quizData.settings.viewMode) {
                    setViewMode(quizData.settings.viewMode);
                    if (quizData.settings.viewMode === 'results') {
                        setTimeLeft(null);
                    }
                }
                // Sync Timer
                if (quizData.settings.questionExpiresAt && quizData.settings.viewMode === 'voting') {
                    const expiresAt = new Date(quizData.settings.questionExpiresAt).getTime();
                    const now = Date.now();
                    const diff = Math.max(0, Math.ceil((expiresAt - now) / 1000));
                    setTimeLeft(diff);
                    if (diff === 0) setIsTimeUp(true);
                }
            }

            if (quizData.status === 'completed') {
                setStatus('completed');
            } else {
                setStatus('active');
            }

            // Only fetch questions once if not already loaded
            if (questions.length === 0) {
                const { data: questionsData } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('quiz_id', id)
                    .order('created_at', { ascending: true });

                const mappedQuestions = questionsData?.map((q: any) => ({
                    id: q.id,
                    type: 'mcq',
                    stem: q.text,
                    options: q.choices,
                    correct: q.correct_answer,
                })) || [];
                setQuestions(mappedQuestions);
            }

            // Initialize Attempt if needed (only once)
            const { data: existingAttempt } = await supabase
                .from('attempts')
                .select('*')
                .eq('quiz_id', id)
                .eq('student_id', user.id)
                .single();

            if (!existingAttempt) {
                await supabase.from('attempts').insert({
                    quiz_id: id,
                    student_id: user.id,
                    status: 'in-progress',
                    started_at: new Date().toISOString(),
                    flags: []
                });
            }

            setLoading(false);

        } catch (err) {
            console.error("Failed to sync session:", err);
        }
    };

    useEffect(() => {
        if (!id || !user) return;

        // Initial Fetch
        fetchQuizState();

        // Polling Fallback (every 3 seconds)
        const pollInterval = setInterval(() => {
            fetchQuizState();
        }, 3000);

        // Realtime Subscription
        const channel = supabase
            .channel(`live-quiz-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'quizzes',
                    filter: `id=eq.${id}`
                },
                (payload: any) => {
                    console.log("Realtime Update Received:", payload);
                    const newSettings = payload.new.settings;
                    const newStatus = payload.new.status;

                    if (newStatus === 'completed') {
                        setStatus('completed');
                    }

                    if (newSettings) {
                        if (typeof newSettings.currentQuestionIndex === 'number') {
                            setCurrentQuestionIndex((prev) => {
                                if (prev !== newSettings.currentQuestionIndex) {
                                    // New Question: Reset entire state
                                    setSelectedOption(null);
                                    setIsSubmitted(false);
                                    setIsTimeUp(false);
                                    setTimeLeft(null);
                                    return newSettings.currentQuestionIndex;
                                }
                                return prev;
                            });
                        }
                        if (newSettings.viewMode) {
                            setViewMode(newSettings.viewMode);
                            if (newSettings.viewMode === 'results') {
                                setTimeLeft(null); // Clear timer in results mode
                            }
                        }

                        // Sync Timer
                        if (newSettings.questionExpiresAt && newSettings.viewMode === 'voting') {
                            const expiresAt = new Date(newSettings.questionExpiresAt).getTime();
                            const now = Date.now();
                            const diff = Math.max(0, Math.ceil((expiresAt - now) / 1000));
                            setTimeLeft(diff);
                            setIsTimeUp(diff === 0);
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log("Subscription Status:", status);
                if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
                else if (status === 'CHANNEL_ERROR') setRealtimeStatus('disconnected');
                else if (status === 'TIMED_OUT') setRealtimeStatus('disconnected');
            });

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };

    }, [id, user]);

    // Timer Interval
    useEffect(() => {
        if (timeLeft === null || timeLeft === 0) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev === null || prev <= 1) {
                    clearInterval(timer);
                    setIsTimeUp(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const handleSubmitAnswer = () => {
        if (selectedOption === null) return;
        setIsSubmitted(true);
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (status === 'completed') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
                <Card className="max-w-md w-full p-8 text-center space-y-6">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-text">Session Completed</h1>
                    <p className="text-muted">The instructor has ended the session.</p>
                    <Button onClick={() => navigate('/student/dashboard')} className="w-full">Return to Dashboard</Button>
                </Card>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
                <Card className="max-w-md w-full p-8 text-center space-y-6 animate-pulse">
                    <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto">
                        <Clock className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-text">You are in the Lobby</h1>
                    <p className="text-muted">Waiting for the instructor to start the quiz...</p>
                </Card>
            </div>
        );
    }

    // Determine detailed status
    const isLocked = isSubmitted || isTimeUp || viewMode === 'results';

    return (
        <div className="min-h-screen bg-background text-text font-sans flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <img src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"} alt="Logo" className="h-8 w-auto object-contain rounded-lg" />
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-neutral-200 dark:border-neutral-800">
                        <div className={cn("w-2 h-2 rounded-full",
                            realtimeStatus === 'connected' ? "bg-green-500 animate-pulse" :
                                realtimeStatus === 'connecting' ? "bg-yellow-500" : "bg-red-500"
                        )} />
                        <span className="text-xs font-medium text-muted hidden sm:inline">
                            {realtimeStatus === 'connected' ? 'Live' : 'Connecting...'}
                        </span>
                    </div>
                </div>

                {/* Timer Display */}
                <div className="flex items-center gap-4">

                    <Button variant="ghost" size="sm" onClick={fetchQuizState} className="hidden sm:flex" title="Sync">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
                    </Button>

                    {viewMode === 'voting' && timeLeft !== null && (
                        <div className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg transition-colors",
                            timeLeft <= 10 ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                        )}>
                            <Clock className={cn("w-5 h-5", timeLeft <= 10 && "animate-pulse")} />
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    )}

                    <div className="text-sm font-medium text-muted">
                        Q{currentQuestionIndex + 1} / {questions.length}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto max-w-4xl p-6 flex flex-col justify-center">
                <div className="bg-surface border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 md:p-8 shadow-sm flex flex-col gap-6">

                    {/* Question Header */}
                    <div className="flex justify-between items-center">
                        <span className="font-medium text-muted bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-xs">
                            Question {currentQuestionIndex + 1}
                        </span>

                        {viewMode === 'results' && (
                            <span className="text-xs font-bold px-2 py-1 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                Results Phase
                            </span>
                        )}

                        {isTimeUp && viewMode === 'voting' && (
                            <span className="text-xs font-bold px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                Time's Up
                            </span>
                        )}
                    </div>

                    {/* Question Text */}
                    <h2 className="text-xl md:text-2xl font-semibold leading-relaxed text-text">
                        {currentQuestion.stem}
                    </h2>

                    {/* Options */}
                    <div className="flex flex-col gap-3">
                        {currentQuestion.options?.map((option: string, idx: number) => {
                            const isSelected = selectedOption === idx;
                            // Check similarity if options are strings or indices. Assuming strings based on earlier context.
                            const isCorrectCheck = viewMode === 'results' && (currentQuestion.correct === option || String(currentQuestion.correct) === String(idx) || currentQuestion.correct === idx);

                            let stateStyles = "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900";

                            if (viewMode === 'results') {
                                if (isCorrectCheck) {
                                    stateStyles = "border-green-500 bg-green-50 dark:bg-green-900/20";
                                } else if (isSelected && !isCorrectCheck) {
                                    stateStyles = "border-red-500 bg-red-50 dark:bg-red-900/20";
                                } else {
                                    stateStyles = "opacity-50 grayscale";
                                }
                            } else if (isSelected) {
                                stateStyles = "border-primary bg-primary/5 shadow-md shadow-primary/10";
                            } else if (isLocked && !isSelected) {
                                stateStyles = "opacity-60 cursor-not-allowed";
                            }

                            return (
                                <button
                                    key={idx}
                                    disabled={isLocked}
                                    onClick={() => setSelectedOption(idx)}
                                    className={cn(
                                        "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 group relative",
                                        stateStyles
                                    )}
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors shrink-0",
                                        viewMode === 'results' && isCorrectCheck
                                            ? "bg-green-500 text-white"
                                            : viewMode === 'results' && isSelected && !isCorrectCheck
                                                ? "bg-red-500 text-white"
                                                : isSelected
                                                    ? "bg-primary text-white"
                                                    : "bg-neutral-100 dark:bg-neutral-800 text-muted group-hover:bg-neutral-200"
                                    )}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className={cn(
                                        "font-medium text-base",
                                        viewMode === 'results' && isCorrectCheck ? "text-green-700 dark:text-green-400" : "text-text"
                                    )}>
                                        {option}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                        {viewMode === 'voting' ? (
                            isTimeUp ? (
                                <div className="text-center w-full p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
                                    <p className="font-bold">Time's Up!</p>
                                    <p className="text-xs">Waiting for results...</p>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleSubmitAnswer}
                                    disabled={selectedOption === null || isSubmitted}
                                    className={cn(
                                        "w-full sm:w-auto h-12 text-lg px-8 transition-all font-bold",
                                        isSubmitted ? "bg-green-600 hover:bg-green-700 text-white cursor-default" : ""
                                    )}
                                >
                                    {isSubmitted ? (
                                        <span className="flex items-center gap-2">
                                            Answer Submitted <CheckCircle className="w-5 h-5" />
                                        </span>
                                    ) : "Submit Answer"}
                                </Button>
                            )
                        ) : (
                            <div className="text-center w-full p-4 bg-neutral-100 dark:bg-neutral-900 rounded-lg animate-in fade-in">
                                <p className="font-bold text-muted">Reviewing Results...</p>
                                <p className="text-xs text-muted">Wait for the next question</p>
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
