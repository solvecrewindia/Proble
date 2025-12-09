import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Eye, Copy, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Quiz } from '../types';

export default function Master() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ongoing'); // tabs: ongoing, scheduled, completed
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
                .eq('type', 'master') // Master quizzes only
                .order('created_at', { ascending: false });

            if (data) setQuizzes(data as any);
            setLoading(false);
        };

        fetchQuizzes();
    }, []);

    const copyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        alert(`Code copied: ${code}`);
    };

    if (loading) return <div className="p-8 text-center">Loading master tests...</div>;

    return (
        <div className="space-y-6">
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
            <div className="flex gap-4 border-b border-border-custom">
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
                {quizzes.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-border-custom rounded-lg">
                        <p className="text-muted">No master tests found.</p>
                        <Button variant="ghost" className="text-primary underline" onClick={() => navigate('/faculty/create')}>Create one now</Button>
                    </div>
                ) : (
                    quizzes.map(quiz => (
                        <Card key={quiz.id} className="border-l-4 border-l-green-500 bg-surface border-border-custom">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="success" className="animate-pulse">Live Now</Badge>
                                            <span className="text-xs text-muted">Created {new Date(quiz.createdAt || (quiz as any).created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-text">{quiz.title}</h3>
                                        <p className="text-sm text-muted flex items-center gap-2">
                                            Code: <span className="font-mono font-bold text-text bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{quiz.accessCode || (quiz as any).code}</span>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => copyCode(quiz.accessCode || (quiz as any).code || '')}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </p>
                                    </div>
                                    <Button variant="outline">
                                        <Eye className="h-4 w-4 mr-2" /> Monitor Live
                                    </Button>
                                </div>

                                <div className="mt-6 grid grid-cols-4 gap-4">
                                    <div className="bg-background p-3 rounded-lg border border-border-custom">
                                        <div className="text-2xl font-bold text-text">-</div>
                                        <div className="text-xs text-muted">Active Students</div>
                                    </div>
                                    <div className="bg-background p-3 rounded-lg border border-border-custom">
                                        <div className="text-2xl font-bold text-red-500">-</div>
                                        <div className="text-xs text-muted">Flagged Incidents</div>
                                    </div>
                                    <div className="bg-background p-3 rounded-lg border border-border-custom">
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
