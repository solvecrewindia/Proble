import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/Button';
import { User, Copy, Play, ArrowLeft } from 'lucide-react';
import QRCode from 'react-qr-code';
import { QRCodeModal } from '../components/quiz/QRCodeModal';

export default function LiveLobby() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [quiz, setQuiz] = useState<any>(null);
    const [showQR, setShowQR] = useState(false);

    // Participants state
    const [participants, setParticipants] = useState<any[]>([]);

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!id) return;
            const { data, error } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', id)
                .single();

            if (data) setQuiz(data);
        };

        const fetchParticipants = async () => {
            if (!id) return;

            // Fetch attempts linked to this quiz. 
            // We select student details if available via join.
            // Note: This relies on a 'students' table relation being set up.
            // If it fails, we fail gracefully to just showing IDs or empty names.
            const { data, error } = await supabase
                .from('attempts')
                .select(`
                    id, 
                    studentId, 
                    status,
                    student:students(id, name)
                `)
                .eq('quizId', id)
                .eq('status', 'in-progress');

            if (data) {
                const mapped = data.map((attempt: any) => ({
                    id: attempt.student?.id || attempt.studentId,
                    name: attempt.student?.name || 'Unknown Student',
                    avatar: (attempt.student?.name || 'U').substring(0, 2).toUpperCase()
                }));
                setParticipants(mapped);
            }
        };

        fetchQuiz();
        fetchParticipants();

        // Real-time subscription for new joiners
        const channel = supabase
            .channel('live-lobby')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'attempts',
                    filter: `quizId=eq.${id}`
                },
                (payload) => {
                    console.log('New participant joined:', payload);
                    fetchParticipants(); // Refetch to get student details safely
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id]);

    const handleStartQuiz = () => {
        navigate(`/faculty/live/${id}/host`);
    };

    const copyCode = () => {
        if (quiz?.accessCode || quiz?.code) {
            navigator.clipboard.writeText(quiz.accessCode || quiz.code);
            alert("Code copied!");
        }
    };

    if (!quiz) return <div className="p-8 text-center">Loading lobby...</div>;

    const accessCode = quiz.accessCode || quiz.code || '----';
    const joinLink = `${window.location.origin}/quiz/${accessCode}`;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" className="pl-0 hover:bg-transparent" onClick={() => navigate('/faculty/live')}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Live Tests
            </Button>

            <div className="bg-surface border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-text mb-2">{quiz.title}</h1>
                    <p className="text-muted text-lg">Waiting for participants to join...</p>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 bg-primary/5 rounded-2xl max-w-3xl mx-auto border-2 border-primary/20">
                    <div className="flex flex-col items-center md:items-start">
                        <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wider">Join at {window.location.host}/quiz</p>
                        <div className="text-6xl font-mono font-bold text-primary tracking-widest mb-6">
                            {accessCode}
                        </div>
                        <Button variant="outline" onClick={copyCode} className="border-primary/30 hover:bg-primary/10 text-primary">
                            <Copy className="h-4 w-4 mr-2" /> Copy Joining Link
                        </Button>
                    </div>

                    <div
                        className="bg-white p-4 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-sm border border-neutral-100 group"
                        onClick={() => setShowQR(true)}
                        title="Click to expand"
                    >
                        <QRCode value={joinLink} size={140} />
                        <p className="text-xs text-center text-muted mt-2 font-medium group-hover:text-primary transition-colors">Click to expand</p>
                    </div>
                </div>

                {showQR && (
                    <QRCodeModal
                        url={joinLink}
                        code={accessCode}
                        onClose={() => setShowQR(false)}
                    />
                )}
            </div>

            <div className="bg-surface border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-text flex items-center">
                        <User className="mr-2 h-5 w-5" />
                        Participants ({participants.length})
                    </h2>
                    <Button onClick={handleStartQuiz} className="bg-green-600 hover:bg-green-700 text-white px-8">
                        <Play className="mr-2 h-4 w-4" /> Start Quiz
                    </Button>
                </div>

                <div className="space-y-2">
                    {participants.map((p, index) => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                            <div className="flex items-center gap-4">
                                <span className="text-muted text-sm w-6">#{index + 1}</span>
                                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                                    {p.avatar}
                                </div>
                                <div>
                                    <p className="font-medium text-text">{p.name}</p>
                                    <p className="text-xs text-muted">Ready</p>
                                </div>
                            </div>
                            <div className="text-sm text-green-600 font-medium bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                                Joined
                            </div>
                        </div>
                    ))}
                    {participants.length === 0 && (
                        <div className="text-center py-12 text-muted">
                            <p>Waiting for students to join...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
