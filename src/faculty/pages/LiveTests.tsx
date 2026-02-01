import React, { useState, useEffect } from 'react';
import { Play, Save, CheckCircle, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase'; // Import supabase
import { Card, CardContent } from '../components/ui/Card'; // Import UI components
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import type { Quiz } from '../types';

export default function LiveTests() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'live' | 'saved' | 'completed'>('saved'); // Default to saved as that's where we look first
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(false);

    const tabs = [
        { id: 'live', label: 'Live Tests', icon: Play },
        { id: 'saved', label: 'Saved Tests', icon: Save },
        { id: 'completed', label: 'Completed', icon: CheckCircle },
    ];

    useEffect(() => {
        const fetchQuizzes = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Simple fetch for now, can refine status filtering later
            const { data, error } = await supabase
                .from('quizzes')
                .select('*')
                .eq('created_by', user.id)
                .eq('type', 'live')
                .order('created_at', { ascending: false });

            if (data) setQuizzes(data as any);
            setLoading(false);
        };

        fetchQuizzes();
    }, [activeTab]);

    return (
        <div className="space-y-6">
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
                                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium uppercase">
                                            {quiz.accessCode || 'NO CODE'}
                                        </span>
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
