import { useState, useEffect } from 'react';
import { Play, Save, CheckCircle, Clock, Copy, QrCode, Link as LinkIcon } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'live' | 'saved' | 'completed'>('saved'); // Default to saved as that's where we look first
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    // QR Code State
    const [qrCodeData, setQrCodeData] = useState<{ url: string; code: string } | null>(null);

    const tabs = [
        { id: 'live', label: 'Live Tests', icon: Play },
        { id: 'saved', label: 'Saved Tests', icon: Save },
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
                // Simple fetch for now, can refine status filtering later
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
    }, [activeTab, user]);

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
            ) : quizzes.length === 0 ? (
                <div className="min-h-[200px] flex flex-col items-center justify-center text-muted border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl bg-surface/50">
                    <p>No {activeTab} tests found.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {quizzes.map(quiz => (
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
                                    <Button variant="outline" size="sm" onClick={() => navigate(`/faculty/quizzes/${quiz.id}/edit`)}>
                                        Edit
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
