import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import FullScreenLoader from '../../shared/components/FullScreenLoader';
import { useAuth } from '../../shared/context/AuthContext';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { cn } from '../../lib/utils';
import { useTheme } from '../../shared/context/ThemeContext';
import { MathText } from '../../shared/components/MathText';
import {
    User, Clock, CheckCircle, Loader2, WifiOff, Play, RotateCcw,
    Code2, CheckCircle2, X, Award, Flame, Users, Trophy, ChevronRight, Zap
} from 'lucide-react';
import { runTestCases, ExecutionResponse } from '../../shared/utils/codeExecution';

const formatSeconds = (totalSec: number) => {
    if (!totalSec || isNaN(totalSec) || totalSec < 0) return '00:00';
    const mins = Math.floor(totalSec / 60);
    const secs = Math.floor(totalSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function StudentLiveQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isLoading: authLoading, refreshUser, signInAnonymously } = useAuth();
    const { theme } = useTheme();

    // Core Quiz State
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [status, setStatus] = useState<'waiting' | 'active' | 'completed'>('waiting');
    const [viewMode, setViewMode] = useState<'voting' | 'results' | 'leaderboard'>('voting');
    const [startupCountdown, setStartupCountdown] = useState(0);
    const [participants, setParticipants] = useState<any[]>([]);
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [quizTitle, setQuizTitle] = useState('');

    // Code Question State (Live ML / Python Code challenges)
    const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
    const [codeExecutionResult, setCodeExecutionResult] = useState<Record<string, ExecutionResponse | null>>({});
    const [codePassedStatus, setCodePassedStatus] = useState<Record<string, boolean>>({});
    const [isExecutingCode, setIsExecutingCode] = useState(false);

    // Host-directed timing: elapsed stopwatch
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const questionStartTimeRef = useRef<number>(Date.now());

    // Name prompt state (for guest quick join)
    const [nameInput, setNameInput] = useState('');
    const [regNoInput, setRegNoInput] = useState('');
    const [nameSaving, setNameSaving] = useState(false);
    const [nameError, setNameError] = useState('');

    // Realtime Status
    const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Network Status Listener
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Elapsed timer for student visibility (controlled by host phase)
    useEffect(() => {
        if (viewMode !== 'voting' || currentQuestionIndex < 0) return;
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [viewMode, currentQuestionIndex]);

    const fetchParticipants = async () => {
        if (!id) return;
        const { data: attemptsData } = await supabase
            .from('attempts')
            .select('student_id')
            .eq('quiz_id', id)
            .eq('status', 'in-progress');

        if (!attemptsData || attemptsData.length === 0) {
            setParticipants([]);
            return;
        }

        const studentIds = attemptsData.map(a => a.student_id);
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, registration_number, avatar_url')
            .in('id', studentIds);

        if (profilesData) {
            const mapped = profilesData.map((profile: any) => ({
                id: profile.id,
                name: profile.full_name || 'Unknown Student',
                regNo: profile.registration_number,
                avatarText: (profile.full_name || 'U').substring(0, 2).toUpperCase(),
                avatarUrl: profile.avatar_url
            }));
            mapped.sort((a, b) => a.name.localeCompare(b.name));
            setParticipants(mapped);
        }
    };

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

            if (quizData) {
                setQuizTitle(quizData.title);
            }

            // Update Local State based on host settings
            if (quizData.settings) {
                if (typeof quizData.settings.currentQuestionIndex === 'number') {
                    setCurrentQuestionIndex((prev) => {
                        if (prev !== quizData.settings.currentQuestionIndex) {
                            setStartupCountdown(3);
                            setSelectedOption(null);
                            setIsSubmitted(false);
                            setElapsedTime(0);
                            questionStartTimeRef.current = Date.now();
                            return quizData.settings.currentQuestionIndex;
                        }
                        return prev;
                    });
                }
                if (quizData.settings.viewMode) {
                    setViewMode(quizData.settings.viewMode);
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

                const mappedQuestions = questionsData?.map((q: any) => {
                    const isCode = q.type === 'code';
                    let parsedCorrect = q.correct_answer;
                    if (isCode) {
                        try {
                            parsedCorrect = typeof q.correct_answer === 'string' ? JSON.parse(q.correct_answer) : q.correct_answer;
                        } catch {
                            parsedCorrect = q.correct_answer;
                        }
                    }
                    return {
                        id: q.id,
                        type: q.type || 'mcq',
                        stem: q.text,
                        options: Array.isArray(q.choices) ? q.choices.map((c: any) => typeof c === 'object' ? c.text : c) : (q.choices || []),
                        correct: parsedCorrect,
                    };
                }) || [];
                setQuestions(mappedQuestions);
            }

            // Initialize Attempt if needed (only once)
            const { data: existingAttempt } = await supabase
                .from('attempts')
                .select('*')
                .eq('quiz_id', id)
                .eq('student_id', user.id)
                .maybeSingle();

            if (!existingAttempt) {
                await supabase.from('attempts').insert({
                    quiz_id: id,
                    student_id: user.id,
                    status: 'in-progress',
                    started_at: new Date().toISOString(),
                    flags: []
                });
            } else if (existingAttempt) {
                // Restore saved answer for current question
                const currentQIndex = quizData.settings?.currentQuestionIndex ?? 0;
                let qIds: any[] = questions;

                if (questions.length === 0) {
                    const { data: qData } = await supabase
                        .from('questions')
                        .select('id')
                        .eq('quiz_id', id)
                        .order('created_at', { ascending: true });
                    if (qData) qIds = qData;
                }

                if (qIds[currentQIndex]) {
                    const currentQId = qIds[currentQIndex].id;
                    const savedAnswers = existingAttempt.answers || {};
                    const savedRecord = savedAnswers[currentQId];

                    if (savedRecord !== undefined && savedRecord !== null) {
                        if (typeof savedRecord === 'object' && savedRecord?.type === 'code') {
                            if (savedRecord.code) {
                                setCodeAnswers(prev => ({ ...prev, [currentQId]: savedRecord.code }));
                            }
                            if (savedRecord.passed !== undefined) {
                                setCodePassedStatus(prev => ({ ...prev, [currentQId]: Boolean(savedRecord.passed) }));
                            }
                            setIsSubmitted(true);
                        } else {
                            const savedOption = typeof savedRecord === 'object' ? savedRecord.option : savedRecord;
                            if (typeof savedOption === 'number') {
                                setSelectedOption(prev => prev === null ? savedOption : prev);
                                setIsSubmitted(true);
                            }
                        }
                    }
                }
            }

            setLoading(false);
            fetchParticipants();
        } catch (err) {
            console.error("Failed to sync session:", err);
        }
    };

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }
        if (!id) return;

        fetchQuizState();

        // Polling Fallback (every 2.5 seconds)
        const pollInterval = setInterval(() => {
            fetchQuizState();
            fetchParticipants();
        }, 2500);

        // Realtime Subscription
        let channel: any = null;
        try {
            if (typeof WebSocket !== 'undefined') {
                channel = supabase
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
                            const newSettings = payload.new.settings;
                            const newStatus = payload.new.status;

                            if (newStatus === 'completed') {
                                setStatus('completed');
                            }

                            if (newSettings) {
                                if (typeof newSettings.currentQuestionIndex === 'number') {
                                    setCurrentQuestionIndex((prev) => {
                                        if (prev !== newSettings.currentQuestionIndex) {
                                            setStartupCountdown(3);
                                            setSelectedOption(null);
                                            setIsSubmitted(false);
                                            setElapsedTime(0);
                                            questionStartTimeRef.current = Date.now();
                                            return newSettings.currentQuestionIndex;
                                        }
                                        return prev;
                                    });
                                }
                                if (newSettings.viewMode) {
                                    setViewMode(newSettings.viewMode);
                                }
                            }
                        }
                    )
                    .subscribe((status) => {
                        if (status === 'SUBSCRIBED') setRealtimeStatus('connected');
                        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtimeStatus('disconnected');
                    });
            } else {
                setRealtimeStatus('disconnected');
            }
        } catch (err) {
            console.error("Failed to establish Realtime connection:", err);
            setRealtimeStatus('disconnected');
        }

        return () => {
            if (channel) supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, [id, user, authLoading]);

    // Leaderboard Fetcher (Ordered strictly by score which incorporates test cases passed + timing)
    useEffect(() => {
        if (viewMode === 'leaderboard' || status === 'completed') {
            const fetchLeaderboard = async () => {
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
                if (allStudentIds.length === 0) return;

                const { data: profilesData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url, registration_number')
                    .in('id', allStudentIds);

                const profileMap: Record<string, any> = {};
                (profilesData || []).forEach((p: any) => { profileMap[p.id] = p; });

                const currentQ = questions[currentQuestionIndex];

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
                            name: profile?.full_name || 'Anonymous Student',
                            avatarUrl: profile?.avatar_url || null,
                            regNo: profile?.registration_number || null,
                            testCasesInfo,
                            timeTakenInfo,
                        };
                    })
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 15);

                setLeaderboardData(enriched);
            };

            fetchLeaderboard();
            const polling = setInterval(fetchLeaderboard, 2000);
            return () => clearInterval(polling);
        }
    }, [viewMode, status, id, currentQuestionIndex, questions]);

    // Countdown Interval
    useEffect(() => {
        if (startupCountdown > 0) {
            const timer = setTimeout(() => setStartupCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [startupCountdown]);

    const handleRunLiveCode = async () => {
        const q = questions[currentQuestionIndex];
        if (!q || q.type !== 'code' || isExecutingCode) return;

        const qId = q.id;
        const currentCode = codeAnswers[qId] ?? q.correct?.starterCode ?? '';
        const driverCode = q.correct?.driverCode || '';
        const testCases = q.correct?.testCases || [];

        setIsExecutingCode(true);
        try {
            const res = await runTestCases({
                language: 'python',
                studentCode: currentCode,
                driverCode,
                testCases,
            });
            setCodeExecutionResult(prev => ({ ...prev, [qId]: res }));
            setCodePassedStatus(prev => ({ ...prev, [qId]: res.allPassed }));

            // Real-time sync of test progress to attempts so Host Live Analysis sees live updates
            if (user && id) {
                try {
                    const totalTestCases = testCases.length;
                    const passedCount = res.results?.filter((r: any) => r.passed).length || 0;
                    const totalCases = totalTestCases > 0 ? totalTestCases : 1;
                    const isFullyPassed = res.allPassed;
                    const secondsTaken = Math.max(1, elapsedTime || 1);
                    const casePoints = Math.round((passedCount / totalCases) * 1000);
                    const speedBonus = passedCount > 0 ? Math.max(0, Math.round(500 * Math.max(0, 1 - (secondsTaken / 300)))) : 0;
                    const pointsForThisQ = casePoints + speedBonus;

                    const { data: curAttempt } = await supabase
                        .from('attempts')
                        .select('answers')
                        .eq('quiz_id', id)
                        .eq('student_id', user.id)
                        .maybeSingle();

                    let currentAnswers = curAttempt?.answers || {};
                    if (typeof currentAnswers === 'string') {
                        try { currentAnswers = JSON.parse(currentAnswers); } catch {}
                    }

                    const newAnswers = {
                        ...currentAnswers,
                        [qId]: {
                            type: 'code',
                            code: currentCode,
                            passed: isFullyPassed,
                            passedCount,
                            totalCount: totalCases,
                            timeTaken: secondsTaken,
                            points: pointsForThisQ
                        }
                    };

                    let cumulativeScore = 0;
                    let totalPassed = 0;
                    questions.forEach((qu) => {
                        const ans = newAnswers[qu.id];
                        if (ans && typeof ans === 'object') {
                            cumulativeScore += (ans.points || 0);
                            if (ans.passed) totalPassed++;
                        } else if (ans !== undefined && ans !== null) {
                            cumulativeScore += 1000;
                            totalPassed++;
                        }
                    });

                    if (curAttempt) {
                        await supabase
                            .from('attempts')
                            .update({
                                answers: newAnswers,
                                score: cumulativeScore
                            })
                            .eq('quiz_id', id)
                            .eq('student_id', user.id);
                    } else {
                        await supabase
                            .from('attempts')
                            .insert({
                                quiz_id: id,
                                student_id: user.id,
                                status: 'in-progress',
                                started_at: new Date().toISOString(),
                                answers: newAnswers,
                                score: cumulativeScore,
                                flags: []
                            });
                    }
                } catch (syncErr) {
                    console.warn("Live test progress sync warning:", syncErr);
                }
            }
        } catch (err: any) {
            console.error("Execution error in live quiz:", err);
            setCodeExecutionResult(prev => ({
                ...prev,
                [qId]: {
                    allPassed: false,
                    combinedStdout: '',
                    combinedStderr: err.message || 'Failed to execute code.',
                    results: [],
                }
            }));
            setCodePassedStatus(prev => ({ ...prev, [qId]: false }));
        } finally {
            setIsExecutingCode(false);
        }
    };

    const handleSubmitAnswer = async () => {
        const currentQ = questions[currentQuestionIndex];
        if (!currentQ || !user || !id) return;

        const isCodeQ = currentQ.type === 'code';
        if (!isCodeQ && selectedOption === null) return;

        setIsSubmitted(true);

        try {
            const questionId = currentQ.id;
            const currentCode = codeAnswers[questionId] ?? currentQ.correct?.starterCode ?? '';
            let execResult = codeExecutionResult[questionId];

            // If code question and not executed yet, run test cases now before saving
            if (isCodeQ && !execResult) {
                setIsExecutingCode(true);
                try {
                    execResult = await runTestCases({
                        language: 'python',
                        studentCode: currentCode,
                        driverCode: currentQ.correct?.driverCode || '',
                        testCases: currentQ.correct?.testCases || []
                    });
                    setCodeExecutionResult(prev => ({ ...prev, [questionId]: execResult }));
                    setCodePassedStatus(prev => ({ ...prev, [questionId]: execResult.allPassed }));
                } catch (runErr) {
                    console.error("Auto run error:", runErr);
                } finally {
                    setIsExecutingCode(false);
                }
            }

            // Calculate score based on Test Cases Passed AND Timing
            const totalTestCases = (currentQ.correct?.testCases || []).length;
            const passedCount = execResult?.results?.filter((r: any) => r.passed).length || 0;
            const totalCases = totalTestCases > 0 ? totalTestCases : 1;
            const secondsTaken = Math.max(1, elapsedTime || 1);

            let pointsForThisQ = 0;
            let isFullyPassed = false;

            if (isCodeQ) {
                isFullyPassed = passedCount === totalCases && totalCases > 0;
                // Proportional score for test cases passed:
                const casePoints = Math.round((passedCount / totalCases) * 1000);
                // Speed bonus up to 500 points decaying over 5 minutes (300s):
                const speedBonus = passedCount > 0 ? Math.max(0, Math.round(500 * Math.max(0, 1 - (secondsTaken / 300)))) : 0;
                pointsForThisQ = casePoints + speedBonus;
            } else {
                const isCorrect = (
                    currentQ.correct === currentQ.options?.[selectedOption!] ||
                    String(currentQ.correct) === String(selectedOption) ||
                    currentQ.correct === selectedOption
                );
                isFullyPassed = isCorrect;
                const speedBonus = isCorrect ? Math.max(0, Math.round(500 * Math.max(0, 1 - (secondsTaken / 60)))) : 0;
                pointsForThisQ = isCorrect ? (1000 + speedBonus) : 0;
            }

            // 1. Fetch current attempt to get existing answers
            const { data: attempt } = await supabase
                .from('attempts')
                .select('answers, score')
                .eq('quiz_id', id)
                .eq('student_id', user.id)
                .maybeSingle();

            const currentAnswers = attempt?.answers || {};
            const answerPayload = isCodeQ ? {
                type: 'code',
                code: currentCode,
                passed: isFullyPassed,
                passedCount,
                totalCount: totalCases,
                timeTaken: secondsTaken,
                points: pointsForThisQ
            } : {
                option: selectedOption,
                passed: isFullyPassed,
                timeTaken: secondsTaken,
                points: pointsForThisQ
            };

            const newAnswers = {
                ...currentAnswers,
                [questionId]: answerPayload
            };

            // 2. Sum cumulative points across all answered questions
            let cumulativeScore = 0;
            let totalPassed = 0;

            questions.forEach((q) => {
                const ans = newAnswers[q.id];
                if (ans && typeof ans === 'object') {
                    cumulativeScore += (ans.points || 0);
                    if (ans.passed) totalPassed++;
                } else if (ans !== undefined && ans !== null) {
                    cumulativeScore += 1000;
                    totalPassed++;
                }
            });

            const percentage = questions.length > 0 ? Math.round((totalPassed / questions.length) * 100) : 0;

            // 3. Update or insert 'attempts'
            if (attempt) {
                const { error: updateErr } = await supabase
                    .from('attempts')
                    .update({
                        answers: newAnswers,
                        score: cumulativeScore
                    })
                    .eq('quiz_id', id)
                    .eq('student_id', user.id);
                if (updateErr) console.error("Error updating attempt:", updateErr);
            } else {
                const { error: insertErr } = await supabase
                    .from('attempts')
                    .insert({
                        quiz_id: id,
                        student_id: user.id,
                        status: 'in-progress',
                        started_at: new Date().toISOString(),
                        answers: newAnswers,
                        score: cumulativeScore,
                        flags: []
                    });
                if (insertErr) console.error("Error inserting attempt:", insertErr);
            }

            // 4. Update 'quiz_results'
            const { data: existingQR } = await supabase
                .from('quiz_results')
                .select('id')
                .eq('quiz_id', id)
                .eq('student_id', user.id)
                .maybeSingle();

            if (existingQR) {
                await supabase.from('quiz_results').update({
                    score: cumulativeScore,
                    total_questions: questions.length,
                    percentage: percentage
                }).eq('id', existingQR.id);
            } else {
                await supabase.from('quiz_results').insert({
                    quiz_id: id,
                    student_id: user.id,
                    score: cumulativeScore,
                    total_questions: questions.length,
                    percentage: percentage,
                    created_at: new Date().toISOString()
                });
            }
        } catch (err) {
            console.error("Failed to submit answer:", err);
        }
    };

    if (loading || authLoading) return <FullScreenLoader />;

    // --- QUICK JOIN / NAME PROMPT GATE (Clean modern design) ---
    if (!user || !user.full_name || !user.registration_number) {
        const handleQuickJoin = async () => {
            const name = nameInput.trim();
            const regNo = regNoInput.trim();

            if (!name) { setNameError('Please enter your full name.'); return; }
            if (!regNo) { setNameError('Please enter your registration number.'); return; }

            setNameSaving(true);
            setNameError('');

            try {
                let currentUser = user;
                if (!currentUser) {
                    const { user: newUser, error } = await signInAnonymously();
                    if (error) throw error;
                    currentUser = newUser;
                }

                if (currentUser) {
                    const { error: upsertError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: currentUser.id,
                            full_name: name,
                            registration_number: regNo,
                            role: 'student',
                            updated_at: new Date().toISOString()
                        });

                    if (upsertError) throw upsertError;
                    await refreshUser();
                }
            } catch (err: any) {
                console.error('Failed to join quiz:', err);
                setNameError(err.message || 'Failed to join. Please try again.');
            } finally {
                setNameSaving(false);
            }
        };

        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-text font-sans">
                <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl border border-border space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                        <User className="w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">Join Live Assessment</h1>
                        <p className="text-sm text-muted">Enter your name and registration number to enter the live session.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Full Name</label>
                            <input
                                type="text"
                                value={nameInput}
                                onChange={e => { setNameInput(e.target.value); setNameError(''); }}
                                placeholder="e.g. Alex Johnson"
                                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-medium text-sm transition-all"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted uppercase tracking-wider">Registration Number</label>
                            <input
                                type="text"
                                value={regNoInput}
                                onChange={e => { setRegNoInput(e.target.value); setNameError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleQuickJoin()}
                                placeholder="e.g. 21CS101"
                                className="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono text-sm transition-all"
                            />
                        </div>

                        {nameError && <p className="text-rose-500 text-xs text-center font-medium">{nameError}</p>}

                        <Button
                            onClick={handleQuickJoin}
                            disabled={nameSaving}
                            className="w-full py-3 h-12 rounded-xl text-base font-bold shadow-lg"
                        >
                            {nameSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enter Live Session →'}
                        </Button>

                        {!user && (
                            <div className="text-center pt-2">
                                <p className="text-muted text-xs">Have an account? <button onClick={() => navigate('/login')} className="text-primary font-bold hover:underline">Log in</button></p>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    // --- COMPLETED SESSION SCREEN ---
    if (status === 'completed') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
                <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border border-border">
                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Session Completed</h1>
                        <p className="text-muted mt-1 text-sm">The instructor has concluded this live assessment session.</p>
                    </div>

                    {leaderboardData.length > 0 && (
                        <div className="p-4 rounded-xl bg-surface border border-border text-left space-y-3">
                            <p className="text-xs font-bold text-muted uppercase tracking-wider">Top Scorers</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {leaderboardData.slice(0, 5).map((d, i) => (
                                    <div key={d.student_id} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs w-4 text-muted">#{i + 1}</span>
                                            <span className="font-medium text-text">{d.name}</span>
                                        </div>
                                        <span className="font-bold text-primary">{d.score} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button onClick={() => navigate('/student/dashboard')} className="w-full h-11 text-base font-bold">
                        Return to Dashboard
                    </Button>
                </Card>
            </div>
        );
    }

    const currentQuestion = questions[currentQuestionIndex];

    // --- LIVE LOBBY / WAITING ROOM ---
    if (!currentQuestion || currentQuestionIndex < 0) {
        return (
            <div className="min-h-screen bg-background text-text flex flex-col">
                <header className="px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-md flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={theme === 'dark' ? "/logo-light.png" : "/logo-dark.png"} alt="Logo" className="h-7 w-auto object-contain rounded-md" />
                        <span className="text-sm font-bold tracking-tight">Live Test Room</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-border text-xs">
                        <div className={cn("w-2 h-2 rounded-full", realtimeStatus === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                        <span className="font-medium text-muted">{realtimeStatus === 'connected' ? 'Connected' : 'Connecting...'}</span>
                    </div>
                </header>

                <main className="flex-1 container mx-auto max-w-2xl p-6 flex flex-col justify-center items-center">
                    <Card className="w-full p-8 md:p-10 text-center space-y-6 shadow-xl border border-border">
                        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
                            </span>
                            <Clock className="w-10 h-10 animate-pulse" />
                        </div>

                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Connected to Live Lobby
                            </span>
                            <h1 className="text-3xl font-extrabold text-text tracking-tight">
                                {quizTitle || 'Live Assessment'}
                            </h1>
                            <p className="text-muted text-sm max-w-md mx-auto leading-relaxed">
                                You are in the live room. Waiting for your instructor to start the challenge. Questions will appear automatically on your screen.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-surface border border-border flex items-center justify-between text-left">
                            <div>
                                <p className="text-xs text-muted uppercase font-bold tracking-wider">Candidate</p>
                                <p className="text-base font-bold text-text">{user.full_name || user.email}</p>
                                {user.registration_number && (
                                    <p className="text-xs font-mono text-muted">{user.registration_number}</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted uppercase font-bold tracking-wider">Connected</p>
                                <p className="text-2xl font-black text-primary">{participants.length} Students</p>
                            </div>
                        </div>

                        {participants.length > 0 && (
                            <div className="space-y-2 pt-2 text-left">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5" /> Joined Participants ({participants.length})
                                    </p>
                                    <span className="text-xs text-emerald-500 font-medium">Ready</span>
                                </div>
                                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                                    {participants.map(p => (
                                        <span key={p.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-text shadow-sm">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            {p.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                </main>
            </div>
        );
    }

    // Brief 3-2-1 transition animation between questions
    if (startupCountdown > 0) {
        return (
            <div className="min-h-screen bg-background text-text flex flex-col items-center justify-center relative overflow-hidden font-sans">
                <div className="relative z-10 flex flex-col items-center animate-in zoom-in duration-300">
                    <span className="text-xs uppercase font-extrabold tracking-widest px-4 py-1.5 rounded-full bg-primary/10 text-primary mb-6">
                        Question {(currentQuestionIndex ?? 0) + 1}
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-text">Get Ready!</h2>
                    <div
                        key={startupCountdown}
                        className="text-8xl md:text-9xl font-black text-primary animate-in zoom-in-50 duration-400 drop-shadow-sm font-mono"
                    >
                        {startupCountdown}
                    </div>
                </div>
            </div>
        );
    }

    // --- LEADERBOARD PHASE ---
    if (viewMode === 'leaderboard') {
        const myIndex = leaderboardData.findIndex(d => d.student_id === user?.id);
        const myRank = myIndex >= 0 ? myIndex + 1 : '-';
        const myScore = leaderboardData.find(d => d.student_id === user?.id)?.score || 0;

        return (
            <div className="min-h-screen bg-background text-text font-sans flex flex-col">
                <header className="px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-amber-500" />
                        <div>
                            <h1 className="text-lg font-bold">Live Standings</h1>
                            <p className="text-xs text-muted">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        </div>
                    </div>
                    <div className="text-xs text-muted font-medium bg-surface px-3 py-1.5 rounded-full border border-border animate-pulse flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        Instructor controlling next step...
                    </div>
                </header>

                <main className="flex-1 container mx-auto max-w-3xl p-6 flex flex-col">
                    <div className="w-full flex-1 overflow-y-auto space-y-3 pb-28 animate-in slide-in-from-bottom-6 duration-300">
                        {leaderboardData.map((d, i) => {
                            const isMe = d.student_id === user?.id;
                            return (
                                <div
                                    key={d.student_id}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-xl border transition-all shadow-sm",
                                        isMe
                                            ? "border-amber-500 bg-amber-500/10 dark:bg-amber-500/20 ring-2 ring-amber-500/30"
                                            : "border-border bg-surface hover:bg-surface/80"
                                    )}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <span className={cn(
                                            "text-xl font-black w-8 text-center shrink-0",
                                            i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted"
                                        )}>
                                            {i + 1}
                                        </span>
                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                            {d.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-base text-text truncate">{d.name}</span>
                                            <div className="flex items-center gap-2 text-xs text-muted">
                                                {d.regNo && <span className="font-mono">{d.regNo}</span>}
                                                {d.testCasesInfo && (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                                                        ✓ {d.testCasesInfo}
                                                    </span>
                                                )}
                                                {d.timeTakenInfo && (
                                                    <span className="font-mono text-muted">⏱ {d.timeTakenInfo}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className={cn("text-xl font-black", isMe ? "text-amber-500" : "text-primary")}>
                                            {d.score}
                                        </span>
                                        <span className="text-xs text-muted block font-medium">pts</span>
                                    </div>
                                </div>
                            );
                        })}
                        {leaderboardData.length === 0 && (
                            <div className="text-center py-12 text-muted">Calculating live standings...</div>
                        )}
                    </div>

                    {/* Bottom Floating My Rank Card */}
                    <div className="fixed bottom-6 inset-x-0 px-6 flex justify-center pointer-events-none z-30">
                        <div className="bg-surface/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl w-full max-w-md p-4 flex justify-between items-center pointer-events-auto">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-lg">
                                    #{myRank}
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase font-bold tracking-wider">Your Position</p>
                                    <p className="text-sm font-bold text-text truncate max-w-[160px]">{user.full_name || 'You'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-muted uppercase font-bold tracking-wider">Total Score</p>
                                <p className="text-xl font-black text-amber-500">{myScore} pts</p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    // --- ACTIVE QUESTION PHASE ---
    const isLocked = isSubmitted || viewMode === 'results';

    return (
        <div className="min-h-screen font-sans flex flex-col bg-background text-text relative">
            {/* Offline Alert */}
            {isOffline && (
                <div className="fixed inset-0 z-[110] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                    <WifiOff className="w-20 h-20 text-amber-500 mb-4 animate-pulse" />
                    <h2 className="text-3xl font-extrabold text-text mb-2">Connection Lost</h2>
                    <p className="text-muted max-w-md">Your progress is preserved locally. The assessment will resume once internet is restored.</p>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between bg-surface/80 backdrop-blur-md border-b border-border">
                <div className="flex items-center gap-4">
                    <img src={theme === 'dark' ? "/logo-light.png" : "/logo-dark.png"} alt="Logo" className="h-7 w-auto object-contain rounded-md" />
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface rounded-full border border-border">
                        <div className={cn("w-2 h-2 rounded-full", realtimeStatus === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                        <span className="text-xs font-semibold text-muted hidden sm:inline">
                            {realtimeStatus === 'connected' ? 'Live Session' : 'Syncing...'}
                        </span>
                    </div>
                </div>

                {/* Live Host-Directed Elapsed Stopwatch */}
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-mono font-bold text-sm">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>{formatSeconds(elapsedTime)}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={fetchQuizState} title="Refresh sync">
                        <RotateCcw className="w-4 h-4 text-muted" />
                    </Button>
                </div>
            </header>

            {/* Main Question Workspace */}
            <main className="flex-1 container mx-auto max-w-4xl p-6 flex flex-col justify-center relative z-10">
                <Card className="rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl border border-border bg-surface">
                    {/* Meta Bar */}
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary">
                            Question {currentQuestionIndex + 1} of {questions.length}
                        </span>

                        {viewMode === 'results' ? (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                Results Mode
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-muted flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Host active
                            </span>
                        )}
                    </div>

                    {/* Question Stem */}
                    <MathText text={currentQuestion.stem} className="text-xl md:text-2xl font-bold leading-relaxed text-text" as="h2" />

                    {/* Code Question UI or MCQ Options */}
                    {currentQuestion.type === 'code' ? (
                        <div className="space-y-4">
                            {/* Python ML Challenge Banner */}
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-primary">
                                <div className="flex items-center gap-2 font-bold text-sm">
                                    <Code2 className="w-5 h-5 text-primary" />
                                    <span>Python 3 (ML / Scripting) Challenge</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const starter = (currentQuestion.correct as any)?.starterCode || '';
                                        setCodeAnswers(prev => ({ ...prev, [currentQuestion.id]: starter }));
                                    }}
                                    disabled={isLocked}
                                    className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg bg-surface hover:bg-surface/80 border border-border text-muted hover:text-text font-medium transition-colors disabled:opacity-50"
                                    title="Reset to starter code"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reset
                                </button>
                            </div>

                            {/* Code Editor */}
                            <div className="relative rounded-xl overflow-hidden border-2 border-neutral-700 focus-within:border-primary shadow-inner bg-[#1e1e1e]">
                                <textarea
                                    value={codeAnswers[currentQuestion.id] ?? (currentQuestion.correct as any)?.starterCode ?? ''}
                                    disabled={isLocked}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setCodeAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Tab') {
                                            e.preventDefault();
                                            const start = e.currentTarget.selectionStart;
                                            const end = e.currentTarget.selectionEnd;
                                            const current = e.currentTarget.value;
                                            const updated = current.substring(0, start) + '    ' + current.substring(end);
                                            setCodeAnswers(prev => ({ ...prev, [currentQuestion.id]: updated }));
                                            setTimeout(() => {
                                                if (e.currentTarget) {
                                                    e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
                                                }
                                            }, 0);
                                        }
                                    }}
                                    spellCheck={false}
                                    rows={10}
                                    placeholder="# Write your Python 3 ML code here..."
                                    className="w-full bg-transparent text-emerald-300 font-mono text-sm p-4 outline-none resize-y leading-relaxed"
                                />
                            </div>

                            {/* Run Code & Verification Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                                <div className="flex items-center gap-2">
                                    {codePassedStatus[currentQuestion.id] ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in fade-in">
                                            <CheckCircle2 className="w-4 h-4" /> All Test Cases Passed!
                                        </div>
                                    ) : codeExecutionResult[currentQuestion.id] && !codePassedStatus[currentQuestion.id] ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-in fade-in">
                                            <X className="w-4 h-4" /> Some Test Cases Failed. Check console below.
                                        </div>
                                    ) : (
                                        <span className="text-xs text-muted">
                                            Test cases: {((currentQuestion.correct as any)?.testCases || []).length} case(s) defined
                                        </span>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    onClick={handleRunLiveCode}
                                    disabled={isExecutingCode || isLocked}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-10 px-5 shadow-md flex items-center gap-2"
                                >
                                    {isExecutingCode ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Running Python...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="w-4 h-4 fill-current" /> Run & Test Code
                                        </>
                                    )}
                                </Button>
                            </div>

                            {/* Execution Output Console */}
                            {codeExecutionResult[currentQuestion.id] && (
                                <div className="rounded-xl p-4 bg-neutral-900 border border-neutral-800 text-xs font-mono space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                                        <span className="text-neutral-400 flex items-center gap-1.5">
                                            <Code2 className="w-3.5 h-3.5" /> Output Console
                                        </span>
                                        {codePassedStatus[currentQuestion.id] ? (
                                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> PASSED ALL
                                            </span>
                                        ) : (
                                            <span className="text-rose-400 font-bold flex items-center gap-1">
                                                <X className="w-3.5 h-3.5" /> FAILED
                                            </span>
                                        )}
                                    </div>

                                    {codeExecutionResult[currentQuestion.id]?.combinedStderr && (
                                        <div className="text-rose-300 bg-rose-950/40 p-3 rounded-lg border border-rose-900/50 whitespace-pre-wrap">
                                            {codeExecutionResult[currentQuestion.id]?.combinedStderr}
                                        </div>
                                    )}

                                    {codeExecutionResult[currentQuestion.id]?.results && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {codeExecutionResult[currentQuestion.id]!.results.map(tc => (
                                                <div
                                                    key={tc.index}
                                                    className={cn(
                                                        "p-3 rounded-lg border flex flex-col gap-1",
                                                        tc.passed
                                                            ? "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                                                            : "bg-rose-950/20 border-rose-900/40 text-rose-300"
                                                    )}
                                                >
                                                    <div className="flex justify-between font-bold text-[11px]">
                                                        <span>Test Case {tc.index}</span>
                                                        <span>{tc.passed ? '✓ PASSED' : '✗ FAILED'}</span>
                                                    </div>
                                                    <div className="text-[11px] text-neutral-300 font-mono space-y-0.5">
                                                        <div><span className="text-neutral-500">Input:</span> {tc.input || '(empty)'}</div>
                                                        <div><span className="text-neutral-500">Expected:</span> {tc.expected}</div>
                                                        <div><span className="text-neutral-500">Output:</span> {tc.actual}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Standard MCQ Options */
                        <div className="flex flex-col gap-3">
                            {currentQuestion.options?.map((option: string, idx: number) => {
                                const isSelected = selectedOption === idx;
                                const isCorrectCheck = viewMode === 'results' && (
                                    currentQuestion.correct === option ||
                                    String(currentQuestion.correct) === String(idx) ||
                                    currentQuestion.correct === idx
                                );

                                let stateStyles = "border-border hover:bg-surface/80 bg-surface text-text";
                                if (viewMode === 'results') {
                                    if (isCorrectCheck) {
                                        stateStyles = "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
                                    } else if (isSelected && !isCorrectCheck) {
                                        stateStyles = "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300";
                                    } else {
                                        stateStyles = "opacity-40 grayscale";
                                    }
                                } else if (isSelected) {
                                    stateStyles = "border-primary bg-primary/10 shadow-md ring-2 ring-primary/20";
                                }

                                return (
                                    <button
                                        key={idx}
                                        disabled={isLocked}
                                        onClick={() => setSelectedOption(idx)}
                                        className={cn(
                                            "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4",
                                            stateStyles
                                        )}
                                    >
                                        <div className={cn(
                                            "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm transition-colors shrink-0",
                                            isSelected ? "bg-primary text-white" : "bg-neutral-100 dark:bg-neutral-800 text-muted"
                                        )}>
                                            {String.fromCharCode(65 + idx)}
                                        </div>
                                        <MathText text={option} className="font-semibold text-base leading-tight" />
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-4 pt-4 border-t border-border flex justify-end">
                        {viewMode === 'voting' ? (
                            isSubmitted ? (
                                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                                    <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                        <CheckCircle className="w-5 h-5 shrink-0" />
                                        <span>Answer Submitted! Waiting for instructor...</span>
                                    </div>
                                    <Button
                                        onClick={() => setIsSubmitted(false)}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs"
                                    >
                                        Edit / Re-submit
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleSubmitAnswer}
                                    disabled={
                                        currentQuestion.type === 'code'
                                            ? isExecutingCode
                                            : selectedOption === null
                                    }
                                    className="w-full sm:w-auto h-12 text-base px-8 font-bold shadow-lg"
                                >
                                    {currentQuestion.type === 'code'
                                        ? (codePassedStatus[currentQuestion.id] ? "Submit Solution →" : "Run & Submit Code")
                                        : "Submit Answer"}
                                </Button>
                            )
                        ) : (
                            <div className="text-center w-full p-4 bg-surface rounded-xl text-muted text-sm font-medium">
                                Question review in progress. Next challenge starts shortly.
                            </div>
                        )}
                    </div>
                </Card>
            </main>
        </div>
    );
}
