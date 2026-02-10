import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Copy, Plus, Edit, Download, RotateCw, Link as LinkIcon, FileSpreadsheet, QrCode, Play } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';
import type { Quiz } from '../types';
import { QRCodeModal } from '../components/quiz/QRCodeModal';

export default function Master() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('ongoing');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    // QR Code State
    const [qrCodeData, setQrCodeData] = useState<{ url: string; code: string } | null>(null);

    const fetchQuizzes = React.useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('quizzes')
                .select('*')
                .eq('created_by', user.id)
                .eq('type', 'master')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching master quizzes:", error);
            }
            if (data) setQuizzes(data as any);
        } catch (err) {
            console.error("Unexpected error fetching quizzes:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

    // Live Monitoring State
    const [activeStudents, setActiveStudents] = useState<Record<string, number>>({});

    // Realtime Presence Subscription
    useEffect(() => {
        if (quizzes.length === 0) return;

        const channels = quizzes.map(quiz => {
            const channel = supabase.channel(`quiz_session:${quiz.id}`, {
                config: { presence: { key: 'faculty' } }
            });

            channel.on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                let count = 0;
                Object.values(state).forEach((presences: any) => {
                    count += presences.length;
                });
                setActiveStudents(prev => ({ ...prev, [quiz.id]: count }));
            }).subscribe();

            return channel;
        });

        return () => {
            channels.forEach(c => supabase.removeChannel(c));
        };
    }, [quizzes]);

    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [viewingResults, setViewingResults] = useState(false);

    const fetchResults = async (quizId: string) => {
        setSelectedQuizId(quizId);
        setViewingResults(true);
        setResults([]); // Clear previous

        const { data, error } = await supabase
            .from('quiz_results')
            .select(`
                *,
                profiles:student_id (username, email, registration_number)
            `)
            .eq('quiz_id', quizId)
            .order('percentage', { ascending: false });

        if (data) setResults(data);
        if (error) console.error("Error fetching results:", error);
    };

    const downloadResultsAsCSV = () => {
        if (results.length === 0) return;

        const csvContent = [
            ['Student Name', 'Reg. No', 'Email', 'Score', 'Total Questions', 'Percentage', 'Date'],
            ...results.map(res => [
                res.profiles?.username || 'Unknown',
                res.profiles?.registration_number || 'N/A',
                res.profiles?.email || 'N/A',
                res.score,
                res.total_questions,
                `${res.percentage.toFixed(2)}%`,
                new Date(res.created_at).toLocaleDateString()
            ])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "quiz_results.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadStudentResult = (result: any) => {
        if (!selectedQuizId) return;
        const quiz = quizzes.find(q => q.id === selectedQuizId);
        if (!quiz || !quiz.questions) {
            alert("Quiz data not found for generating report.");
            return;
        }

        const reportData = quiz.questions.map((q, index) => {
            const userAnswer = result.answers ? result.answers[q.id] : null;

            // Helper to format answer
            const formatAnswer = (ans: any, type: string) => {
                if (ans === null || ans === undefined) return "Skipped";
                if (type === 'mcq' || type === 'true_false') {
                    // Try to map index to Option Text if available, else A/B/C/D
                    if (q.options && q.options[ans]) {
                        return `${String.fromCharCode(65 + Number(ans))}. ${q.options[ans]}`;
                    }
                    return String.fromCharCode(65 + Number(ans));
                }
                if (type === 'msq') {
                    if (Array.isArray(ans)) {
                        return ans.map(a => String.fromCharCode(65 + Number(a))).join(', ');
                    }
                }
                return ans;
            };

            const given = formatAnswer(userAnswer, q.type);
            const correct = formatAnswer(q.correct, q.type);

            // Determine status
            let isCorrect = false;
            // Simple equality check for now, can be improved for MSQ/Range
            if (JSON.stringify(userAnswer) === JSON.stringify(q.correct)) isCorrect = true; // Very basic check

            return {
                "Question No": `Q${index + 1}`,
                "Question": q.stem,
                "Given Answer": given,
                "Correct Answer": correct,
                "Status": isCorrect ? "Correct" : "Incorrect",
                "Points": isCorrect ? q.weight : 0
            };
        });

        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Result Report");

        const studentName = result.profiles?.registration_number || result.profiles?.username || "Student";
        const safeName = studentName.replace(/[^a-z0-9]/gi, '_');
        XLSX.writeFile(wb, `${safeName}_Report.xlsx`);
    };

    const handleRetest = async (resultId: string, studentName: string) => {
        if (confirm(`Are you sure you want to allow ${studentName} to retake this test? This will delete their current attempt.`)) {
            const { error } = await supabase
                .from('quiz_results')
                .delete()
                .eq('id', resultId);

            if (error) {
                alert("Failed to reset attempt: " + error.message);
            } else {
                alert("Attempt reset successfully.");
                if (selectedQuizId) fetchResults(selectedQuizId);
            }
        }
    };

    const updateStatus = async (quizId: string, newStatus: Quiz['status']) => {
        console.log(`[DEBUG] updateStatus called for ${quizId} -> ${newStatus}`);

        // 1. Optimistic Update (Immediate UI Feedack)
        setQuizzes(prev => prev.map(q =>
            q.id === quizId ? { ...q, status: newStatus } : q
        ));

        // 2. Update in DB
        const { error } = await supabase
            .from('quizzes')
            .update({ status: newStatus })
            .eq('id', quizId);

        console.log(`[DEBUG] Supabase update result:`, error);

        if (error) {
            console.error(`Failed to update status to ${newStatus}:`, error);
            alert(`Failed to update status: ${error.message}`);
            // Revert by re-fetching
            fetchQuizzes();
            return;
        }

        if (newStatus === 'completed') {
            alert("Test ended successfully.");
        }

        // 3. Broadcast Event
        const eventMap: Record<string, string> = {
            'completed': 'test_ended',
            'paused': 'test_paused',
            'active': 'test_resumed'
        };

        if (eventMap[newStatus]) {
            const channel = supabase.channel(`quiz_session:${quizId}`);
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.send({
                        type: 'broadcast',
                        event: eventMap[newStatus],
                        payload: { at: new Date(), by: 'faculty' }
                    });
                    supabase.removeChannel(channel);
                }
            });
        }
    };

    const endTest = (id: string) => {
        // alert(`Debug: Clicking End Test for ${id}`);
        // if (confirm("End this test? Code will be invalidated.")) {
        updateStatus(id, 'completed');
        // }
    };
    const pauseTest = (id: string) => updateStatus(id, 'paused');
    const resumeTest = (id: string) => updateStatus(id, 'active');

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        alert(`Code copied: ${code}`);
    };

    const copyLink = (code: string) => {
        const link = `${window.location.origin}/quiz/${code}`;
        navigator.clipboard.writeText(link);
        alert(`Link copied: ${link}`);
    };

    const handleShowQRCode = (code: string) => {
        const url = `${window.location.origin}/quiz/${code}`;
        setQrCodeData({ url, code });
    };

    // Filter quizzes based on active tab
    const filteredQuizzes = quizzes.filter(quiz => {
        if (activeTab === 'ongoing') return quiz.status === 'active' || quiz.status === 'paused' || !quiz.status; // Default to active if null
        if (activeTab === 'completed') return quiz.status === 'completed';
        if (activeTab === 'scheduled') return quiz.status === 'draft'; // Assuming draft is scheduled/pre-live
        return true;
    });

    if (loading) return <div className="p-8 text-center">Loading master tests...</div>;

    return (
        <div className="space-y-6 relative">
            {/* QR Code Modal */}
            {qrCodeData && (
                <QRCodeModal
                    url={qrCodeData.url}
                    code={qrCodeData.code}
                    onClose={() => setQrCodeData(null)}
                />
            )}

            {/* ... (omit results modal checks, keeping existing) ... */}
            {viewingResults && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface border border-neutral-300 dark:border-neutral-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                        {/* ... result content ... */}
                        <div className="p-6 border-b border-neutral-300 dark:border-neutral-600 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-text">Student Results</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={downloadResultsAsCSV}>
                                    <Download className="mr-2 h-4 w-4" /> Download Excel
                                </Button>
                                <Button variant="ghost" onClick={() => setViewingResults(false)}>Close</Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            {results.length === 0 ? (
                                <p className="text-center text-muted">No students have taken this test yet.</p>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-neutral-300 dark:border-neutral-600 text-muted text-sm uppercase">
                                            <th className="pb-3">Student</th>
                                            <th className="pb-3">Score</th>
                                            <th className="pb-3">Percentage</th>
                                            <th className="pb-3 text-right">Date & Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-text">
                                        {results.map((res: any) => (
                                            <tr key={res.id} className="border-b border-neutral-300 dark:border-neutral-600 last:border-0 hover:bg-background/50">
                                                <td className="py-4">
                                                    <div className="font-bold">{res.profiles?.username || 'Unknown'}</div>
                                                    <div className="text-xs text-muted">{res.profiles?.email}</div>
                                                    {res.profiles?.registration_number && (
                                                        <div className="text-xs text-primary font-mono mt-0.5">{res.profiles.registration_number}</div>
                                                    )}
                                                </td>
                                                <td className="py-4 font-mono">{res.score} / {res.total_questions}</td>
                                                <td className="py-4">
                                                    <Badge variant={res.percentage >= 50 ? 'success' : 'danger'}>
                                                        {res.percentage.toFixed(1)}%
                                                    </Badge>
                                                </td>
                                                <td className="py-4 text-right flex items-center justify-end gap-3">
                                                    <span className="text-sm text-muted">
                                                        {new Date(res.created_at).toLocaleDateString()}
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                        onClick={() => handleRetest(res.id, res.profiles?.username)}
                                                        title="Allow Retest (Delete Result)"
                                                    >
                                                        <RotateCw className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-primary hover:bg-primary/10"
                                                        onClick={() => downloadStudentResult(res)}
                                                        title="Download Detailed Report"
                                                    >
                                                        <FileSpreadsheet className="h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text">Master Tests</h1>
                    <p className="text-muted">Private assessments with secure access codes.</p>
                </div>
                <Button onClick={() => navigate('/faculty/create')}>
                    <Plus className="mr-2 h-4 w-4" /> Create New
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-neutral-300 dark:border-neutral-600">
                {['ongoing', 'scheduled', 'completed'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 px-1 text-sm font-medium capitalize transition-colors border-b-2 ${activeTab === tab
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted hover:text-text'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="grid gap-4">
                {filteredQuizzes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                        <p className="text-muted">No {activeTab} master tests found.</p>
                        <Button variant="ghost" className="text-primary underline" onClick={() => navigate('/faculty/create')}>Create one now</Button>
                    </div>
                ) : (
                    filteredQuizzes.map(quiz => (
                        <Card key={quiz.id} className="border-l-4 border-l-green-500 bg-surface border-neutral-300 dark:border-neutral-600">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {quiz.status === 'paused' ? (
                                                <Badge variant="warning" className="animate-pulse">Paused</Badge>
                                            ) : (
                                                <Badge variant="success" className="animate-pulse">Live Now</Badge>
                                            )}
                                            <span className="text-xs text-muted">Created {new Date(quiz.createdAt || (quiz as any).created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-text">{quiz.title}</h3>

                                        <p className="text-sm text-muted flex items-center gap-2">
                                            Code: <span className="font-mono font-bold text-text bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{quiz.accessCode || (quiz as any).code}</span>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyCode(quiz.accessCode || (quiz as any).code || '')}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1" onClick={() => copyLink(quiz.accessCode || (quiz as any).code || '')} title="Copy Direct Link">
                                                <LinkIcon className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1 text-primary" onClick={() => handleShowQRCode(quiz.accessCode || (quiz as any).code || '')} title="Show QR Code">
                                                <QrCode className="h-3 w-3" />
                                            </Button>
                                        </p>

                                        {/* Organization Badge */}
                                        {quiz.settings?.allowedDomain && (
                                            <div className="flex items-center mt-2 px-2 py-1 w-fit rounded-full bg-blue-500/10 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                <span>Restricted to: {quiz.settings.allowedDomain}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => fetchResults(quiz.id)}>
                                            View Results
                                        </Button>
                                        <Button variant="outline" onClick={() => navigate(`/faculty/quizzes/${quiz.id}/edit`)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>

                                        {quiz.status !== 'completed' && (
                                            <>
                                                {quiz.status === 'paused' ? (
                                                    <Button
                                                        variant="outline"
                                                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                                        onClick={() => resumeTest(quiz.id)}
                                                    >
                                                        Resume
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                                                        onClick={() => pauseTest(quiz.id)}
                                                    >
                                                        Pause
                                                    </Button>
                                                )}

                                                <Button
                                                    variant="outline"
                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200"
                                                    onClick={() => endTest(quiz.id)}
                                                >
                                                    End Test
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                    <div className="bg-background p-3 rounded-lg border border-neutral-300 dark:border-neutral-600">
                                        <div className="text-2xl font-bold text-text">{activeStudents[quiz.id] || 0}</div>
                                        <div className="text-xs text-muted">Active Students</div>
                                    </div>
                                    <div className="bg-background p-3 rounded-lg border border-neutral-300 dark:border-neutral-600">
                                        <div className="text-2xl font-bold text-red-500">-</div>
                                        <div className="text-xs text-muted">Flagged Incidents</div>
                                    </div>
                                    <div className="bg-background p-3 rounded-lg border border-neutral-300 dark:border-neutral-600">
                                        <div className="text-2xl font-bold text-text">-</div>
                                        <div className="text-xs text-muted">Avg. Progress</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
