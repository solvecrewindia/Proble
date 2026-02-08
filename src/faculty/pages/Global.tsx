import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarChart2, Share2, Plus, Check, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Quiz } from '../types';

function ShareButton({ quizCode, quizId }: { quizCode?: string; quizId: string }) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        // Use code if available, otherwise fallback to ID (though code is preferred for cleaner URLs)
        const identifier = quizCode || quizId;
        const link = `${window.location.origin}/quiz/${identifier}`;

        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    return (
        <Button
            variant="outline"
            size="sm"
            className="text-text border-neutral-300 dark:border-neutral-600 hover:bg-background"
            onClick={handleShare}
        >
            {copied ? (
                <>
                    <Check className="h-4 w-4 mr-2" /> Copied
                </>
            ) : (
                <>
                    <Share2 className="h-4 w-4 mr-2" /> Share
                </>
            )}
        </Button>
    );
}

export default function Global() {
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQuizzes = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('quizzes')
                .select('*')
                .eq('created_by', user.id)
                .eq('type', 'global')
                .order('created_at', { ascending: false });

            if (data) setQuizzes(data as any);
            setLoading(false);
        };

        fetchQuizzes();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading quizzes...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-text">My Global Tests</h1>
                    <p className="text-muted">Manage your public assessments and view analytics.</p>
                </div>
                <Button onClick={() => navigate('/faculty/create')}>
                    <Plus className="mr-2 h-4 w-4" /> Create New
                </Button>
            </div>

            <div className="grid gap-6">
                {quizzes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                        <p className="text-muted">No global quizzes found.</p>
                        <Button variant="ghost" className="text-primary underline" onClick={() => navigate('/faculty/create')}>Create one now</Button>
                    </div>
                ) : (
                    quizzes.map(quiz => (
                        <Card key={quiz.id} className="bg-surface border-neutral-300 dark:border-neutral-600 hover:border-primary transition-colors">
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="h-32 w-48 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shrink-0 flex items-center justify-center text-white font-bold text-3xl">
                                        {quiz.title.charAt(0)}
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="text-xl font-bold text-text">{quiz.title}</h3>
                                                <p className="text-sm text-muted">{new Date(quiz.createdAt || (quiz as any).created_at).toLocaleDateString()} â€¢ {quiz.description || 'No description'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <ShareButton
                                                    quizCode={(quiz as any).code || quiz.accessCode}
                                                    quizId={quiz.id}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-text border-neutral-300 dark:border-neutral-600 hover:bg-background"
                                                    onClick={() => navigate(`/faculty/quizzes/${quiz.id}/edit`)}
                                                >
                                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                                </Button>
                                                <Button variant="outline" size="sm" className="text-text border-neutral-300 dark:border-neutral-600 hover:bg-background">
                                                    <BarChart2 className="h-4 w-4 mr-2" /> Analytics
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-4 py-4 border-y border-neutral-300 dark:border-neutral-600">
                                            <div>
                                                <div className="text-2xl font-bold text-text">-</div>
                                                <div className="text-xs text-muted">Participants</div>
                                            </div>
                                            <div>
                                                <div className="flex items-center text-sm text-muted">
                                                    <span className="font-medium text-text mr-2">Duration:</span>
                                                    <span>{quiz.settings?.duration || 60} mins</span>
                                                </div>

                                                {/* Organization Badge */}
                                                {quiz.settings?.allowedDomain && (
                                                    <div className="flex items-center mt-2 px-2 py-1 w-fit rounded-full bg-blue-500/10 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                        <span>Restricted to: {quiz.settings.allowedDomain}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-text">-</div>
                                                <div className="text-xs text-muted">Avg. Score</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">Active</div>
                                                <div className="text-xs text-muted">Status</div>
                                            </div>
                                        </div>
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
