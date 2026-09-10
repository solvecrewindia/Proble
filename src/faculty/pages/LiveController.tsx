import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { ArrowLeft, ChevronRight, ChevronLeft, CheckCircle, Pause, Download, Code2, Clock, Trophy, BarChart3, Users, Play, Eye, X, CheckCircle2, ShieldAlert, AlertTriangle, RotateCcw, Shield, RefreshCw, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { MathText } from '../../shared/components/MathText';
import { CodeEditor } from '../../shared/components/CodeEditor';
import type { Quiz } from '../types';

interface StudentSubmission {
    studentId: string;
    name: string;
    regNo: string | null;
    answered: boolean;
    passed: boolean;
    passedCount?: number;
    totalCount?: number;
    timeTaken?: number;
    points?: number;
    code?: string;
    option?: number;
}

interface StudentViolationInfo {
    attemptId: string;
    studentId: string;
    name: string;
    regNo: string | null;
    status: string;
    strikes: number;
    flags: string[];
    isTerminated: boolean;
    score: number;
}

const formatSeconds = (totalSec: number) => {
    if (!totalSec || isNaN(totalSec) || totalSec <= 0) return '00:00';
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = Math.floor(totalSec % 60);
    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function LiveController() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'voting' | 'results' | 'leaderboard' | 'violations'>('voting');
    const [loading, setLoading] = useState(true);
    const [quizStatus, setQuizStatus] = useState<'active' | 'completed'>('active');
    const [finalResults, setFinalResults] = useState<any[]>([]);
    const [liveLeaderboard, setLiveLeaderboard] = useState<any[]>([]);
    const [violationsList, setViolationsList] = useState<StudentViolationInfo[]>([]);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
    const [violationsFilter, setViolationsFilter] = useState<'all' | 'terminated' | 'warnings' | 'clean'>('all');
    const [violationsSearch, setViolationsSearch] = useState('');

    // Host timing: elapsed stopwatch controlled by host
    const [elapsedTime, setElapsedTime] = useState(0);

    // Voting stats
    const [stats, setStats] = useState<Record<string, number>>({});
    const [participation, setParticipation] = useState(0);
    const [onlineCount, setOnlineCount] = useState(0);
    const [codeSubmissionStats, setCodeSubmissionStats] = useState<{ passed: number; failed: number; total: number }>({ passed: 0, failed: 0, total: 0 });
    const [studentSubmissions, setStudentSubmissions] = useState<StudentSubmission[]>([]);
    const [viewingStudentCode, setViewingStudentCode] = useState<{ name: string; code: string } | null>(null);

    // Countdown timer & auto-finish when set test duration expires
    useEffect(() => {
        if (quizStatus === 'completed') return;

        const totalDurationMinutes = Number(quiz?.settings?.duration || (quiz as any)?.durationMinutes || 60);
        const totalDurationSeconds = totalDurationMinutes * 60;

        const timer = setInterval(() => {
            setElapsedTime(prev => {
                const next = prev + 1;
                if (next >= totalDurationSeconds) {
                    // Auto-finish assessment for faculty & students when set time is finished
                    supabase.from('quizzes').update({ status: 'completed' }).eq('id', id).then(() => {
                        setQuizStatus('completed');
                        if (id) fetchFinalResults(id);
                    });
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [quizStatus, quiz?.settings?.duration, id]);

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

    const fetchViolationsData = async () => {
        if (!id) return;
        try {
            const { data: attemptsData, error: attemptsError } = await supabase
                .from('attempts')
                .select('id, student_id, status, flags, score')
                .eq('quiz_id', id);

            if (attemptsError || !attemptsData) {
                console.error("Error fetching attempts for violations:", attemptsError);
                return;
            }

            const studentIds = attemptsData.map(a => a.student_id);
            const profileMap: Record<string, any> = {};

            if (studentIds.length > 0) {
                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, registration_number')
                    .in('id', studentIds);

                (profilesData || []).forEach(p => {
                    profileMap[p.id] = p;
                });
            }

            const enriched: StudentViolationInfo[] = attemptsData.map(attempt => {
                const profile = profileMap[attempt.student_id];
                const rawFlags: string[] = Array.isArray(attempt.flags) ? attempt.flags : [];
                const strikes = attempt.status === 'terminated'
                    ? 3
                    : Math.min(3, rawFlags.length);
                const isTerminated = attempt.status === 'terminated' || strikes >= 3;

                return {
                    attemptId: attempt.id,
                    studentId: attempt.student_id,
                    name: profile?.full_name || 'Student',
                    regNo: profile?.registration_number || null,
                    status: attempt.status || 'in-progress',
                    strikes,
                    flags: rawFlags,
                    isTerminated,
                    score: attempt.score ?? 0,
                };
            });

            // Sort: Terminated first, then by highest strikes, then alphabetically
            enriched.sort((a, b) => {
                if (a.isTerminated && !b.isTerminated) return -1;
                if (!a.isTerminated && b.isTerminated) return 1;
                if (b.strikes !== a.strikes) return b.strikes - a.strikes;
                return a.name.localeCompare(b.name);
            });

            setViolationsList(enriched);
        } catch (err) {
            console.error("Failed to fetch violations data:", err);
        }
    };

    const handleAllowRetake = async (studentId: string, resetAnswers: boolean = true, studentName?: string) => {
        if (!id) return;
        const confirmMsg = studentName
            ? `Allow ${studentName} to retake this test? Their attempt will be unlocked so they can retake it.`
            : "Allow this student to retake the test?";
        if (!window.confirm(confirmMsg)) return;

        setActionLoadingId(studentId);
        try {
            const updatePayload: any = {
                status: 'in-progress',
                flags: []
            };
            if (resetAnswers) {
                updatePayload.answers = {};
                updatePayload.score = 0;
            }

            const { error } = await supabase
                .from('attempts')
                .update(updatePayload)
                .eq('quiz_id', id)
                .eq('student_id', studentId);

            if (error) {
                console.error("Error allowing retake:", error);
                alert("Failed to allow retake: " + error.message);
            } else {
                if (quizStatus === 'completed') {
                    await supabase.from('quizzes').update({ status: 'active' }).eq('id', id);
                    setQuizStatus('active');
                }
                await fetchViolationsData();
                fetchLiveLeaderboard();
                const curQ = quiz?.questions?.[currentQuestionIndex];
                if (curQ?.id) fetchRealStats(curQ.id);
                if (id) fetchFinalResults(id);
            }
        } catch (err) {
            console.error("Failed to allow retake:", err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleResetStrikes = async (studentId: string) => {
        if (!id) return;
        setActionLoadingId(studentId);
        try {
            const { error } = await supabase
                .from('attempts')
                .update({
                    flags: []
                })
                .eq('quiz_id', id)
                .eq('student_id', studentId);

            if (error) {
                console.error("Error resetting strikes:", error);
            } else {
                await fetchViolationsData();
            }
        } catch (err) {
            console.error("Failed to reset strikes:", err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleAllowRetakeAll = async () => {
        if (!id) return;
        const terminatedStudents = violationsList.filter(s => s.isTerminated);
        if (terminatedStudents.length === 0) return;

        setActionLoadingId('all');
        try {
            const { error } = await supabase
                .from('attempts')
                .update({
                    status: 'in-progress',
                    flags: []
                })
                .eq('quiz_id', id)
                .eq('status', 'terminated');

            if (error) {
                console.error("Error allowing retake for all:", error);
            } else {
                await fetchViolationsData();
            }
        } catch (err) {
            console.error("Failed to allow retake for all:", err);
        } finally {
            setActionLoadingId(null);
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
            .select('answers, student_id, score')
            .eq('quiz_id', id);

        if (attempts) {
            setOnlineCount(attempts.length);

            const allStudentIds = attempts.map(a => a.student_id);
            const profileMap: Record<string, any> = {};
            if (allStudentIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, registration_number')
                    .in('id', allStudentIds);
                (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });
            }

            const newStats: Record<string, number> = {};
            let answeredCount = 0;
            let codePassed = 0;
            let codeFailed = 0;
            const detailedSubmissions: StudentSubmission[] = [];

            attempts.forEach(attempt => {
                let answers = attempt.answers || {};
                if (typeof answers === 'string') {
                    try { answers = JSON.parse(answers); } catch {}
                }
                const ans = answers[questionId];
                const profile = profileMap[attempt.student_id];
                const studentName = profile?.full_name || 'Student';
                const regNo = profile?.registration_number || null;

                if (ans !== undefined && ans !== null) {
                    if (typeof ans === 'number') {
                        newStats[ans] = (newStats[ans] || 0) + 1;
                        answeredCount++;
                        detailedSubmissions.push({
                            studentId: attempt.student_id,
                            name: studentName,
                            regNo,
                            answered: true,
                            passed: false,
                            option: ans
                        });
                    } else if (typeof ans === 'object') {
                        if (ans.type === 'code' || ans.code !== undefined) {
                            answeredCount++;
                            if (ans.passed) {
                                codePassed++;
                            } else {
                                codeFailed++;
                            }
                            detailedSubmissions.push({
                                studentId: attempt.student_id,
                                name: studentName,
                                regNo,
                                answered: true,
                                passed: Boolean(ans.passed),
                                passedCount: ans.passedCount,
                                totalCount: ans.totalCount,
                                timeTaken: ans.timeTaken,
                                points: ans.points,
                                code: ans.code
                            });
                        } else if (typeof ans.option === 'number') {
                            newStats[ans.option] = (newStats[ans.option] || 0) + 1;
                            answeredCount++;
                            detailedSubmissions.push({
                                studentId: attempt.student_id,
                                name: studentName,
                                regNo,
                                answered: true,
                                passed: Boolean(ans.passed),
                                option: ans.option,
                                timeTaken: ans.timeTaken,
                                points: ans.points
                            });
                        }
                    }
                } else {
                    detailedSubmissions.push({
                        studentId: attempt.student_id,
                        name: studentName,
                        regNo,
                        answered: false,
                        passed: false
                    });
                }
            });

            // Sort so answered/passed students appear at top
            detailedSubmissions.sort((a, b) => {
                if (a.answered && !b.answered) return -1;
                if (!a.answered && b.answered) return 1;
                return (b.points || 0) - (a.points || 0);
            });

            setStats(newStats);
            setCodeSubmissionStats({ passed: codePassed, failed: codeFailed, total: answeredCount });
            setStudentSubmissions(detailedSubmissions);

            const totalParticipants = attempts.length;
            const pct = totalParticipants > 0 ? Math.round((answeredCount / totalParticipants) * 100) : 0;
            setParticipation(pct);
        }
    };

    // Sub to attempts for real-time stats and live updates
    useEffect(() => {
        if (!quiz || !quiz.questions || quiz.questions.length === 0) return;

        const currentQ = quiz.questions[currentQuestionIndex];
        if (currentQ?.id) {
            fetchRealStats(currentQ.id);
        }
        fetchViolationsData();

        const pollInterval = setInterval(() => {
            if (currentQ?.id) fetchRealStats(currentQ.id);
            if (viewMode === 'leaderboard') fetchLiveLeaderboard();
            fetchViolationsData();
        }, 2000);

        // Instant Realtime updates via Postgres changes
        let channel: any = null;
        try {
            channel = supabase
                .channel(`live-host-sync-${id}`)
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
                        fetchLiveLeaderboard();
                        fetchViolationsData();
                    }
                )
                .subscribe();
        } catch (subErr) {
            console.warn("Realtime sub error in host:", subErr);
        }

        return () => {
            clearInterval(pollInterval);
            if (channel) supabase.removeChannel(channel);
        };
    }, [id, quiz, currentQuestionIndex, viewMode]);

    const updateQuizState = async (index: number, mode: 'voting' | 'results' | 'leaderboard' | 'violations' = 'voting') => {
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
    const isCodeMode = Boolean(quiz.settings?.isCodingTest) || Boolean(quiz.settings?.setsConfig?.enabled) || (Array.isArray(quiz.questions) && quiz.questions.some((q: any) => q.type === 'code'));
    const totalVotes = Object.values(stats).reduce((a, b) => a + b, 0) || 1;

    const handleFinishExam = async () => {
        if (!id) return;
        const confirmEnd = window.confirm("Are you sure you want to finish this live coding assessment? All student scores will be finalized.");
        if (!confirmEnd) return;
        await supabase.from('quizzes').update({ status: 'completed' }).eq('id', id);
        setQuizStatus('completed');
        fetchFinalResults(id);
    };

    const terminatedCount = violationsList.filter(s => s.isTerminated).length;
    const warningsCount = violationsList.filter(s => s.strikes > 0 && !s.isTerminated).length;

    const filteredViolations = violationsList.filter(student => {
        if (violationsFilter === 'terminated' && !student.isTerminated) return false;
        if (violationsFilter === 'warnings' && (student.strikes === 0 || student.isTerminated)) return false;
        if (violationsFilter === 'clean' && student.strikes > 0) return false;

        if (violationsSearch.trim()) {
            const query = violationsSearch.toLowerCase();
            const matchesName = student.name.toLowerCase().includes(query);
            const matchesRegNo = student.regNo?.toLowerCase().includes(query) || false;
            return matchesName || matchesRegNo;
        }

        return true;
    });

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
                                    <th className="p-4 font-bold text-muted text-xs uppercase text-right">Action</th>
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
                                            <td className="p-4 text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAllowRetake(r.student_id, true, studentName)}
                                                    disabled={actionLoadingId === r.student_id}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 h-8 shadow-sm flex items-center gap-1.5 cursor-pointer ml-auto"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    {actionLoadingId === r.student_id ? 'Unlocking...' : 'Retake Test'}
                                                </Button>
                                            </td>
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
        <div className="max-w-6xl mx-auto space-y-6 min-h-[calc(100vh-100px)] flex flex-col pb-12">
            {/* Header */}
            <div className="flex justify-between items-center bg-surface p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/faculty/live')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-text">{quiz.title}</h1>
                        <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                            <span>Live Assessment • Access Code: <span className="font-mono font-bold text-primary">{(quiz as any).code || quiz.accessCode || quiz.id.slice(0, 4)}</span></span>
                            {quiz.settings?.setsConfig?.enabled && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                    Question Sets Active ({quiz.settings.setsConfig.questionsPerStudent || 2} Qs/Student)
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Host Control Header Badge with live countdown timer and view toggle */}
                {(() => {
                    const totalDurationMinutes = Number(quiz.settings?.duration || (quiz as any).durationMinutes || 60);
                    const totalDurationSeconds = totalDurationMinutes * 60;
                    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedTime);

                    return (
                        <div className="flex items-center gap-3">
                            <div className={cn(
                                "px-3.5 py-1.5 rounded-full text-xs font-mono font-bold flex items-center gap-2 transition-colors border",
                                remainingSeconds <= 300
                                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                                    : "bg-primary/10 text-primary border-primary/20"
                            )}>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Time Left: {formatSeconds(remainingSeconds)}</span>
                            </div>

                            <div className="flex items-center p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl border border-border">
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('voting');
                                updateQuizState(currentQuestionIndex, 'voting');
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                viewMode === 'voting'
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-muted hover:text-text"
                            )}
                        >
                            <BarChart3 className="w-3.5 h-3.5" /> Live Analysis
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('leaderboard');
                                fetchLiveLeaderboard();
                                updateQuizState(currentQuestionIndex, 'leaderboard');
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                viewMode === 'leaderboard'
                                    ? "bg-amber-600 text-white shadow-sm"
                                    : "text-muted hover:text-text"
                            )}
                        >
                            <Trophy className="w-3.5 h-3.5" /> Leaderboard
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setViewMode('violations');
                                fetchViolationsData();
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                                viewMode === 'violations'
                                    ? "bg-rose-600 text-white shadow-sm"
                                    : "text-muted hover:text-text"
                            )}
                        >
                            <ShieldAlert className="w-3.5 h-3.5" /> Tab Switching & Incidents
                            {terminatedCount > 0 ? (
                                <span className={cn(
                                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono leading-none",
                                    viewMode === 'violations' ? "bg-white text-rose-600" : "bg-rose-500 text-white"
                                )}>
                                    {terminatedCount}
                                </span>
                            ) : warningsCount > 0 ? (
                                <span className={cn(
                                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black font-mono leading-none",
                                    viewMode === 'violations' ? "bg-white text-amber-600" : "bg-amber-500 text-white"
                                )}>
                                    {warningsCount}
                                </span>
                            ) : null}
                        </button>
                    </div>
                </div>
                    );
                })()}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* Main Control Panel: Question or Leaderboard */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col overflow-hidden border-neutral-200 dark:border-neutral-800">
                        <CardContent className="p-6 flex flex-col h-full">
                            {viewMode === 'violations' ? (
                                <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
                                    {/* Proctoring Header */}
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-border shrink-0">
                                        <div>
                                            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
                                                <ShieldAlert className="w-4 h-4" /> Live Proctoring & Security
                                            </div>
                                            <h2 className="text-xl font-black text-text mt-0.5">
                                                Tab Switching & Incident Control
                                            </h2>
                                            <p className="text-xs text-muted mt-0.5">
                                                Limit: 3 strikes before automatic exam termination. Instructors can allow retakes below.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={fetchViolationsData}
                                                className="h-8 text-xs flex items-center gap-1.5 border-border"
                                            >
                                                <RefreshCw className="w-3 h-3" /> Refresh
                                            </Button>
                                            {terminatedCount > 0 && (
                                                <Button
                                                    size="sm"
                                                    onClick={handleAllowRetakeAll}
                                                    disabled={actionLoadingId === 'all'}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 shadow-sm flex items-center gap-1.5 font-bold"
                                                >
                                                    <RotateCcw className="w-3.5 h-3.5" />
                                                    {actionLoadingId === 'all' ? 'Unlocking...' : `Allow Retake All (${terminatedCount})`}
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Summary Metric Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
                                        <div className="p-3 rounded-xl bg-surface border border-border text-center">
                                            <div className="text-2xl font-black text-text">{violationsList.length}</div>
                                            <div className="text-[11px] text-muted font-medium">Monitored</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                                {violationsList.filter(s => s.strikes === 0).length}
                                            </div>
                                            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">Clean (0/3)</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                                                {warningsCount}
                                            </div>
                                            <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">Warnings (1-2/3)</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
                                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                                                {terminatedCount}
                                            </div>
                                            <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">Terminated (3/3)</div>
                                        </div>
                                    </div>

                                    {/* Filters & Search */}
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                                        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg border border-border w-full sm:w-auto text-xs">
                                            {(['all', 'terminated', 'warnings', 'clean'] as const).map((filter) => (
                                                <button
                                                    key={filter}
                                                    type="button"
                                                    onClick={() => setViolationsFilter(filter)}
                                                    className={cn(
                                                        "px-2.5 py-1 rounded-md capitalize font-semibold transition-all cursor-pointer text-xs",
                                                        violationsFilter === filter
                                                            ? "bg-surface text-text shadow-xs"
                                                            : "text-muted hover:text-text"
                                                    )}
                                                >
                                                    {filter === 'clean' ? 'Clean (0/3)' : filter === 'terminated' ? 'Terminated (3/3)' : filter === 'warnings' ? 'Warnings (1-2/3)' : 'All Students'}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="relative w-full sm:w-60">
                                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                                            <input
                                                type="text"
                                                placeholder="Search student or reg no..."
                                                value={violationsSearch}
                                                onChange={(e) => setViolationsSearch(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-text placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Student List */}
                                    <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                                        {filteredViolations.map((student) => (
                                            <div
                                                key={student.studentId}
                                                className={cn(
                                                    "p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3",
                                                    student.isTerminated
                                                        ? "bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50"
                                                        : student.strikes > 0
                                                            ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                                                            : "bg-surface border-border hover:bg-neutral-50 dark:hover:bg-neutral-900"
                                                )}
                                            >
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className={cn(
                                                        "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                                                        student.isTerminated
                                                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                                            : student.strikes > 0
                                                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                                                : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                                    )}>
                                                        {student.isTerminated ? (
                                                            <ShieldAlert className="w-4 h-4" />
                                                        ) : student.strikes > 0 ? (
                                                            <AlertTriangle className="w-4 h-4" />
                                                        ) : (
                                                            student.name.substring(0, 2).toUpperCase()
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-bold text-text text-sm truncate">{student.name}</span>
                                                            {student.regNo && (
                                                                <span className="font-mono text-xs text-muted bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
                                                                    {student.regNo}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Tab-Switching Strikes Counter (?/3) */}
                                                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                            <span className={cn(
                                                                "font-mono font-black text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1",
                                                                student.isTerminated
                                                                    ? "bg-rose-500 text-white shadow-xs"
                                                                    : student.strikes === 2
                                                                        ? "bg-orange-500 text-white"
                                                                        : student.strikes === 1
                                                                            ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                                                                            : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                                                            )}>
                                                                {student.strikes}/3 Strikes
                                                                {student.isTerminated && " • TERMINATED"}
                                                            </span>
                                                            <span className="text-[11px] text-muted">
                                                                Score: <span className="font-bold text-text">{student.score} pts</span>
                                                            </span>
                                                        </div>

                                                        {/* Detailed incident flags log */}
                                                        {student.flags.length > 0 && (
                                                            <div className="mt-2 space-y-1 bg-surface/60 p-2 rounded-lg border border-border/60">
                                                                {student.flags.map((flag, fIdx) => (
                                                                    <div key={fIdx} className="text-[11px] font-mono text-muted flex items-center gap-1.5">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                                                        <span className="truncate">{flag}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Action buttons */}
                                                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAllowRetake(student.studentId, true, student.name)}
                                                        disabled={actionLoadingId === student.studentId}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 h-8 shadow-sm flex items-center gap-1.5 cursor-pointer"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                        {actionLoadingId === student.studentId ? 'Unlocking...' : 'Retake Test'}
                                                    </Button>
                                                    {student.strikes > 0 && !student.isTerminated && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleResetStrikes(student.studentId)}
                                                            disabled={actionLoadingId === student.studentId}
                                                            className="border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold px-2.5 py-1.5 h-8 flex items-center gap-1.5 cursor-pointer"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                            {actionLoadingId === student.studentId ? 'Resetting...' : 'Reset Strikes'}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {filteredViolations.length === 0 && (
                                            <div className="p-8 text-center text-muted text-xs bg-surface rounded-xl border border-dashed border-border space-y-1">
                                                <Shield className="w-6 h-6 mx-auto text-muted/50 mb-2" />
                                                <p className="font-semibold text-text">No students found matching this criteria.</p>
                                                <p>Students who enter the live test and trigger tab switching will appear here in real-time.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start mb-3">
                                        <span className="text-sm font-medium text-muted">
                                            Question {currentQuestionIndex + 1} of {totalQuestions}
                                        </span>
                                        <span className="bg-neutral-100 dark:bg-neutral-800 text-xs px-2.5 py-1 rounded-md font-bold text-muted">
                                            {currentQuestion.type === 'code' ? 'CODE CHALLENGE' : 'MULTIPLE CHOICE'}
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
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <span className="font-black text-primary text-base">{student.score}</span>
                                                        <span className="text-[10px] text-muted block">pts</span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleAllowRetake(student.student_id, true, student.name)}
                                                        disabled={actionLoadingId === student.student_id}
                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2.5 py-1.5 h-8 shadow-sm flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        {actionLoadingId === student.student_id ? 'Unlocking...' : 'Retake Test'}
                                                    </Button>
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
                                <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                                    <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                            <Code2 className="w-4 h-4" />
                                            <span>Code Challenge</span>
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

                                    {/* Live Student Activity & Submissions Breakdown */}
                                    <div className="space-y-2 pt-3 border-t border-border">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-text flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5 text-primary" /> Live Student Submissions ({studentSubmissions.filter(s => s.answered).length}/{onlineCount})
                                            </span>
                                            <span className="text-[11px] text-muted">Real-time sync</span>
                                        </div>

                                        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                            {studentSubmissions.map((sub) => (
                                                <div
                                                    key={sub.studentId}
                                                    className="p-2.5 rounded-xl border border-border bg-surface flex items-center justify-between text-xs"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[11px] shrink-0">
                                                            {sub.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-text truncate text-xs">{sub.name}</p>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted">
                                                                {sub.regNo && <span className="font-mono">{sub.regNo}</span>}
                                                                {sub.timeTaken && <span>⏱ {sub.timeTaken}s</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {sub.answered ? (
                                                            <>
                                                                {sub.passed ? (
                                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-mono text-[10px] flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3" />
                                                                        {sub.passedCount !== undefined ? `${sub.passedCount}/${sub.totalCount} Cases` : 'Passed'}
                                                                    </span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold font-mono text-[10px] flex items-center gap-1">
                                                                        <X className="w-3 h-3" />
                                                                        {sub.passedCount !== undefined ? `${sub.passedCount}/${sub.totalCount} Cases` : 'Failed'}
                                                                    </span>
                                                                )}
                                                                {sub.points !== undefined && (
                                                                    <span className="font-bold text-primary text-xs font-mono">{sub.points} pts</span>
                                                                )}
                                                                {sub.code && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => setViewingStudentCode({ name: sub.name, code: sub.code || '' })}
                                                                        className="h-7 text-[11px] px-2 flex items-center gap-1 border-primary/20 hover:bg-primary/10"
                                                                    >
                                                                        <Eye className="w-3 h-3" /> View Code
                                                                    </Button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-[10px] flex items-center gap-1">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                                Solving...
                                                            </span>
                                                        )}

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleAllowRetake(sub.studentId, true, sub.name)}
                                                            disabled={actionLoadingId === sub.studentId}
                                                            className="h-7 text-[11px] px-2 flex items-center gap-1 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 font-bold cursor-pointer"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                            {actionLoadingId === sub.studentId ? '...' : 'Retake'}
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}

                                            {studentSubmissions.length === 0 && (
                                                <div className="p-4 text-center text-muted text-xs bg-surface rounded-xl border border-dashed border-border">
                                                    Waiting for students to join or run test cases...
                                                </div>
                                            )}
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
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {/* Controls: Host-Controlled Transitions */}
                    {isCodeMode ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                onClick={async () => {
                                    if (viewMode === 'violations') {
                                        setViewMode('voting');
                                    } else {
                                        const nextMode = viewMode === 'voting' ? 'leaderboard' : 'voting';
                                        setViewMode(nextMode);
                                        if (nextMode === 'leaderboard') fetchLiveLeaderboard();
                                    }
                                }}
                                className={cn(
                                    "h-14 text-sm font-bold border transition-all",
                                    viewMode === 'voting'
                                        ? "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                        : viewMode === 'violations'
                                            ? "border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                            : "border-primary/40 text-primary hover:bg-primary/10"
                                )}
                            >
                                {viewMode === 'voting' ? (
                                    <>
                                        <Trophy className="mr-1.5 h-4 w-4" /> View Leaderboard
                                    </>
                                ) : (
                                    <>
                                        <BarChart3 className="mr-1.5 h-4 w-4" /> Live Analysis
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleFinishExam}
                                className="h-14 text-sm font-bold text-white transition-all shadow-lg bg-rose-600 hover:bg-rose-700"
                            >
                                Finish Exam <CheckCircle className="ml-1.5 h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            <Button
                                variant="outline"
                                onClick={handlePrev}
                                disabled={currentQuestionIndex === 0}
                                className="h-14 text-sm font-semibold"
                            >
                                <ChevronLeft className="mr-1.5 h-4 w-4" /> Previous
                            </Button>

                            <Button
                                variant="outline"
                                onClick={async () => {
                                    if (viewMode === 'violations') {
                                        setViewMode('voting');
                                        await updateQuizState(currentQuestionIndex, 'voting');
                                    } else {
                                        const nextMode = viewMode === 'voting' ? 'leaderboard' : 'voting';
                                        setViewMode(nextMode);
                                        if (nextMode === 'leaderboard') fetchLiveLeaderboard();
                                        await updateQuizState(currentQuestionIndex, nextMode);
                                    }
                                }}
                                className={cn(
                                    "h-14 text-sm font-bold border transition-all",
                                    viewMode === 'voting'
                                        ? "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                                        : viewMode === 'violations'
                                            ? "border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                                            : "border-primary/40 text-primary hover:bg-primary/10"
                                )}
                            >
                                {viewMode === 'voting' ? (
                                    <>
                                        <Trophy className="mr-1.5 h-4 w-4" /> View Leaderboard
                                    </>
                                ) : (
                                    <>
                                        <BarChart3 className="mr-1.5 h-4 w-4" /> Live Analysis
                                    </>
                                )}
                            </Button>

                            <Button
                                onClick={handleNext}
                                className="h-14 text-sm font-bold text-white transition-all shadow-lg bg-primary hover:bg-primary/90"
                            >
                                {isLastQuestion ? "Finish Quiz" : "Next Question"} <ChevronRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-4 lg:sticky lg:top-4 flex flex-col">
                    <Card className="border-neutral-200 dark:border-neutral-800">
                        <CardContent className="p-6 space-y-5">
                            <div className="text-center">
                                <h3 className="text-base font-bold text-text mb-1">Session Controller</h3>
                                <p className="text-xs text-muted">
                                    {viewMode === 'voting'
                                        ? 'Students are actively solving'
                                        : viewMode === 'violations'
                                            ? 'Monitoring student integrity & strikes'
                                            : 'Displaying standings'}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-border">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="font-medium text-xs uppercase tracking-wider text-muted">Participants</span>
                                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full">
                                        {onlineCount} Online
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="bg-surface p-3 rounded-xl border border-border text-center">
                                        <div className="text-2xl font-black text-text">{participation}%</div>
                                        <div className="text-xs text-muted">Participation</div>
                                    </div>
                                    <div className="bg-surface p-3 rounded-xl border border-border text-center">
                                        <div className="text-2xl font-black text-primary">{codeSubmissionStats.total}</div>
                                        <div className="text-xs text-muted">Submitted</div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center mb-2 pt-3 border-t border-border/60">
                                    <span className="font-medium text-xs uppercase tracking-wider text-muted">Integrity & Strikes</span>
                                    {terminatedCount > 0 ? (
                                        <span className="text-xs bg-rose-500/15 text-rose-600 dark:text-rose-400 font-black px-2 py-0.5 rounded-full animate-pulse">
                                            {terminatedCount} Terminated
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                                            All In Bounds
                                        </span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewMode('violations');
                                            fetchViolationsData();
                                        }}
                                        className={cn(
                                            "p-3 rounded-xl border text-center transition-all cursor-pointer",
                                            terminatedCount > 0 
                                                ? "bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                                : "bg-surface border-border hover:border-border/80 text-text"
                                        )}
                                    >
                                        <div className="text-2xl font-black">{terminatedCount}</div>
                                        <div className="text-xs text-muted">Terminated (3/3)</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewMode('violations');
                                            fetchViolationsData();
                                        }}
                                        className={cn(
                                            "p-3 rounded-xl border text-center transition-all cursor-pointer",
                                            warningsCount > 0 
                                                ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                : "bg-surface border-border hover:border-border/80 text-text"
                                        )}
                                    >
                                        <div className="text-2xl font-black">{warningsCount}</div>
                                        <div className="text-xs text-muted">Warnings (1-2/3)</div>
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-neutral-200 dark:border-neutral-800 flex-1">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-text text-sm">Question Queue</h3>
                                <span className="text-[11px] font-semibold text-muted bg-surface-highlight px-2 py-0.5 rounded-full border border-border">
                                    {quiz.questions.length} Questions
                                </span>
                            </div>
                            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                                {quiz.questions.map((q, idx) => {
                                    const cleanTitle = (q.stem || '')
                                        .replace(/^#+\s*/, '')
                                        .split('\n')[0]
                                        .replace(/\*\*/g, '')
                                        .trim();

                                    return (
                                        <div
                                            key={q.id || idx}
                                            onClick={() => {
                                                setCurrentQuestionIndex(idx);
                                                setViewMode('voting');
                                                updateQuizState(idx, 'voting');
                                            }}
                                            className={cn(
                                                "p-3 rounded-xl cursor-pointer transition-all text-xs flex items-center gap-3 border",
                                                currentQuestionIndex === idx
                                                    ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                                                    : "border-border hover:bg-surface text-muted hover:text-text"
                                            )}
                                        >
                                            <span className={cn(
                                                "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                                                currentQuestionIndex === idx ? "bg-primary text-white" : "bg-neutral-100 dark:bg-neutral-800 text-muted"
                                            )}>
                                                {idx + 1}
                                            </span>
                                            <span className="truncate flex-1 font-semibold text-xs text-text" title={cleanTitle}>
                                                {cleanTitle || `Question ${idx + 1}`}
                                            </span>
                                            {currentQuestionIndex > idx && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* View Student Code Modal */}
            {viewingStudentCode && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col animate-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-2">
                                <Code2 className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-base text-text">Code by {viewingStudentCode.name}</h3>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setViewingStudentCode(null)}
                                className="h-8 w-8 p-0 rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <CodeEditor
                                value={viewingStudentCode.code || '# No code submitted'}
                                onChange={() => {}}
                                readOnly={true}
                                disabled={true}
                                fileName="solution.py"
                                breadcrumbs={['submissions', viewingStudentCode.name.toLowerCase().replace(/\s+/g, '-'), 'solution.py']}
                                showReset={false}
                                minHeight="280px"
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button onClick={() => setViewingStudentCode(null)} size="sm">
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
