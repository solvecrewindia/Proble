import { useState, useEffect } from 'react';
import { Play, Save, CheckCircle, Clock, Copy, QrCode, Link as LinkIcon, Trash2, Download, RotateCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase'; // Import supabase
import { Card, CardContent } from '../components/ui/Card'; // Import UI components
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import type { Quiz } from '../types';
import { QRCodeModal } from '../components/quiz/QRCodeModal';

import { useAuth } from '../../shared/context/AuthContext';

export default function LiveTests() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'saved' | 'live' | 'completed'>('saved');
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    // QR Code State
    const [qrCodeData, setQrCodeData] = useState<{ url: string; code: string } | null>(null);

    // Results Modal State
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [viewingResults, setViewingResults] = useState(false);

    const fetchResults = async (quizId: string) => {
        console.log(`[DEBUG] LiveTests: fetchResults called for quizId: ${quizId}`);
        setSelectedQuizId(quizId);
        setViewingResults(true);
        setResults([]); // Clear previous

        try {
            const { data, error } = await supabase
                .from('quiz_results')
                .select(`
                    *,
                    profiles (username, email, registration_number)
                `)
                .eq('quiz_id', quizId)
                .order('percentage', { ascending: false });

            if (error) {
                console.error("Error fetching live results:", error);
                return;
            }

            console.log(`[DEBUG] LiveTests: Fetched ${data?.length || 0} results`);
            if (data) setResults(data);
        } catch (err) {
            console.error("Unexpected error in fetchResults:", err);
        }
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

    const handleRetest = async (result: any, studentName: string) => {
        console.log("[DEBUG] LiveTests handleRetest triggered for:", result);

        if (!result.quiz_id || !result.student_id) {
            alert(`Error: Missing IDs. Quiz: ${result.quiz_id}, Student: ${result.student_id}`);
            return;
        }

        if (!confirm(`Allow ${studentName} to retake? This deletes the current result.`)) {
            return;
        }

        try {
            // 1. Delete from quiz_results — use .select() to verify rows were actually deleted
            const { data: deletedResults, error: resultsError } = await supabase
                .from('quiz_results')
                .delete()
                .eq('quiz_id', result.quiz_id)
                .eq('student_id', result.student_id)
                .select();

            console.log("[DEBUG] quiz_results delete response:", { deletedResults, resultsError });

            if (resultsError) {
                console.error("[ERROR] Failed to delete from quiz_results:", resultsError);
                alert("Failed to delete result: " + resultsError.message);
                return;
            }

            if (!deletedResults || deletedResults.length === 0) {
                console.warn("[WARN] quiz_results delete returned 0 rows — RLS may be blocking.");

                const { data: fallbackDeleted, error: fallbackError } = await supabase
                    .from('quiz_results')
                    .delete()
                    .eq('id', result.id)
                    .select();

                if (fallbackError || !fallbackDeleted || fallbackDeleted.length === 0) {
                    alert(
                        `⚠️ Could not reset ${studentName}'s attempt.\n\n` +
                        `This is likely due to database security policies (RLS).\n` +
                        `Please update RLS policies to allow teachers to delete student results.`
                    );
                    return;
                }
            }

            // 2. Delete from attempts
            const { data: deletedAttempts, error: attemptsError } = await supabase
                .from('attempts')
                .delete()
                .eq('quiz_id', result.quiz_id)
                .eq('student_id', result.student_id)
                .select();

            console.log("[DEBUG] attempts delete response:", { deletedAttempts, attemptsError });

            if (attemptsError) {
                console.error("[ERROR] Failed to clear attempts:", attemptsError);
            }

            alert(`Retest granted for ${studentName}`);
            if (selectedQuizId) fetchResults(selectedQuizId);

        } catch (err: any) {
            console.error("[ERROR] Unexpected error in handleRetest:", err);
            alert("An unexpected error occurred: " + err.message);
        }
    };

    const tabs = [
        { id: 'saved', label: 'Saved Tests', icon: Save },
        { id: 'live', label: 'Live Tests', icon: Play },
        { id: 'completed', label: 'Completed', icon: CheckCircle },
    ];

    useEffect(() => {
        const fetchQuizzes = async () => {
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
                    .eq('type', 'live')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error("Error fetching live quizzes:", error);
                }
                if (data) setQuizzes(data as any);
            } catch (err) {
                console.error("Unexpected error in LiveTests:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, [user]);

    const isExpired = (quiz: Quiz) => {
        if (!quiz.scheduledAt || !quiz.settings?.duration) return false;
        const endTime = new Date(new Date(quiz.scheduledAt).getTime() + quiz.settings.duration * 60000); // duration is in minutes
        return new Date() > endTime;
    };

    const filteredQuizzes = quizzes.filter(quiz => {
        const isQuizExpired = isExpired(quiz);
        if (activeTab === 'saved') {
            return quiz.status === 'draft';
        }
        if (activeTab === 'live') {
            return quiz.status === 'active' && !isQuizExpired;
        }
        if (activeTab === 'completed') {
            return quiz.status === 'completed' || (quiz.status === 'active' && isQuizExpired);
        }
        return false;
    });

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

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('quizzes')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting quiz:', error);
                alert('Failed to delete quiz');
                return;
            }

            setQuizzes(prev => prev.filter(q => q.id !== id));
        } catch (err) {
            console.error('Error in handleDelete:', err);
            alert('An unexpected error occurred while deleting');
        }
    };

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

            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text">Live Tests</h1>
                    <p className="text-muted">Manage your real-time assessments.</p>
                </div>
                <Button onClick={() => navigate('/faculty/create')}>
                    <Play className="mr-2 h-4 w-4" /> Create Live Quiz
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === tab.id
                                ? "border-primary text-primary"
                                : "border-transparent text-muted hover:text-text hover:border-neutral-300"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="p-8 text-center text-muted">Loading...</div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="min-h-[200px] flex flex-col items-center justify-center text-muted border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-surface/50">
                    <p>No {activeTab} tests found.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredQuizzes.map(quiz => (
                        <Card key={quiz.id} className="bg-surface hover:border-primary/50 transition-colors">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-text">{quiz.title}</h3>
                                    <div className="flex items-center gap-4 text-sm text-muted mt-1">
                                        <span className="flex items-center">
                                            <Save className="w-4 h-4 mr-1" />
                                            {new Date(quiz.createdAt || (quiz as any).created_at).toLocaleDateString()}
                                        </span>
                                        {quiz.settings?.timePerQuestion && (
                                            <span className="flex items-center">
                                                <Clock className="w-4 h-4 mr-1" />
                                                {quiz.settings.timePerQuestion}s / question
                                            </span>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium uppercase font-mono">
                                                {(quiz as any).code || quiz.accessCode || 'NO CODE'}
                                            </span>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyCode(quiz.accessCode || (quiz as any).code || '')} title="Copy Code">
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1" onClick={() => copyLink(quiz.accessCode || (quiz as any).code || '')} title="Copy Direct Link">
                                                <LinkIcon className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1 text-primary" onClick={() => handleShowQRCode(quiz.accessCode || (quiz as any).code || '')} title="Show QR Code">
                                                <QrCode className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        size="sm"
                                        onClick={() => navigate(`/faculty/live/${quiz.id}/lobby`)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <Play className="w-4 h-4 mr-2" /> Start Now
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => fetchResults(quiz.id)}>
                                        Results
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/faculty/quizzes/${quiz.id}/edit`)}>
                                        Edit
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={() => handleDelete(quiz.id)}
                                        title="Delete Quiz"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {/* Results Modal */}
            {viewingResults && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface border border-neutral-300 dark:border-neutral-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col scale-in-center">
                        <div className="p-6 border-b border-neutral-300 dark:border-neutral-600 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-text flex items-center gap-2">
                                <CheckCircle className="text-primary w-5 h-5" />
                                Student Assessment Results
                            </h2>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={downloadResultsAsCSV}>
                                    <Download className="mr-2 h-4 w-4" /> Download CSV
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setViewingResults(false)}>Close</Button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-6">
                            {results.length === 0 ? (
                                <div className="text-center py-20">
                                    <p className="text-muted text-lg">No students have taken this test yet.</p>
                                    <p className="text-xs text-muted/60 mt-2 italic">Results will appear here in real-time as students submit.</p>
                                </div>
                            ) : (
                                <div className="border rounded-lg overflow-hidden border-neutral-200 dark:border-neutral-800">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-neutral-50 dark:bg-neutral-900/50 text-muted text-xs uppercase tracking-wider">
                                                <th className="px-6 py-4 font-bold border-b border-neutral-200 dark:border-neutral-800">Student Profile</th>
                                                <th className="px-6 py-4 font-bold border-b border-neutral-200 dark:border-neutral-800 text-center">Final Score</th>
                                                <th className="px-6 py-4 font-bold border-b border-neutral-200 dark:border-neutral-800 text-center">Status</th>
                                                <th className="px-6 py-4 font-bold border-b border-neutral-200 dark:border-neutral-800 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-text divide-y divide-neutral-200 dark:divide-neutral-800">
                                            {results.map((res: any) => (
                                                <tr key={res.id} className="hover:bg-background/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold group-hover:text-primary transition-colors cursor-default">
                                                            {res.profiles?.username || 'Anonymous Candidate'}
                                                        </div>
                                                        <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                                                            {res.profiles?.registration_number || res.profiles?.email || 'No identifier'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-mono font-bold text-sm">
                                                        {res.score} <span className="text-muted/50">/</span> {res.total_questions}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className={cn(
                                                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm",
                                                            res.percentage >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                                res.percentage >= 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                                                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                        )}>
                                                            {res.percentage.toFixed(1)}%
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                                onClick={() => handleRetest(res, res.profiles?.username)}
                                                                title="Reset Attempt"
                                                            >
                                                                <RotateCw className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 rounded-b-xl">
                            <p className="text-[10px] text-center text-muted uppercase tracking-widest font-bold">Assessment Integrity Monitored • Proble Analytics</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
