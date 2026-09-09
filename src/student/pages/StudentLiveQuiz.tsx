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
    Code2, CheckCircle2, X, Award, Flame, Users, Trophy, ChevronRight, Zap,
    GripHorizontal, Maximize2, Minus, PanelBottom, Move, Shield, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { runTestCases, ExecutionResponse } from '../../shared/utils/codeExecution';
import { CodeEditor } from '../../shared/components/CodeEditor';
import { useAntiCheat } from '../hooks/useAntiCheat';

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
    const [assignedSet, setAssignedSet] = useState<any | null>(null);

    // Code Question State (Live ML / Python Code challenges)
    const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});
    const [codeExecutionResult, setCodeExecutionResult] = useState<Record<string, ExecutionResponse | null>>({});
    const [codePassedStatus, setCodePassedStatus] = useState<Record<string, boolean>>({});
    const [isExecutingCode, setIsExecutingCode] = useState(false);

    // Host-directed timing: elapsed stopwatch
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const questionStartTimeRef = useRef<number>(Date.now());

    // Moveable & Resizable Output Terminal State
    const [terminalMode, setTerminalMode] = useState<'docked' | 'floating' | 'minimized'>('docked');
    const [terminalHeight, setTerminalHeight] = useState<number>(240);
    const [terminalPos, setTerminalPos] = useState<{ x: number; y: number }>(() => {
        const defaultX = typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 660) : 100;
        const defaultY = typeof window !== 'undefined' ? Math.max(70, window.innerHeight - 380) : 200;
        return { x: defaultX, y: defaultY };
    });

    const isDraggingRef = useRef(false);
    const isResizingHeightRef = useRef(false);
    const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const resizeStartYRef = useRef<number>(0);
    const resizeStartHeightRef = useRef<number>(240);

    // Live Assessment Security & Anti-Cheat Lockdown
    const handleSubmitAnswerRef = useRef<() => void>(() => {});
    const [isTerminated, setIsTerminated] = useState(false);

    const isLiveTestActive = status === 'active' && questions.length > 0 && currentQuestionIndex >= 0 && viewMode !== 'lobby';

    const handleViolation = useCallback(async (count: number, type: string) => {
        if (!id || !user) return;
        try {
            const timeStr = new Date().toLocaleTimeString();
            const isNowTerminated = count >= 3;
            const flagEntry = `[${timeStr}] Q${(currentQuestionIndex ?? 0) + 1}: ${type} (Strike ${count}${isNowTerminated ? ' - Terminated' : ''})`;

            const { data: curAttempt } = await supabase
                .from('attempts')
                .select('flags, status')
                .eq('quiz_id', id)
                .eq('student_id', user.id)
                .maybeSingle();

            const existingFlags = Array.isArray(curAttempt?.flags) ? curAttempt.flags : [];
            const updatedFlags = [...existingFlags, flagEntry];

            await supabase
                .from('attempts')
                .update({ 
                    flags: updatedFlags,
                    status: isNowTerminated ? 'terminated' : (curAttempt?.status || 'in-progress')
                })
                .eq('quiz_id', id)
                .eq('student_id', user.id);

            if (isNowTerminated) {
                setIsTerminated(true);
                handleSubmitAnswerRef.current();
            }
        } catch (err) {
            console.warn("Live test security flag sync warning:", err);
        }
    }, [id, user, currentQuestionIndex]);

    const {
        violations,
        isFullScreen,
        warning,
        enterFullScreen,
        resetViolations,
        remainingStrikes
    } = useAntiCheat({
        enabled: isLiveTestActive && !isTerminated,
        level: 'standard',
        maxViolations: 3,
        onViolation: handleViolation,
        onAutoSubmit: () => {
            handleSubmitAnswerRef.current();
        }
    });

    // Global mouse event listeners for dragging and resizing the output terminal
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDraggingRef.current) {
                const newX = Math.max(10, Math.min(window.innerWidth - 250, e.clientX - dragOffsetRef.current.x));
                const newY = Math.max(60, Math.min(window.innerHeight - 100, e.clientY - dragOffsetRef.current.y));
                setTerminalPos({ x: newX, y: newY });
            } else if (isResizingHeightRef.current) {
                const deltaY = resizeStartYRef.current - e.clientY;
                const newHeight = Math.max(120, Math.min(window.innerHeight * 0.75, resizeStartHeightRef.current + deltaY));
                setTerminalHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            isDraggingRef.current = false;
            isResizingHeightRef.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startDragFloating = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;

        e.preventDefault();
        isDraggingRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - terminalPos.x,
            y: e.clientY - terminalPos.y,
        };
    };

    const startDragFromDocked = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement;
        if (target.closest('button')) return;

        e.preventDefault();
        setTerminalMode('floating');
        const defaultX = Math.max(20, Math.min(window.innerWidth - 660, e.clientX - 250));
        const defaultY = Math.max(70, Math.min(window.innerHeight - 380, e.clientY - 20));
        setTerminalPos({ x: defaultX, y: defaultY });
        isDraggingRef.current = true;
        dragOffsetRef.current = {
            x: e.clientX - defaultX,
            y: e.clientY - defaultY,
        };
    };

    const startResizeHeight = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizingHeightRef.current = true;
        resizeStartYRef.current = e.clientY;
        resizeStartHeightRef.current = terminalHeight;
    };

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

                let mappedQuestions = questionsData?.map((q: any) => {
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

                // Filter by assigned Question Set if enabled
                if (quizData.settings?.setsConfig?.enabled && Array.isArray(quizData.settings.setsConfig.mappings)) {
                    const userEmail = (user.email || '').trim().toLowerCase();
                    const mapping = quizData.settings.setsConfig.mappings.find(
                        (m: any) => m.email?.trim().toLowerCase() === userEmail
                    );
                    if (mapping) {
                        setAssignedSet(mapping);
                        const sliceStart = Math.max(0, mapping.startIndex);
                        const sliceEnd = Math.min(mappedQuestions.length, mapping.endIndex + 1);
                        if (sliceStart < mappedQuestions.length && sliceEnd > sliceStart) {
                            mappedQuestions = mappedQuestions.slice(sliceStart, sliceEnd);
                        }
                    }
                }

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
                // Check if terminated or unlocked by faculty
                if (existingAttempt.status === 'terminated') {
                    setIsTerminated(true);
                } else if (existingAttempt.status === 'in-progress' && isTerminated) {
                    setIsTerminated(false);
                    resetViolations();
                }

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
                    .on(
                        'postgres_changes',
                        {
                            event: 'UPDATE',
                            schema: 'public',
                            table: 'attempts',
                            filter: `quiz_id=eq.${id}`
                        },
                        (payload: any) => {
                            if (payload.new && user && payload.new.student_id === user.id) {
                                if (payload.new.status === 'terminated') {
                                    setIsTerminated(true);
                                } else if (payload.new.status === 'in-progress') {
                                    setIsTerminated(false);
                                    resetViolations();
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
            if (terminalMode === 'minimized') {
                setTerminalMode('docked');
            }

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

    useEffect(() => {
        handleSubmitAnswerRef.current = handleSubmitAnswer;
    });

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

    const activeQIndex = currentQuestionIndex >= 0 ? Math.min(currentQuestionIndex, Math.max(0, questions.length - 1)) : -1;
    const currentQuestion = activeQIndex >= 0 ? questions[activeQIndex] : undefined;

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

                        {/* Live Exam Security Notice Card */}
                        <div className="p-4 rounded-xl bg-surface border border-border text-left space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                    <Shield className="w-4 h-4 text-primary" />
                                    <span>Live Exam Security & Anti-Cheat Enabled</span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                                    Full Lockdown
                                </span>
                            </div>
                            <p className="text-xs text-muted leading-relaxed">
                                Full screen mode is mandatory once the assessment begins. Tab switching, exiting full screen, Google Lens, and AI browser extensions are strictly monitored and will incur penalties.
                            </p>
                            <div className="pt-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => { await enterFullScreen(); }}
                                    className="text-xs h-8 rounded-lg flex items-center gap-1.5 font-semibold"
                                >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                    {isFullScreen ? "Full Screen Active ✓" : "Pre-Enter Full Screen"}
                                </Button>
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
        <div className="h-screen w-screen font-sans flex flex-col bg-background text-text overflow-hidden relative select-none">
            {/* Warning Overlay Banner */}
            {warning && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[130] animate-in slide-in-from-top-4 fade-in duration-300 w-full max-w-lg px-4">
                    <div className="bg-red-600 text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-4 border-2 border-red-400">
                        <div className="p-2 bg-white/20 rounded-full shrink-0 animate-pulse">
                            <AlertTriangle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm md:text-base leading-tight">Exam Security Warning</h3>
                            <p className="text-white/90 text-xs md:text-sm mt-0.5">{warning}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Mandatory Full Screen Lockdown Overlay */}
            {!isFullScreen && isLiveTestActive && !isTerminated && (
                <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in">
                    <div className="bg-surface border-t-4 border-t-red-600 shadow-2xl rounded-2xl p-8 max-w-lg w-full text-center border border-border">
                        <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-6">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black mb-3 text-text">Exam Security Protocol</h2>
                        <p className="text-muted leading-relaxed mb-6 text-sm md:text-base">
                            This live assessment is strictly proctored with full lockdown mode.
                            Full screen is mandatory. Tab switching, exiting full screen, Google Lens, or AI assistance will be recorded as exam violations.
                        </p>
                        <Button
                            onClick={async () => { await enterFullScreen(); }}
                            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition-all"
                        >
                            Resume Full Screen
                        </Button>
                    </div>
                </div>
            )}

            {/* Exam Terminated Overlay */}
            {isTerminated && (
                <div className="fixed inset-0 z-[140] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                    <div className="bg-surface border-t-4 border-t-red-600 shadow-2xl rounded-2xl p-8 max-w-lg w-full text-center border border-border space-y-5">
                        <div className="mx-auto w-16 h-16 bg-red-500/10 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center">
                            <ShieldAlert className="w-8 h-8 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs uppercase font-extrabold tracking-widest px-3 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                3/3 Strikes Reached
                            </span>
                            <h2 className="text-2xl md:text-3xl font-black text-text">Live Exam Terminated</h2>
                            <p className="text-muted text-sm leading-relaxed">
                                You have been disqualified for repeated tab switching or security violations. Your test session is locked.
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-highlight border border-border text-xs text-muted leading-relaxed">
                            Please contact your instructor to request a retake. Once your instructor approves your retake from the host controller, this screen will automatically unlock.
                        </div>
                    </div>
                </div>
            )}

            {/* Offline Alert */}
            {isOffline && (
                <div className="fixed inset-0 z-[110] bg-background/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                    <WifiOff className="w-20 h-20 text-amber-500 mb-4 animate-pulse" />
                    <h2 className="text-3xl font-extrabold text-text mb-2">Connection Lost</h2>
                    <p className="text-muted max-w-md">Your progress is preserved locally. The assessment will resume once internet is restored.</p>
                </div>
            )}

            {/* Header */}
            <header className="h-14 shrink-0 px-4 md:px-6 flex items-center justify-between bg-surface border-b border-border z-30">
                {/* Left: Logo + Live status + Proctor Badge */}
                <div className="flex items-center gap-3">
                    <img src={theme === 'dark' ? "/logo-light.png" : "/logo-dark.png"} alt="Logo" className="h-7 w-auto object-contain rounded-md" />
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-surface-highlight rounded-full border border-border">
                        <div className={cn("w-2 h-2 rounded-full", realtimeStatus === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                        <span className="text-xs font-semibold text-muted hidden sm:inline">
                            {realtimeStatus === 'connected' ? 'Live Session' : 'Syncing...'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-highlight rounded-full border border-border text-xs font-semibold text-muted">
                        <Shield className="w-3.5 h-3.5 text-primary" />
                        <span className="hidden md:inline">Proctored</span>
                        {violations > 0 && (
                            <span className="ml-0.5 px-1.5 py-0.2 bg-red-500 text-white rounded-full text-[10px] font-bold animate-pulse">
                                {violations} {violations === 1 ? 'Strike' : 'Strikes'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Center: Question Progress & Sets Info */}
                <div className="flex items-center gap-2 md:gap-3">
                    {assignedSet && (
                        <span className="font-bold text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shadow-sm flex items-center gap-1">
                            <span>{assignedSet.setName}</span>
                            <span className="opacity-80 text-[10px]">(Q{assignedSet.startQuestion}–Q{assignedSet.endQuestion})</span>
                        </span>
                    )}

                    <span className="font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Question {activeQIndex + 1} of {questions.length}
                    </span>

                    {/* Question Switcher Tabs for Multi-Question Sets */}
                    {questions.length > 1 && (
                        <div className="flex items-center gap-1 bg-surface-highlight p-0.5 rounded-lg border border-border">
                            {questions.map((_, qIdx) => (
                                <button
                                    key={qIdx}
                                    type="button"
                                    onClick={() => {
                                        if (currentQuestionIndex !== qIdx) {
                                            setCurrentQuestionIndex(qIdx);
                                            setSelectedOption(null);
                                            setIsSubmitted(false);
                                        }
                                    }}
                                    className={cn(
                                        "px-2 py-0.5 rounded-md text-xs font-bold transition-all",
                                        activeQIndex === qIdx
                                            ? "bg-primary text-white shadow-sm"
                                            : "text-muted hover:text-text"
                                    )}
                                >
                                    Q{qIdx + 1}
                                </button>
                            ))}
                        </div>
                    )}

                    <Button variant="ghost" size="sm" onClick={fetchQuizState} title="Refresh sync" className="h-7 w-7 p-0">
                        <RotateCcw className="w-3.5 h-3.5 text-muted" />
                    </Button>
                </div>

                {/* Right: Quick Action / Status Mode */}
                <div className="flex items-center gap-2">
                    {viewMode === 'results' ? (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Results Mode
                        </span>
                    ) : isSubmitted ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" /> Submitted
                        </span>
                    ) : (
                        <Button
                            onClick={handleSubmitAnswer}
                            disabled={currentQuestion.type === 'code' ? isExecutingCode : selectedOption === null}
                            size="sm"
                            className="h-8 px-4 font-bold text-xs shadow-md bg-primary hover:bg-primary-600 text-white rounded-xl"
                        >
                            {currentQuestion.type === 'code'
                                ? (codePassedStatus[currentQuestion.id] ? "Submit Solution ✓" : "Submit Code")
                                : "Submit Answer"}
                        </Button>
                    )}
                </div>
            </header>

            {/* Main Full-Screen Workspace */}
            {currentQuestion.type === 'code' ? (
                <div className="flex-1 min-h-0 flex flex-col md:flex-row w-full overflow-hidden">
                    {/* Left Panel: Problem Statement & Requirements */}
                    <div className="w-full md:w-[40%] lg:w-[35%] xl:w-[32%] shrink-0 border-r border-border bg-surface flex flex-col h-full overflow-hidden">
                        {/* Left Header */}
                        <div className="px-5 py-3 border-b border-border bg-surface-highlight flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Code2 className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-text uppercase tracking-wider">Problem Description</span>
                            </div>
                            <span className="text-[11px] font-mono text-muted">
                                {((currentQuestion.correct as any)?.testCases || []).length} Test Cases
                            </span>
                        </div>

                        {/* Left Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            <MathText text={currentQuestion.stem} className="text-base md:text-lg font-bold leading-relaxed text-text" as="h2" />

                            {/* Submission status if submitted */}
                            {isSubmitted && (
                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
                                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div>
                                        <p className="font-bold">Solution Submitted</p>
                                        <p className="opacity-90 text-[11px]">Waiting for instructor to advance to the next challenge.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Left Footer Action */}
                        <div className="p-4 border-t border-border bg-surface-highlight shrink-0">
                            {viewMode === 'voting' && !isSubmitted && (
                                <Button
                                    onClick={handleSubmitAnswer}
                                    disabled={isExecutingCode}
                                    className="w-full h-10 font-bold text-xs rounded-xl shadow-md"
                                >
                                    {codePassedStatus[currentQuestion.id] ? "Submit Solution ✓" : "Run & Submit Code"}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Full-Height Code Editor + Docked Console */}
                    <div className="flex-1 min-h-0 flex flex-col h-full bg-background overflow-hidden relative">
                        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                            <CodeEditor
                                value={codeAnswers[currentQuestion.id] ?? (currentQuestion.correct as any)?.starterCode ?? ''}
                                onChange={(val) => setCodeAnswers(prev => ({ ...prev, [currentQuestion.id]: val }))}
                                fileName="solution.py"
                                breadcrumbs={['live-assessment', `question-${currentQuestionIndex + 1}`, 'solution.py']}
                                disabled={isLocked}
                                readOnly={isLocked}
                                onReset={() => {
                                    const starter = (currentQuestion.correct as any)?.starterCode || '';
                                    setCodeAnswers(prev => ({ ...prev, [currentQuestion.id]: starter }));
                                }}
                                showReset={!isLocked}
                                showCopy={false}
                                onRun={handleRunLiveCode}
                                isRunning={isExecutingCode}
                                runButtonText="Run & Test Code"
                                allPassed={codePassedStatus[currentQuestion.id]}
                                testCasesCount={((currentQuestion.correct as any)?.testCases || []).length}
                                className="h-full flex-1 rounded-none border-0 shadow-none"
                                minHeight="100%"
                            />
                        </div>

                        {/* Output Console - Moveable, Resizable & Floatable */}
                        {codeExecutionResult[currentQuestion.id] && terminalMode === 'docked' && (
                            <div
                                style={{ height: `${terminalHeight}px` }}
                                className="shrink-0 border-t border-border bg-surface flex flex-col overflow-hidden shadow-2xl z-20 animate-in slide-in-from-bottom duration-200 relative"
                            >
                                {/* Top Edge Resizer Bar */}
                                <div
                                    onMouseDown={startResizeHeight}
                                    className="w-full h-2 -top-1 absolute inset-x-0 cursor-row-resize flex items-center justify-center group z-30 select-none hover:h-3 transition-all"
                                    title="Drag up/down to resize terminal height"
                                >
                                    <div className="w-16 h-1 rounded-full bg-border group-hover:bg-primary transition-colors" />
                                </div>

                                {/* Docked Header - Drag to undock/float, or click buttons */}
                                <div
                                    onMouseDown={startDragFromDocked}
                                    className="px-4 py-2 border-b border-border bg-surface-highlight flex items-center justify-between shrink-0 cursor-grab active:cursor-grabbing select-none"
                                    title="Drag to move anywhere, or click Float"
                                >
                                    <div className="flex items-center gap-2 text-xs font-mono">
                                        <GripHorizontal className="w-4 h-4 text-muted shrink-0" />
                                        <Code2 className="w-3.5 h-3.5 text-primary" />
                                        <span className="font-bold text-text">Output Console</span>
                                        {codePassedStatus[currentQuestion.id] ? (
                                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> PASSED ALL
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center gap-1">
                                                <X className="w-3 h-3" /> FAILED
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setTerminalMode('floating')}
                                            className="p-1 rounded text-muted hover:text-text hover:bg-surface text-xs flex items-center gap-1"
                                            title="Float / Move window anywhere"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5" />
                                            <span className="text-[10px] hidden sm:inline">Float</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTerminalMode('minimized')}
                                            className="p-1 rounded text-muted hover:text-text hover:bg-surface text-xs"
                                            title="Minimize to pill"
                                        >
                                            <Minus className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCodeExecutionResult(prev => ({ ...prev, [currentQuestion.id]: null }))}
                                            className="p-1 rounded text-muted hover:text-rose-500 hover:bg-surface text-xs"
                                            title="Close Console"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs font-mono">
                                    {codeExecutionResult[currentQuestion.id]?.combinedStderr && (
                                        <div className="text-rose-700 dark:text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30 whitespace-pre-wrap">
                                            {codeExecutionResult[currentQuestion.id]?.combinedStderr}
                                        </div>
                                    )}

                                    {codeExecutionResult[currentQuestion.id]?.results && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            {codeExecutionResult[currentQuestion.id]!.results.map(tc => (
                                                <div
                                                    key={tc.index}
                                                    className={cn(
                                                        "p-3 rounded-xl border flex flex-col gap-1.5 shadow-xs transition-colors",
                                                        tc.passed
                                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                                                            : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                                                    )}
                                                >
                                                    <div className="flex justify-between font-bold text-[11px]">
                                                        <span>Test Case {tc.index}</span>
                                                        <span>{tc.passed ? '✓ PASSED' : '✗ FAILED'}</span>
                                                    </div>
                                                    <div className="text-[11px] font-mono space-y-0.5">
                                                        <div><span className="text-muted">Input:</span> <span className="text-text font-medium">{tc.input || '(empty)'}</span></div>
                                                        <div><span className="text-muted">Expected:</span> <span className="text-emerald-600 dark:text-emerald-400 font-medium">{tc.expected}</span></div>
                                                        <div><span className="text-muted">Output:</span> <span className={tc.passed ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>{tc.actual}</span></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Full-Screen MCQ View */
                <div className="flex-1 min-h-0 flex flex-col md:flex-row w-full overflow-hidden">
                    {/* Left: Problem Stem */}
                    <div className="w-full md:w-1/2 border-r border-border bg-surface flex flex-col h-full overflow-y-auto p-8 space-y-4 custom-scrollbar">
                        <span className="font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full bg-primary/10 text-primary w-fit">
                            Question {currentQuestionIndex + 1}
                        </span>
                        <MathText text={currentQuestion.stem} className="text-2xl font-bold leading-relaxed text-text" as="h2" />
                    </div>

                    {/* Right: Options & Submit */}
                    <div className="flex-1 bg-background flex flex-col justify-between p-8 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-3.5 max-w-xl w-full mx-auto">
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

                        {/* Footer Actions */}
                        <div className="max-w-xl w-full mx-auto mt-6 pt-4 border-t border-border flex justify-end">
                            {viewMode === 'voting' ? (
                                isSubmitted ? (
                                    <div className="w-full flex items-center justify-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in">
                                        <CheckCircle className="w-5 h-5 shrink-0" />
                                        <span>Answer Submitted! Waiting for instructor...</span>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={handleSubmitAnswer}
                                        disabled={selectedOption === null}
                                        className="w-full h-12 text-base font-bold shadow-lg"
                                    >
                                        Submit Answer
                                    </Button>
                                )
                            ) : (
                                <div className="text-center w-full p-3 bg-surface rounded-xl text-muted text-sm font-medium">
                                    Question review in progress. Next challenge starts shortly.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Moveable Output Console Window */}
            {currentQuestion.type === 'code' && codeExecutionResult[currentQuestion.id] && terminalMode === 'floating' && (
                <div
                    style={{ left: `${terminalPos.x}px`, top: `${terminalPos.y}px` }}
                    className="fixed z-50 w-[92vw] sm:w-[640px] max-w-2xl flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 select-none"
                >
                    {/* Moveable Window Header */}
                    <div
                        onMouseDown={startDragFloating}
                        className="px-4 py-2.5 border-b border-border bg-surface-highlight flex items-center justify-between shrink-0 cursor-move active:cursor-grabbing"
                        title="Drag to move terminal anywhere"
                    >
                        <div className="flex items-center gap-2 text-xs font-mono">
                            <GripHorizontal className="w-4 h-4 text-primary shrink-0" />
                            <Code2 className="w-3.5 h-3.5 text-primary" />
                            <span className="font-bold text-text">Output Console</span>
                            {codePassedStatus[currentQuestion.id] ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> PASSED ALL
                                </span>
                            ) : (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center gap-1">
                                    <X className="w-3 h-3" /> FAILED
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setTerminalMode('docked')}
                                className="p-1 rounded text-muted hover:text-text hover:bg-surface text-xs flex items-center gap-1"
                                title="Dock back to bottom"
                            >
                                <PanelBottom className="w-3.5 h-3.5" />
                                <span className="text-[10px] hidden sm:inline">Dock</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setTerminalMode('minimized')}
                                className="p-1 rounded text-muted hover:text-text hover:bg-surface text-xs"
                                title="Minimize to pill"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCodeExecutionResult(prev => ({ ...prev, [currentQuestion.id]: null }))}
                                className="p-1 rounded text-muted hover:text-rose-500 hover:bg-surface text-xs"
                                title="Close"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Moveable Window Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar text-xs font-mono max-h-[60vh]">
                        {codeExecutionResult[currentQuestion.id]?.combinedStderr && (
                            <div className="text-rose-700 dark:text-rose-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30 whitespace-pre-wrap">
                                {codeExecutionResult[currentQuestion.id]?.combinedStderr}
                            </div>
                        )}

                        {codeExecutionResult[currentQuestion.id]?.results && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                {codeExecutionResult[currentQuestion.id]!.results.map(tc => (
                                    <div
                                        key={tc.index}
                                        className={cn(
                                            "p-3 rounded-xl border flex flex-col gap-1.5 shadow-xs transition-colors",
                                            tc.passed
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                                                : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200"
                                        )}
                                    >
                                        <div className="flex justify-between font-bold text-[11px]">
                                            <span>Test Case {tc.index}</span>
                                            <span>{tc.passed ? '✓ PASSED' : '✗ FAILED'}</span>
                                        </div>
                                        <div className="text-[11px] font-mono space-y-0.5">
                                            <div><span className="text-muted">Input:</span> <span className="text-text font-medium">{tc.input || '(empty)'}</span></div>
                                            <div><span className="text-muted">Expected:</span> <span className="text-emerald-600 dark:text-emerald-400 font-medium">{tc.expected}</span></div>
                                            <div><span className="text-muted">Output:</span> <span className={tc.passed ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-rose-600 dark:text-rose-400 font-medium"}>{tc.actual}</span></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Minimized Floating Output Console Pill */}
            {currentQuestion.type === 'code' && codeExecutionResult[currentQuestion.id] && terminalMode === 'minimized' && (
                <div className="fixed bottom-4 right-6 z-50 animate-in fade-in slide-in-from-bottom-2">
                    <button
                        onClick={() => setTerminalMode('docked')}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface border border-border shadow-xl font-mono text-xs font-bold hover:border-primary/40 transition-all hover:scale-105"
                    >
                        <Code2 className="w-3.5 h-3.5 text-primary" />
                        <span>Output Console</span>
                        {codePassedStatus[currentQuestion.id] ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px]">
                                PASSED ALL
                            </span>
                        ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px]">
                                FAILED
                            </span>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
