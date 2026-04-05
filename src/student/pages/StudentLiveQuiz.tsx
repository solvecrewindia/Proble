import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';
import { Button } from '../../shared/components/Button';
import { Card } from '../../shared/components/Card';
import { cn } from '../../lib/utils';
import { useTheme } from '../../shared/context/ThemeContext';
import { MathText } from '../../shared/components/MathText';
import { CHARACTERS, getCharacterSrc } from '../../shared/utils/characters';
import { User, Clock, CheckCircle, Loader2, WifiOff } from 'lucide-react';
import gameBgVideo from '../../characters/videoplayback (1).mp4';

const GAME_COLORS = [
    "bg-red-500 hover:bg-red-600 border-red-700 shadow-[0_6px_0_rgb(185,28,28)] active:translate-y-1.5 active:shadow-none text-white",
    "bg-blue-500 hover:bg-blue-600 border-blue-700 shadow-[0_6px_0_rgb(29,78,216)] active:translate-y-1.5 active:shadow-none text-white",
    "bg-yellow-500 hover:bg-yellow-600 border-yellow-700 shadow-[0_6px_0_rgb(161,98,7)] active:translate-y-1.5 active:shadow-none text-white",
    "bg-green-500 hover:bg-green-600 border-green-700 shadow-[0_6px_0_rgb(21,128,61)] active:translate-y-1.5 active:shadow-none text-white",
    "bg-purple-500 hover:bg-purple-600 border-purple-700 shadow-[0_6px_0_rgb(126,34,206)] active:translate-y-1.5 active:shadow-none text-white",
    "bg-pink-500 hover:bg-pink-600 border-pink-700 shadow-[0_6px_0_rgb(190,24,93)] active:translate-y-1.5 active:shadow-none text-white"
];

export default function StudentLiveQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const { theme } = useTheme();

    // State
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(-1);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [status, setStatus] = useState<'waiting' | 'active' | 'completed'>('waiting');
    const [viewMode, setViewMode] = useState<'voting' | 'results' | 'leaderboard'>('voting');
    const [isGameMode, setIsGameMode] = useState(false);
    const [startupCountdown, setStartupCountdown] = useState(0);
    const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [quizTitle, setQuizTitle] = useState('');

    // Timer State
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isTimeUp, setIsTimeUp] = useState(false);

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

    const fetchParticipants = async () => {
        if (!id) return;
        const { data: attemptsData } = await supabase.from('attempts').select('student_id').eq('quiz_id', id).eq('status', 'in-progress');
        if (!attemptsData || attemptsData.length === 0) { setParticipants([]); return; }
        
        const studentIds = attemptsData.map(a => a.student_id);
        const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', studentIds);
        
        if (profilesData) {
            const mapped = profilesData.map((profile: any) => ({
                id: profile.id,
                name: profile.full_name || 'Unknown Student',
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

            // Update Local State based on settings
            if (quizData.settings) {
                if (quizData.settings.gameMode) {
                    setIsGameMode(true);
                }
                if (typeof quizData.settings.currentQuestionIndex === 'number') {
                    setCurrentQuestionIndex((prev) => {
                        if (prev !== quizData.settings.currentQuestionIndex) {
                            if (quizData.settings.gameMode) {
                                setStartupCountdown(3);
                            }
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
                // RESTORE SAVED ANSWER
                const currentQIndex = quizData.settings?.currentQuestionIndex ?? 0;

                // We need the ID of the current question to look up the answer.
                // If we have questions in state, use them.
                // If we don't, we likely just fetched them in the block above, but that variable is out of scope.
                // So we do a quick lightweight fetch of just IDs to be safe and ensure sync.

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
                        const savedOption = typeof savedRecord === 'object' ? savedRecord.option : savedRecord;
                        if (typeof savedOption === 'number') {
                            // Only set if we haven't already selected something (prevents overwriting user's unsaved selection on pollen)
                            setSelectedOption(prev => prev === null ? savedOption : prev);
                            setIsSubmitted(true);
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

        // Initial Fetch
        fetchQuizState();

        // Polling Fallback (every 3 seconds)
        const pollInterval = setInterval(() => {
            fetchQuizState();
            fetchParticipants();
        }, 3000);

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
                            console.log("Realtime Update Received:", payload);
                            const newSettings = payload.new.settings;
                            const newStatus = payload.new.status;

                            if (newStatus === 'completed') {
                                setStatus('completed');
                            }

                            if (newSettings) {
                                if (newSettings.gameMode !== undefined) {
                                    setIsGameMode(newSettings.gameMode);
                                }
                                if (typeof newSettings.currentQuestionIndex === 'number') {
                                    setCurrentQuestionIndex((prev) => {
                                        if (prev !== newSettings.currentQuestionIndex) {
                                            if (newSettings.gameMode) {
                                                setStartupCountdown(3);
                                            }
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
            } else {
                console.warn("WebSockets not supported in this browser. Falling back to polling.");
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

    // Leaderboard Fetcher
    useEffect(() => {
        if ((viewMode === 'leaderboard' || status === 'completed')) {
            const fetchLeaderboard = async () => {
                const { data } = await supabase
                    .from('quiz_results')
                    .select('score, student_id')
                    .eq('quiz_id', id)
                    .order('score', { ascending: false })
                    .limit(10);

                if (data) {
                    const enriched = data.map((d: any) => {
                        const p = participants.find(p => p.id === d.student_id);
                        return {
                            ...d,
                            name: p?.name || 'Crewmate',
                            avatarUrl: p?.avatarUrl
                        };
                    });
                    setLeaderboardData(enriched);
                }
            };
            
            fetchLeaderboard();
            const polling = setInterval(fetchLeaderboard, 2000);
            return () => clearInterval(polling);
        }
    }, [viewMode, isGameMode, id, participants]);

    // Countdown Interval
    useEffect(() => {
        if (startupCountdown > 0) {
            const timer = setTimeout(() => setStartupCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [startupCountdown]);

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

    const handleSelectCharacter = async (charId: string) => {
        setSelectedCharacter(charId);
        if (user) {
            await supabase.from('profiles').update({ avatar_url: charId }).eq('id', user.id);
            fetchParticipants();
        }
    };

    const handleSubmitAnswer = async () => {
        if (selectedOption === null || !user || !id) return;

        setIsSubmitted(true);

        try {
            // 1. Fetch current attempt to get existing answers
            const { data: attempt } = await supabase
                .from('attempts')
                .select('answers, score')
                .eq('quiz_id', id)
                .eq('student_id', user.id)
                .single();

            const currentAnswers = attempt?.answers || {};
            const questionId = questions[currentQuestionIndex].id;

            let pointsForThisQ = 0;
            if (isGameMode) {
                // Check if correct exactly now to decide points
                const q = questions[currentQuestionIndex];
                const isCorrect = (q.correct === q.options[selectedOption] || String(q.correct) === String(selectedOption) || q.correct === selectedOption);
                if (isCorrect) {
                     // e.g. 500 base + remaining time bonus (assuming roughly 60s max = +500 points)
                     pointsForThisQ = 500 + Math.round((timeLeft || 0) * 8.5); 
                }
            }

            const answerPayload = isGameMode ? { option: selectedOption, points: pointsForThisQ } : selectedOption;

            const newAnswers = {
                ...currentAnswers,
                [questionId]: answerPayload
            };

            // 2. Calculate current total score accurately
            let totalCorrect = 0;
            let cumulativeGamePoints = 0;

            questions.forEach((q) => {
                const answerRecord = newAnswers[q.id];
                if (answerRecord !== undefined && answerRecord !== null) {
                    const isObject = typeof answerRecord === 'object';
                    const answer = isObject ? answerRecord.option : answerRecord;

                    // Check if answer matches correct_answer
                    const isCorrect = (
                        q.correct === q.options[answer] ||
                        String(q.correct) === String(answer) ||
                        q.correct === answer
                    );
                    if (isCorrect) {
                        totalCorrect++;
                    }
                    if (isObject) {
                        cumulativeGamePoints += (answerRecord.points || 0);
                    }
                }
            });

            const percentage = (totalCorrect / questions.length) * 100;

            // 3. Update 'attempts' with new answers and standard total correct score
            await supabase
                .from('attempts')
                .update({
                    answers: newAnswers,
                    score: totalCorrect,
                    updated_at: new Date().toISOString()
                })
                .eq('quiz_id', id)
                .eq('student_id', user.id);

            // 4. Safely Upsert into 'quiz_results' without relying on database constraints
            const { data: existingQR } = await supabase
                .from('quiz_results')
                .select('id')
                .eq('quiz_id', id)
                .eq('student_id', user.id)
                .maybeSingle();

            if (existingQR) {
                await supabase.from('quiz_results').update({
                    score: isGameMode ? cumulativeGamePoints : totalCorrect,
                    total_questions: questions.length,
                    percentage: percentage
                }).eq('id', existingQR.id);
            } else {
                await supabase.from('quiz_results').insert({
                    quiz_id: id,
                    student_id: user.id,
                    score: isGameMode ? cumulativeGamePoints : totalCorrect,
                    total_questions: questions.length,
                    percentage: percentage,
                    created_at: new Date().toISOString()
                });
            }

            setViewMode('leaderboard');
        } catch (err) {
            console.error("Failed to submit answer:", err);
        }
    };

    if (loading || authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
                <Card className="max-w-md w-full p-8 text-center space-y-6">
                    <h1 className="text-2xl font-bold text-text">Access Denied</h1>
                    <p className="text-muted">You must be logged in to join a live quiz.</p>
                    <Button onClick={() => navigate('/login')} className="w-full">Go to Login</Button>
                </Card>
            </div>
        );
    }

    if (status === 'completed' && !isGameMode) {
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
    if (isGameMode && !selectedCharacter) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans relative overflow-hidden">
                <video src={gameBgVideo} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none z-0" />
                <div className="z-10 relative flex flex-col items-center w-full max-w-2xl">
                    <h1 className="text-5xl font-extrabold mb-8 tracking-wider animate-bounce drop-shadow-xl text-center font-[AmongUs]">Choose Your Character!</h1>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full">
                        {CHARACTERS.map(char => (
                            <button key={char.id} onClick={() => handleSelectCharacter(char.id)} className="bg-white/10 hover:bg-white/20 p-6 rounded-3xl border-4 border-white/20 hover:border-white transition-all transform hover:scale-105 flex flex-col items-center justify-center">
                                <img src={char.src} alt="Crewmate" className="w-24 h-24 object-contain drop-shadow-xl" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        if (isGameMode) {
            return (
                <div className="min-h-screen bg-black p-6 text-white font-sans flex flex-col relative overflow-hidden">
                    <video src={gameBgVideo} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none z-0" />
                    <div className="z-10 relative flex flex-col h-full items-center justify-center pt-8 w-full">
                        <div className="text-center mb-8">
                            <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-wider drop-shadow-lg font-[AmongUs]">Game Lobby</h1>
                            <p className="text-xl text-indigo-200 drop-shadow-md">Waiting for {quizTitle || 'Quiz'} to start...</p>
                        </div>
                        <div className="max-w-5xl mx-auto w-full flex-1">
                            <div className="flex items-center justify-center gap-2 mb-8 bg-white/10 mx-auto w-fit px-6 py-3 rounded-full font-bold text-xl">
                                <User className="w-6 h-6" /> {participants.length} Players Waiting
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                                {participants.map(p => (
                                    <div key={p.id} className="bg-white/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 animate-in zoom-in duration-300 hover:scale-105 transition-transform group relative">
                                        {getCharacterSrc(p.avatarUrl) ? (
                                            <img src={getCharacterSrc(p.avatarUrl)!} alt={p.name} className="w-16 h-16 object-contain drop-shadow-md relative z-10 block" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-indigo-500 border-4 border-indigo-400 flex items-center justify-center font-bold text-xl shadow-inner relative z-10">
                                                {p.avatarText}
                                            </div>
                                        )}
                                        <span className="text-white text-sm font-bold text-center truncate w-full drop-shadow-md">
                                            {p.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
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
    const isLocked = isSubmitted || isTimeUp || viewMode === 'results' || viewMode === 'leaderboard';

    if (startupCountdown > 0) {
        return (
            <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white font-sans relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[150vw] h-[150vw] bg-indigo-600/20 rounded-full animate-ping absolute" style={{ animationDuration: '1s' }} />
                </div>
                {isGameMode && (
                    <video src={gameBgVideo} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none z-0" />
                )}
                <h2 className="text-6xl text-indigo-300 mb-8 z-10 tracking-widest uppercase drop-shadow-lg font-[AmongUs]">Get Ready!</h2>
                <div key={startupCountdown} className="text-[12rem] font-black z-10 animate-in zoom-in spin-in-12 duration-500 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] font-[AmongUs]">
                    {startupCountdown}
                </div>
            </div>
        );
    }

    if (viewMode === 'leaderboard' && status !== 'completed') {
        const myIndex = leaderboardData.findIndex(d => d.student_id === user?.id);
        const myRank = myIndex >= 0 ? myIndex + 1 : '-';
        const myScore = leaderboardData.find(d => d.student_id === user?.id)?.score || 0;

        return (
            <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
                <video src={gameBgVideo} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none z-0" />
                <div className="z-10 relative flex flex-col h-full items-center p-8 w-full max-w-3xl mx-auto flex-1">
                    <h1 className="text-4xl md:text-5xl font-black mb-8 tracking-wider drop-shadow-md text-white font-[AmongUs]">Live Rankings</h1>
                    
                    <div className="w-full flex-1 overflow-y-auto space-y-4 px-2 pb-32 animate-in slide-in-from-bottom-16 duration-500">
                        {leaderboardData.map((d, i) => (
                            <div key={d.student_id} className={cn(
                                "flex items-center justify-between p-4 rounded-2xl backdrop-blur-md border transition-all transform hover:scale-105",
                                d.student_id === user?.id ? "border-yellow-400 bg-yellow-500/20 shadow-[0_0_15px_rgba(250,204,21,0.2)]" : "border-white/10 bg-white/10"
                            )}>
                                <div className="flex items-center gap-4">
                                    <span className={cn("text-2xl font-black w-8 text-center", i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-white/50")}>{i + 1}</span>
                                    {getCharacterSrc(d.avatarUrl) ? (
                                        <img src={getCharacterSrc(d.avatarUrl)!} className="w-12 h-12 object-contain drop-shadow-md" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-500 border-2 border-indigo-400 flex items-center justify-center font-bold">{d.name.substring(0, 2).toUpperCase()}</div>
                                    )}
                                    <span className="text-xl font-bold truncate max-w-[150px] sm:max-w-[300px]">{d.name}</span>
                                </div>
                                <span className={cn("text-2xl font-bold", d.student_id === user?.id ? "text-yellow-400" : "text-white")}>{d.score}</span>
                            </div>
                        ))}
                    </div>

                    <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex justify-center">
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl w-full max-w-md p-5 flex justify-between items-center text-xl font-bold border border-white/20 shadow-2xl">
                            <span className="text-indigo-200 flex items-center">Rank <span className="text-white text-3xl ml-3">#{myRank}</span></span>
                            <span className="text-indigo-200 flex items-center">Score <span className="text-yellow-400 text-3xl ml-3">{myScore}</span></span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'completed' && isGameMode) {
        return (
            <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden">
                <video src={gameBgVideo} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none z-0" />
                <div className="z-10 relative flex flex-col h-full items-center p-8 w-full max-w-5xl mx-auto flex-1">
                    <h1 className="text-5xl md:text-6xl font-black mb-12 tracking-wider drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] text-yellow-400 font-[AmongUs]">Top Crewmates</h1>
                    
                    <div className="flex-1 flex items-end justify-center gap-4 md:gap-8 max-h-[500px] w-full">
                        {/* 2nd Place */}
                        {leaderboardData[1] && (
                            <div className="flex flex-col items-center animate-in slide-in-from-bottom-32 duration-700 delay-300 fill-mode-both w-1/3 max-w-[150px]">
                                <span className="text-lg md:text-xl font-bold mb-2 truncate max-w-full text-center">{leaderboardData[1].name}</span>
                                {getCharacterSrc(leaderboardData[1].avatarUrl) && <img src={getCharacterSrc(leaderboardData[1].avatarUrl)!} className="w-20 md:w-24 h-20 md:h-24 object-contain mb-[-10px] z-10 drop-shadow-lg" />}
                                <div className="w-full h-32 md:h-40 bg-slate-300 drop-shadow-xl text-slate-800 flex flex-col items-center justify-start pt-4 rounded-t-xl border-x-4 border-t-4 border-slate-200">
                                    <span className="text-3xl font-black">2</span>
                                    <span className="font-bold">{leaderboardData[1].score}</span>
                                </div>
                            </div>
                        )}
                        
                        {/* 1st Place */}
                        {leaderboardData[0] && (
                            <div className="flex flex-col items-center animate-in slide-in-from-bottom-48 duration-1000 delay-700 fill-mode-both z-20 w-1/3 max-w-[150px] mx-[-10px]">
                                <span className="text-xl md:text-2xl font-bold mb-2 text-yellow-300 truncate max-w-full text-center drop-shadow-md">{leaderboardData[0].name}</span>
                                {getCharacterSrc(leaderboardData[0].avatarUrl) && <img src={getCharacterSrc(leaderboardData[0].avatarUrl)!} className="w-28 md:w-36 h-28 md:h-36 object-contain mb-[-15px] z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />}
                                <div className="w-full h-40 md:h-52 bg-yellow-400 drop-shadow-2xl text-yellow-900 flex flex-col items-center justify-start pt-4 rounded-t-xl border-x-4 border-t-4 border-yellow-300">
                                    <span className="text-5xl font-black">1</span>
                                    <span className="font-bold text-lg">{leaderboardData[0].score}</span>
                                </div>
                            </div>
                        )}
                        
                        {/* 3rd Place */}
                        {leaderboardData[2] && (
                            <div className="flex flex-col items-center animate-in slide-in-from-bottom-16 duration-500 delay-100 fill-mode-both w-1/3 max-w-[150px]">
                                <span className="text-md md:text-lg font-bold mb-2 truncate max-w-full text-center">{leaderboardData[2].name}</span>
                                {getCharacterSrc(leaderboardData[2].avatarUrl) && <img src={getCharacterSrc(leaderboardData[2].avatarUrl)!} className="w-16 md:w-20 h-16 md:h-20 object-contain mb-[-10px] z-10 drop-shadow-md" />}
                                <div className="w-full h-24 md:h-28 bg-amber-600 drop-shadow-xl text-amber-100 flex flex-col items-center justify-start pt-4 rounded-t-xl border-x-4 border-t-4 border-amber-500">
                                    <span className="text-3xl font-black">3</span>
                                    <span className="font-bold">{leaderboardData[2].score}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-12 animate-in fade-in zoom-in delay-1000 fill-mode-both">
                        <Button onClick={() => navigate('/student/dashboard')} className="px-8 h-12 text-lg font-bold bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-md">
                            Return to Dashboard
                        </Button>
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className={cn("min-h-screen font-sans flex flex-col relative", isGameMode ? "text-white bg-black" : "bg-background text-text")}>
            {isGameMode && (
                <video src={gameBgVideo} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none z-0 disabled" />
            )}
            
            {/* --- OFFLINE PROTECTION OVERLAY --- */}
            {isOffline && status === 'active' && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
                    <WifiOff className="w-24 h-24 text-yellow-500 mb-6 animate-pulse" />
                    <h2 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Connection Lost</h2>
                    <p className="text-xl text-white/80 max-w-xl leading-relaxed">
                        Please check your internet connection.
                        <br />Your progress is saved locally. The quiz will resume once reconnected.
                    </p>
                </div>
            )}

            {/* Header */}
            <header className={cn("sticky top-0 z-50 px-6 py-3 flex items-center justify-between", isGameMode ? "bg-indigo-900/50 backdrop-blur-md border-b border-indigo-500/20" : "bg-background/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800")}>
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
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 container mx-auto max-w-4xl p-6 flex flex-col justify-center relative z-10">
                <div className={cn("rounded-xl p-6 md:p-8 flex flex-col gap-6", isGameMode ? "bg-black/40 backdrop-blur-md border border-white/20 shadow-2xl" : "bg-surface border border-neutral-200 dark:border-neutral-800 shadow-sm")}>

                    {/* Question Header */}
                    <div className="flex justify-between items-center">
                        <span className={cn("font-medium px-3 py-1 rounded-full text-xs", isGameMode ? "bg-indigo-500/30 text-indigo-100" : "bg-neutral-100 dark:bg-neutral-800 text-muted")}>
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
                    <MathText text={currentQuestion.stem} className={cn("text-xl md:text-2xl font-semibold leading-relaxed", isGameMode ? "text-white" : "text-text")} as="h2" />

                    {/* Options */}
                    <div className="flex flex-col gap-3">
                        {currentQuestion.options?.map((option: string, idx: number) => {
                            const isSelected = selectedOption === idx;
                            // Check similarity if options are strings or indices. Assuming strings based on earlier context.
                            const isCorrectCheck = viewMode === 'results' && (currentQuestion.correct === option || String(currentQuestion.correct) === String(idx) || currentQuestion.correct === idx);

                            let stateStyles = isGameMode 
                                ? GAME_COLORS[idx % GAME_COLORS.length] 
                                : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900";

                            if (viewMode === 'results') {
                                if (isCorrectCheck) {
                                    stateStyles = "border-green-500 bg-green-500 text-white shadow-[0_4px_0_rgb(21,128,61)]";
                                } else if (isSelected && !isCorrectCheck) {
                                    stateStyles = "border-red-500 bg-red-500 text-white shadow-[0_4px_0_rgb(185,28,28)] opacity-70";
                                } else {
                                    stateStyles = isGameMode ? stateStyles + " opacity-30 grayscale" : "opacity-50 grayscale";
                                }
                            } else if (isSelected && !isGameMode) {
                                stateStyles = "border-primary bg-primary/5 shadow-md shadow-primary/10";
                            } else if (isSelected && isGameMode) {
                                stateStyles = stateStyles + " ring-4 ring-white ring-offset-4 ring-offset-indigo-950 scale-[1.02] transform transition-transform";
                            } else if (isLocked && !isSelected) {
                                stateStyles = isGameMode ? stateStyles + " opacity-50 grayscale cursor-not-allowed" : "opacity-60 cursor-not-allowed";
                            }

                            return (
                                <button
                                    key={idx}
                                    disabled={isLocked}
                                    onClick={() => setSelectedOption(idx)}
                                    className={cn(
                                        "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 group relative min-h-[5rem]",
                                        stateStyles
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors shrink-0 shadow-sm",
                                        viewMode === 'results' && isCorrectCheck
                                            ? "bg-white text-green-600"
                                            : viewMode === 'results' && isSelected && !isCorrectCheck
                                                ? "bg-white text-red-600"
                                                : isSelected
                                                    ? "bg-white text-primary"
                                                    : isGameMode 
                                                        ? "bg-white/20 text-white border border-white/40 group-hover:bg-white/30"
                                                        : "bg-neutral-100 dark:bg-neutral-800 text-muted group-hover:bg-neutral-200"
                                    )}>
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <MathText text={option} className={cn(
                                        "font-bold text-lg leading-tight",
                                        isGameMode ? "text-white drop-shadow-sm" : viewMode === 'results' && isCorrectCheck ? "text-green-700 dark:text-green-400" : "text-text"
                                    )} />
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
