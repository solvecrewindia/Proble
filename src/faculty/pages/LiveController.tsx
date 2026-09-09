import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, ChevronRight, ChevronLeft, CheckCircle, Pause, Download, Code2, Clock, Trophy, BarChart3, Users, Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MathText } from '../../shared/components/MathText';
import type { Quiz } from '../types';

const formatSeconds = (totalSec: number) => {
    if (!totalSec || isNaN(totalSec) || totalSec < 0) return '00:00';
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function LiveController() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'voting' | 'results' | 'leaderboard'>('voting');
    const [loading, setLoading] = useState(true);
    const [quizStatus, setQuizStatus] = useState<'active' | 'completed'>('active');
    const [finalResults, setFinalResults] = useState<any[]>([]);
    const [liveLeaderboard, setLiveLeaderboard] = useState<any[]>([]);

    // Host timing: elapsed stopwatch controlled by host
    const [elapsedTime, setElapsedTime] = useState(0);

    // Voting stats
    const [stats, setStats] = useState<Record<string, number>>({});
    const [participation, setParticipation] = useState(0);
    const [onlineCount, setOnlineCount] = useState(0);
    const [codeSubmissionStats, setCodeSubmissionStats] = useState<{ passed: number; failed: number; total: number }>({ passed: 0, failed: 0, total: 0 });

    // Elapsed timer increments while in voting mode
    useEffect(() => {
        if (viewMode !== 'voting' || quizStatus === 'completed') return;
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [viewMode, currentQuestionIndex, quizStatus]);

    const fetchFinalResults = async (quizId: string) => {
        const { data, error } = await supabase
            .from('quiz_results')
            .select(`
                score,
                student_id,
                percentage,
                profiles:student_id (
                    full_name,
                    registration_number
                )
            `)
            .eq('quiz_id', quizId)
            .order('score', { ascending: false });

        if (data && !error) {
            setFinalResults(data);
        }
    };

    const fetchLiveLeaderboard = async () => {
        if (!id) return;
        try {
            const [{ data: qrData }, { data: attemptsData }] = await Promise.all([
                supabase
                    .from('quiz_results')
                    .select('score, student_id')
                    .eq('quiz_id', id)
                    .order('score', { ascending: false }),
                supabase
                    .from('attempts')
                    .select('student_id, score, answers')
                    .eq('quiz_id', id)
            ]);

            const scoreMap: Record<string, number> = {};
            const answersMap: Record<string, any> = {};

            (attemptsData || []).forEach((a: any) => {
                scoreMap[a.student_id] = a.score ?? 0;
                answersMap[a.student_id] = a.answers || {};
            });

            (qrData || []).forEach((r: any) => {
                scoreMap[r.student_id] = r.score ?? 0;
            });

            const allStudentIds = Object.keys(scoreMap);
            if (allStudentIds.length === 0) {
                setLiveLeaderboard([]);
                return;
            }

            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, registration_number')
                .in('id', allStudentIds);

            const profileMap: Record<string, any> = {};
            (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });

            const currentQ = quiz?.questions?.[currentQuestionIndex];

            const enriched = allStudentIds
                .map(sid => {
                    const profile = profileMap[sid];
                    const ans = answersMap[sid] || {};
                    const curAns = currentQ?.id ? ans[currentQ.id] : null;

                    let testCasesInfo: string | null = null;
                    let timeTakenInfo: string | null = null;

                    if (curAns && typeof curAns === 'object') {
                        if (curAns.totalCount !== undefined) {
                            testCasesInfo = `${curAns.passedCount ?? 0}/${curAns.totalCount} Cases`;
                        }
                        if (curAns.timeTaken) {
                            timeTakenInfo = `${curAns.timeTaken}s`;
                        }
                    }

                    return {
                        student_id: sid,
                        score: scoreMap[sid] || 0,
                        name: profile?.full_name || 'Student',
                        regNo: profile?.registration_number || null,
                        testCasesInfo,
                        timeTakenInfo,
                    };
                })
                .sort((a, b) => b.score - a.score);

            setLiveLeaderboard(enriched);
        } catch (err) {
            console.error("Failed to fetch live leaderboard in host controller:", err);
        }
    };

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
                const { data: questionsData } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('quiz_id', id)
                    .order('created_at', { ascending: true });

                if (questionsData) {
                    const mappedQuestions = questionsData.map((q: any) => {
                        let parsedCorrect = q.correct_answer;
                        if (q.type === 'code') {
                            try {
                                parsedCorrect = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer;
                            } catch {
                                parsedCorrect = q.correct_answer;
                            }
                        }
                        return {
                            id: q.id,
                            quizId: id || '',
                            type: (q.type || 'mcq') as any,
                            stem: q.text,
                            options: q.choices,
                            correct: parsedCorrect,
                            weight: 1
                        };
                    });

                    setQuiz({ ...quizData, questions: mappedQuestions });

                    if (quizData.status === 'completed') {
                        setQuizStatus('completed');
                        fetchFinalResults(id);
                    }

                    // Initialize state from DB settings if available
                    if (quizData.settings?.currentQuestionIndex !== undefined) {
                        setCurrentQuestionIndex(quizData.settings.currentQuestionIndex);
                        setViewMode(quizData.settings.viewMode || 'voting');
                    } else if (mappedQuestions.length > 0) {
                        // First load: initialize Q1 in voting mode
                        const newSettings = {
                            ...quizData.settings,
                            currentQuestionIndex: 0,
                            viewMode: 'voting',
                            questionExpiresAt: null
                        };

                        await supabase
                            .from('quizzes')
                            .update({ settings: newSettings, status: 'active' })
                            .eq('id', id);
                    }
                }
            }
            setLoading(false);
        };
        fetchQuiz();
    }, [id]);

    const fetchRealStats = async (questionId: string) => {
        if (!id) return;

        const { data: attempts } = await supabase
            .from('attempts')
            .select('answers, student_id')
            .eq('quiz_id', id);

        if (attempts) {
            setOnlineCount(attempts.length);

            const newStats: Record<string, number> = {};
            let answeredCount = 0;
            let codePassed = 0;
            let codeFailed = 0;

            attempts.forEach(attempt => {
                const answers = attempt.answers || {};
                const ans = answers[questionId];
                if (ans !== undefined && ans !== null) {
                    if (typeof ans === 'number') {
                        newStats[ans] = (newStats[ans] || 0) + 1;
                        answeredCount++;
                    } else if (typeof ans === 'object') {
                        if (ans.type === 'code' || ans.code !== undefined) {
                            answeredCount++;
                            if (ans.passed) {
                                codePassed++;
                            } else {
                                codeFailed++;
                            }
                        } else if (typeof ans.option === 'number') {
                            newStats[ans.option] = (newStats[ans.option] || 0) + 1;
                            answeredCount++;
                        }
                    }
                }
            });
            setStats(newStats);
            setCodeSubmissionStats({ passed: codePassed, failed: codeFailed, total: answeredCount });

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

        const pollInterval = setInterval(() => {
            if (currentQ?.id) fetchRealStats(currentQ.id);
            if (viewMode === 'leaderboard') fetchLiveLeaderboard();
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [id, quiz, currentQuestionIndex, viewMode]);

    const updateQuizState = async (index: number, mode: 'voting' | 'results' | 'leaderboard' = 'voting') => {
        if (!quiz) return;

        const newSettings = {
            ...quiz.settings,
            currentQuestionIndex: index,
            viewMode: mode,
            questionExpiresAt: null // Host is in full control of pacing
        };

        const { error } = await supabase
            .from('quizzes')
            .update({
                settings: newSettings as any,
                status: 'active'
            })
            .eq('id', id);

        if (error) console.error("Failed to sync state:", error);
    };

    const handleNext = async () => {
        if (!quiz?.questions) return;
        if (currentQuestionIndex < quiz.questions.length - 1) {
            const nextIndex = currentQuestionIndex + 1;
            setCurrentQuestionIndex(nextIndex);
            setViewMode('voting');
            setElapsedTime(0);

            await updateQuizState(nextIndex, 'voting');
        } else {
            // End quiz session
            await supabase.from('quizzes').update({ status: 'completed' }).eq('id', id);
            setQuizStatus('completed');
            fetchFinalResults(id || '');
        }
    };

    const handlePrev = async () => {
        if (currentQuestionIndex > 0) {
            const prevIndex = currentQuestionIndex - 1;
            setCurrentQuestionIndex(prevIndex);
            setViewMode('voting');
            setElapsedTime(0);

            await updateQuizState(prevIndex, 'voting');
        }
    };

    if (loading) return <div className="p-8 text-center text-muted">Loading controller...</div>;
    if (!quiz || !quiz.questions || quiz.questions.length === 0) return <div className="p-8 text-center text-muted">No questions found for this quiz.</div>;

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const totalQuestions = quiz.questions.length;
    const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
    const totalVotes = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

    // --- COMPLETED QUIZ FINAL VIEW ---
    if (quizStatus === 'completed') {
        const downloadCSV = () => {
            const headers = ['Rank', 'Student Name', 'Registration Number', 'Score'];
            const rows = finalResults.map((r, i) => [
                i + 1,
                Array.isArray(r.profiles) ? r.profiles[0]?.full_name || 'Unknown' : r.profiles?.full_name || 'Unknown',
                Array.isArray(r.profiles) ? r.profiles[0]?.registration_number || '' : r.profiles?.registration_number || '',
                r.score
            ]);
            const csvContent = "data:text/csv;charset=utf-8,"
                + [headers.join(','), ...rows.map(e => e.map(item => `"${item}"`).join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `${quiz.title.replace(/\s+/g, '_')}_Results.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        return (
            <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center bg-surface p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-text mb-1">Assessment Completed: {quiz.title}</h1>
                        <p className="text-muted text-sm">Final rankings for all participating students</p>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={downloadCSV}>
                            <Download className="w-4 h-4 mr-2" /> Export CSV
                        </Button>
                        <Button onClick={() => navigate('/faculty/live')}>Return to Live Tests</Button>
                    </div>
                </div>

                <Card className="border-neutral-200 dark:border-neutral-800">
                    <CardContent className="p-0">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
                                    <th className="p-4 font-bold text-muted text-xs uppercase">Rank</th>
                                    <th className="p-4 font-bold text-muted text-xs uppercase">Student Name</th>
                                    <th className="p-4 font-bold text-muted text-xs uppercase text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {finalResults.map((r, i) => {
                                    const rawProfileName = Array.isArray(r.profiles) ? r.profiles[0]?.full_name : r.profiles?.full_name;
                                    const studentName = rawProfileName || 'Unknown Student';
                                    const regNo = Array.isArray(r.profiles) ? r.profiles[0]?.registration_number : r.profiles?.registration_number;

                                    return (
                                        <tr key={r.student_id} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
                                            <td className="p-4 font-bold text-text">#{i + 1}</td>
                                            <td className="p-4 text-text flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                    {studentName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold">{studentName}</span>
                                                    {regNo && <span className="text-xs text-muted font-mono">{regNo}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4 font-bold text-primary text-right">{r.score} pts</td>
                                        </tr>
                                    );
                                })}
                                {finalResults.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-muted">No student submissions recorded for this assessment.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                        <p className="text-xs text-muted">
                            Live Assessment • Access Code: <span className="font-mono font-bold text-primary">{(quiz as any).code || quiz.accessCode || quiz.id.slice(0, 4)}</span>
                        </p>
                    </div>
                </div>

                {/* Host Control Header Badge with live elapsed timer */}
                <div className="flex items-center gap-3">
                    <div className="px-3.5 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-mono font-bold flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Elapsed: {formatSeconds(elapsedTime)}</span>
                    </div>

                    <div className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        {viewMode === 'voting' ? 'Voting Active' : 'Leaderboard Active'}
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Main Control Panel: Question or Leaderboard */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col overflow-hidden border-neutral-200 dark:border-neutral-800">
                        <CardContent className="p-6 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-3">
                                <span className="text-sm font-medium text-muted">
                                    Question {currentQuestionIndex + 1} of {totalQuestions}
                                </span>
                                <span className="bg-neutral-100 dark:bg-neutral-800 text-xs px-2.5 py-1 rounded-md font-bold text-muted">
                                    {currentQuestion.type === 'code' ? 'PYTHON ML CHALLENGE' : 'MULTIPLE CHOICE'}
                                </span>
                            </div>

                            <MathText text={currentQuestion.stem} className="text-xl font-bold text-text mb-4" as="h2" />

                            {/* View Mode: Leaderboard vs Question Workspace */}
                            {viewMode === 'leaderboard' ? (
                                <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                                    <div className="flex items-center justify-between pb-2 border-b border-border">
                                        <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                                            <Trophy className="w-4 h-4" />
                                            <span>Current Standings (Test Cases & Timing)</span>
                                        </div>
                                        <span className="text-xs text-muted">{liveLeaderboard.length} student(s) ranked</span>
                                    </div>

                                    <div className="space-y-2">
                                        {liveLeaderboard.map((student, idx) => (
                                            <div
                                                key={student.student_id}
                                                className="p-3 rounded-xl border border-border bg-surface flex items-center justify-between text-sm hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "font-black w-6 text-center text-sm",
                                                        idx === 0 ? "text-amber-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-amber-700" : "text-muted"
                                                    )}>
                                                        #{idx + 1}
                                                    </span>
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                        {student.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-text text-sm">{student.name}</p>
                                                        <div className="flex items-center gap-2 text-xs text-muted">
                                                            {student.regNo && <span className="font-mono">{student.regNo}</span>}
                                                            {student.testCasesInfo && (
                                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[11px]">
                                                                    ✓ {student.testCasesInfo}
                                                                </span>
                                                            )}
                                                            {student.timeTakenInfo && (
                                                                <span className="font-mono text-muted text-[11px]">⏱ {student.timeTakenInfo}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-black text-primary text-base">{student.score}</span>
                                                    <span className="text-[10px] text-muted block">pts</span>
                                                </div>
                                            </div>
                                        ))}

                                        {liveLeaderboard.length === 0 && (
                                            <div className="p-8 text-center text-muted text-sm">
                                                No submissions recorded yet for this question.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : currentQuestion.type === 'code' ? (
                                <div className="space-y-4 flex-1 overflow-y-auto">
                                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                            <Code2 className="w-4 h-4" />
                                            <span>Python 3 Code Challenge</span>
                                        </div>
                                        <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-mono font-semibold">
                                            {((currentQuestion.correct as any)?.testCases || []).length} Test Cases
                                        </span>
                                    </div>

                                    {/* Live Submission Stats */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                            <div className="text-2xl font-black text-emerald-500">{codeSubmissionStats.passed}</div>
                                            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Passed All Cases</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                                            <div className="text-2xl font-black text-rose-500">{codeSubmissionStats.failed}</div>
                                            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium">Failed / Partial</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-center">
                                            <div className="text-2xl font-black text-primary">{codeSubmissionStats.total} / {onlineCount}</div>
                                            <div className="text-xs text-primary font-medium">Submitted</div>
                                        </div>
                                    </div>

                                    {/* Test Cases Overview */}
                                    <div className="space-y-2">
                                        <span className="text-xs font-semibold text-muted">Test Cases:</span>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {((currentQuestion.correct as any)?.testCases || []).map((tc: any, i: number) => (
                                                <div key={i} className="p-2.5 rounded-lg bg-surface border border-border text-xs font-mono">
                                                    <div className="text-primary font-bold mb-1">Case {i + 1}</div>
                                                    <div><span className="text-muted">Input:</span> {tc.input || '(none)'}</div>
                                                    <div><span className="text-muted">Expected:</span> {tc.output}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3 flex-1 overflow-y-auto">
                                    {currentQuestion.options?.map((option, idx) => {
                                        const voteCount = stats[idx] || 0;
                                        const percentage = Math.round((voteCount / totalVotes) * 100);

                                        return (
                                            <div key={idx} className="relative group">
                                                <div className="relative p-4 rounded-xl border border-border bg-surface flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center font-bold text-xs text-muted">
                                                            {String.fromCharCode(65 + idx)}
                                                        </div>
                                                        <MathText text={option} className="font-semibold text-sm text-text" />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-primary text-sm">{percentage}%</span>
                                                        <span className="text-xs text-muted">({voteCount})</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Controls: Host-Controlled Transitions */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={currentQuestionIndex === 0}
                            className="h-14 text-base"
                        >
                            <ChevronLeft className="mr-2 h-5 w-5" /> Previous
                        </Button>

                        <Button
                            onClick={async () => {
                                if (viewMode === 'voting') {
                                    setViewMode('leaderboard');
                                    fetchLiveLeaderboard();
                                    await updateQuizState(currentQuestionIndex, 'leaderboard');
                                } else {
                                    handleNext();
                                }
                            }}
                            className={cn(
                                "h-14 text-base font-bold text-white transition-all shadow-lg",
                                viewMode === 'voting'
                                    ? "bg-amber-600 hover:bg-amber-700"
                                    : "bg-primary hover:bg-primary/90"
                            )}
                        >
                            {viewMode === 'voting' ? (
                                <>
                                    <Trophy className="mr-2 h-5 w-5" /> Show Live Leaderboard
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
                        <CardContent className="p-6 space-y-5">
                            <div className="text-center">
                                <h3 className="text-base font-bold text-text mb-1">Session Controller</h3>
                                <p className="text-xs text-muted">
                                    {viewMode === 'voting' ? 'Students are actively solving' : 'Displaying standings'}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-medium text-xs uppercase tracking-wider text-muted">Participants</span>
                                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full">
                                        {onlineCount} Online
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-surface p-3 rounded-xl border border-border text-center">
                                        <div className="text-2xl font-black text-text">{participation}%</div>
                                        <div className="text-xs text-muted">Participation</div>
                                    </div>
                                    <div className="bg-surface p-3 rounded-xl border border-border text-center">
                                        <div className="text-2xl font-black text-primary">{codeSubmissionStats.total}</div>
                                        <div className="text-xs text-muted">Submitted</div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200 dark:border-neutral-800 flex-1">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-text text-sm mb-3">Question Queue</h3>
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                {quiz.questions.map((q, idx) => (
                                    <div
                                        key={q.id || idx}
                                        onClick={() => {
                                            setCurrentQuestionIndex(idx);
                                            setViewMode('voting');
                                            setElapsedTime(0);
                                            updateQuizState(idx, 'voting');
                                        }}
                                        className={cn(
                                            "p-3 rounded-xl cursor-pointer transition-colors text-xs flex items-center gap-3 border",
                                            currentQuestionIndex === idx
                                                ? "bg-primary/10 border-primary text-primary font-bold"
                                                : "border-border hover:bg-surface text-muted hover:text-text"
                                        )}
                                    >
                                        <span className={cn(
                                            "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                            currentQuestionIndex === idx ? "bg-primary text-white" : "bg-neutral-100 dark:bg-neutral-800 text-muted"
                                        )}>
                                            {idx + 1}
                                        </span>
                                        <MathText text={q.stem} className="truncate flex-1" />
                                        {currentQuestionIndex > idx && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
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
