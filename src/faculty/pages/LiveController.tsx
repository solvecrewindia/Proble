import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, ChevronRight, ChevronLeft, CheckCircle, Pause } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Quiz } from '../types';

export default function LiveController() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'voting' | 'results'>('voting');
    const [loading, setLoading] = useState(true);

    // Dummy voting stats for now
    const [stats, setStats] = useState<Record<string, number>>({});

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!id) return;

            // 1. Fetch Quiz Metadata
            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', id)
                .single();

            if (quizError) {
                console.error("Error fetching quiz:", quizError);
                setLoading(false);
                return;
            }

            if (quizData) {
                // 2. Fetch Questions linked to this quiz
                const { data: questionsData, error: _ } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('quiz_id', id)
                    .order('created_at', { ascending: true });

                if (questionsData) {
                    // Map DB format to Client format
                    const mappedQuestions = questionsData.map((q: any) => ({
                        id: q.id,
                        quizId: id || '',
                        type: 'mcq' as const, // Fix literal type
                        stem: q.text,
                        options: q.choices,
                        correct: q.correct_answer,
                        weight: 1
                    }));

                    setQuiz({ ...quizData, questions: mappedQuestions });

                    // Initialize state from DB settings if available
                    if (quizData.settings?.currentQuestionIndex !== undefined) {
                        setCurrentQuestionIndex(quizData.settings.currentQuestionIndex);
                        setViewMode(quizData.settings.viewMode || 'voting');
                        // If quiz was already running, ensure questionExpiresAt is set if in voting mode
                        if (quizData.settings.viewMode === 'voting' && !quizData.settings.questionExpiresAt) {
                            const timePerQuestion = Number(quizData.settings?.timePerQuestion) || 60;
                            const questionExpiresAt = new Date(Date.now() + (timePerQuestion + 2) * 1000).toISOString();
                            const newSettings = {
                                ...quizData.settings,
                                questionExpiresAt
                            };
                            await supabase
                                .from('quizzes')
                                .update({ settings: newSettings })
                                .eq('id', id);
                        }
                    } else if (mappedQuestions.length > 0) {
                        // First time load - Sync Q1 to DB immediately so students see it

                        // We need to call updateQuizState but we can't because quiz is not set in state yet.
                        // So we do a direct update here.
                        const timePerQuestion = Number(quizData.settings?.timePerQuestion) || 60;
                        const questionExpiresAt = new Date(Date.now() + (timePerQuestion + 2) * 1000).toISOString();

                        const newSettings = {
                            ...quizData.settings,
                            currentQuestionIndex: 0,
                            viewMode: 'voting',
                            questionExpiresAt
                        };

                        await supabase
                            .from('quizzes')
                            .update({ settings: newSettings })
                            .eq('id', id);
                    }
                }
            }
            setLoading(false);
        };
        fetchQuiz();
    }, [id]);

    const [participation, setParticipation] = useState(0);
    const [onlineCount, setOnlineCount] = useState(0);

    const fetchRealStats = async (questionId: string) => {
        if (!id) return;

        // Fetch all attempts for this quiz
        const { data: attempts } = await supabase
            .from('attempts')
            .select('answers, student_id')
            .eq('quiz_id', id);

        if (attempts) {
            setOnlineCount(attempts.length);

            const newStats: Record<string, number> = {};
            let answeredCount = 0;

            attempts.forEach(attempt => {
                const answers = attempt.answers || {};
                const selectedOption = answers[questionId];
                if (typeof selectedOption === 'number') {
                    newStats[selectedOption] = (newStats[selectedOption] || 0) + 1;
                    answeredCount++;
                }
            });
            setStats(newStats);

            // Calculate Participation
            // If total attempts (participants) is 0, participation is 0.
            const totalParticipants = attempts.length;
            const pct = totalParticipants > 0 ? Math.round((answeredCount / totalParticipants) * 100) : 0;
            setParticipation(pct);
        }
    };

    // Sub to attempts for real-time stats
    useEffect(() => {
        if (!quiz || !quiz.questions || quiz.questions.length === 0) return;

        const currentQ = quiz.questions[currentQuestionIndex];
        if (currentQ?.id) {
            fetchRealStats(currentQ.id);
        }

        const channel = supabase
            .channel(`live-stats-${id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'attempts',
                    filter: `quiz_id=eq.${id}`
                },
                () => {
                    if (currentQ?.id) fetchRealStats(currentQ.id);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, quiz, currentQuestionIndex]);

    const handleNext = async () => {
        if (!quiz?.questions) return;
        if (currentQuestionIndex < quiz.questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            setViewMode('voting');

            // Sync with DB
            await updateQuizState(nextIndex, 'voting');
        } else {
            // End quiz
            navigate('/faculty/live');
            await supabase.from('quizzes').update({ status: 'completed' }).eq('id', id);
        }
    };

    const handlePrev = async () => {
        if (currentQuestionIndex > 0) {
            const prevIndex = currentQuestionIndex - 1;
            setCurrentQuestionIndex(prevIndex);
            setViewMode('voting');

            // Sync with DB
            await updateQuizState(prevIndex, 'voting');
        }
    };

    const updateQuizState = async (index: number, mode: 'voting' | 'results' = 'voting') => {
        if (!quiz) return;

        let questionExpiresAt = null;

        // Only set expiration if we are entering voting mode
        if (mode === 'voting') {
            const timePerQuestion = Number(quiz.settings?.timePerQuestion) || 60; // Default 60s
            // Add slight buffer (e.g. 2s) for network latency so students get full time
            questionExpiresAt = new Date(Date.now() + (timePerQuestion + 2) * 1000).toISOString();
        }

        // We update the settings json to include currentQuestionIndex and viewMode
        const newSettings = {
            ...quiz.settings,
            currentQuestionIndex: index,
            viewMode: mode,
            questionExpiresAt
        };

        const { error } = await supabase
            .from('quizzes')
            .update({
                settings: newSettings as any
            })
            .eq('id', id);

        if (error) console.error("Failed to sync state:", error);
    };



    if (loading) return <div className="p-8 text-center">Loading controller...</div>;
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return <div className="p-8 text-center">No questions found.</div>;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

    // Calculate total votes for percentages
    const totalVotes = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

    return (
        <div className="max-w-5xl mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/live')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-text">{quiz.title}</h1>
                        <p className="text-xs text-muted">Live Session • Access Code: {(quiz as any).code || quiz.accessCode || quiz.id.slice(0, 4)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Adjusting Phase
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Question Preview */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col overflow-hidden border-neutral-200 dark:border-neutral-800">
                        <CardContent className="p-6 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-4">
                                <span className="text-sm font-medium text-muted">Question {currentQuestionIndex + 1} of {totalQuestions}</span>
                                <span className="bg-neutral-100 dark:bg-neutral-800 text-xs px-2 py-1 rounded text-muted">
                                    {currentQuestion.type?.toUpperCase() || 'MCQ'}
                                </span>
                            </div>

                            <h2 className="text-2xl font-bold text-text mb-6">
                                {currentQuestion.stem}
                            </h2>

                            {/* Options Visualization */}
                            <div className="space-y-3 flex-1 overflow-y-auto">
                                {currentQuestion.options?.map((option, idx) => {
                                    const voteCount = stats[idx] || 0;
                                    const percentage = Math.round((voteCount / totalVotes) * 100);

                                    return (
                                        <div key={idx} className="relative group">
                                            {/* Background Bar */}
                                            {viewMode === 'results' && (
                                                <div
                                                    className="absolute inset-0 bg-primary/10 rounded-lg transition-all duration-1000 ease-out"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            )}

                                            <div className={cn(
                                                "relative p-4 rounded-lg border-2 flex justify-between items-center transition-all",
                                                viewMode === 'results'
                                                    ? "border-transparent"
                                                    : "border-neutral-200 dark:border-neutral-800"
                                            )}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-sm text-muted">
                                                        {String.fromCharCode(65 + idx)}
                                                    </div>
                                                    <span className="font-medium text-text">{option}</span>
                                                </div>

                                                {viewMode === 'results' && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-primary">{percentage}%</span>
                                                        <span className="text-xs text-muted">({voteCount})</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        </CardContent>
                    </Card>

                    {/* Controls */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className="h-14 text-lg"
                        >
                            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
                        </Button>
                        <Button
                            onClick={() => {
                                if (viewMode === 'voting') {
                                    setViewMode('results');
                                } else {
                                    handleNext();
                                }
                            }}
                            className={cn(
                                "h-14 text-lg text-white transition-all",
                                viewMode === 'voting'
                                    ? "bg-red-500 hover:bg-red-600"
                                    : "bg-primary hover:bg-primary/90"
                            )}
                        >
                            {viewMode === 'voting' ? (
                                <>
                                    <Pause className="mr-2 h-5 w-5" /> Stop Voting & Show Results
                                </>
                            ) : (
                                <>
                                    {isLastQuestion ? "Finish Quiz" : "Next Question"} <ChevronRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-4">
                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardContent className="p-6 space-y-6">
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-text mb-2">Live Status</h3>
                                <div className="text-sm text-muted mb-4">
                                    {viewMode === 'voting' ? (
                                        <span className="flex items-center justify-center gap-2 text-primary animate-pulse">
                                            <span className="w-2 h-2 rounded-full bg-primary"></span> Voting Active
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2 text-orange-500">
                                            <Pause className="w-3 h-3" /> Results Shown
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="font-medium text-text">Live Stats</span>
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{onlineCount} Online</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-text">{participation}%</div>
                                        <div className="text-xs text-muted">Participation</div>
                                    </div>
                                    <div className="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg text-center">
                                        <div className="text-2xl font-bold text-text">-</div>
                                        <div className="text-xs text-muted">Avg Time</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200 dark:border-neutral-800 flex-1">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-text mb-4">Question Queue</h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                {quiz.questions.map((q, idx) => (
                                    <div
                                        key={q.id || idx}
                                        onClick={() => {
                                            setCurrentQuestionIndex(idx);
                                            setViewMode('voting');
                                        }}
                                        className={cn(
                                            "p-3 rounded-lg cursor-pointer transition-colors text-sm flex items-center gap-3",
                                            currentQuestionIndex === idx
                                                ? "bg-primary/10 text-primary font-medium"
                                                : "hover:bg-neutral-50 dark:hover:bg-neutral-900 text-muted hover:text-text"
                                        )}
                                    >
                                        <span className={cn(
                                            "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                                            currentQuestionIndex === idx ? "bg-primary text-white" : "bg-neutral-200 text-muted-foreground"
                                        )}>
                                            {idx + 1}
                                        </span>
                                        <span className="truncate flex-1">{q.stem}</span>
                                        {currentQuestionIndex > idx && <CheckCircle className="w-4 h-4 text-green-500" />}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
