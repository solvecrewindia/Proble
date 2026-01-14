import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../shared/components/Card';
import { Button } from '../../shared/components/Button';
import { useAuth } from '../../shared/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { BookOpen, ArrowRight, Trash2, AlertCircle, ArrowLeft } from 'lucide-react';

const PracticeList = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [practiceItems, setPracticeItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPracticeList = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // Fetch user_practice with module details
                const { data, error } = await supabase
                    .from('user_practice')
                    .select(`
                        id,
                        module_id,
                        quiz_id,
                        modules (
                            id,
                            title,
                            description,
                            image_url,
                            category
                        ),
                        quizzes (
                            id,
                            title,
                            description,
                            type
                        )
                    `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setPracticeItems(data || []);
            } catch (err) {
                console.error('Error fetching practice list:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPracticeList();
    }, [user]);

    const removeFromPractice = async (itemId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (!confirm('Remove from practice list?')) return;

        try {
            const { error } = await supabase
                .from('user_practice')
                .delete()
                .eq('id', itemId);

            if (error) throw error;
            setPracticeItems(prev => prev.filter(item => item.id !== itemId));
        } catch (err) {
            console.error('Error removing item:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/')}
                    className="p-2 -ml-2 rounded-lg hover:bg-surface transition-colors text-muted hover:text-text"
                    title="Back to Home"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-3xl font-bold text-text">My Practice</h1>
                    <p className="text-muted mt-2">Resume your learning journey.</p>
                </div>
            </header>

            {practiceItems.length === 0 ? (
                <div className="text-center py-20 bg-surface/50 rounded-3xl border border-white/5 border-dashed">
                    <div className="w-16 h-16 rounded-2xl bg-surface-highlight flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <BookOpen className="w-8 h-8 text-muted opacity-50" />
                    </div>
                    <h3 className="text-xl font-medium text-text mb-2">No practice items yet</h3>
                    <p className="text-muted mb-6">Explore courses and add them to your practice list.</p>
                    <Button onClick={() => navigate('/')} variant="primary">
                        Explore Courses
                    </Button>
                </div>
            ) : (
                <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
                    {practiceItems.map((item) => {
                        const module = item.modules;
                        const quiz = item.quizzes;

                        // We need either a module or a quiz to display something
                        if (!module && !quiz) return null;

                        // Determine display data based on what exists
                        const displayData = module ? {
                            id: module.id,
                            title: module.title,
                            imageUrl: module.image_url,
                            category: module.category || 'Module',
                            type: 'module',
                            route: `/module/${module.id}`,
                            fallbackName: module.title
                        } : {
                            id: quiz.id,
                            title: quiz.title,
                            imageUrl: null, // Quizzes might not have images, will use fallback
                            category: 'Practice Test',
                            type: 'quiz',
                            route: `/student/practice/${quiz.id}`,
                            fallbackName: quiz.title
                        };

                        return (
                            <div
                                key={item.id}
                                onClick={() => navigate(displayData.route)}
                                className="bg-surface rounded-xl shadow-[0_1px_4px_rgba(16,24,40,0.06)] dark:shadow-none overflow-hidden transition-transform duration-200 hover:-translate-y-1 border border-neutral-300 dark:border-neutral-600 cursor-pointer group relative"
                            >
                                <div className="relative">
                                    <img
                                        src={displayData.imageUrl || `https://ui-avatars.com/api/?name=${displayData.fallbackName}&background=random&size=400`}
                                        alt={displayData.title}
                                        className="w-full h-[150px] object-cover"
                                    />
                                    {/* Delete Button Overlay */}
                                    <button
                                        onClick={(e) => removeFromPractice(item.id, e)}
                                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-red-500 text-white/70 hover:text-white backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remove from practice"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="p-3">
                                    <div className="text-sm font-bold mb-2 line-clamp-2 h-10 text-text">{displayData.title}</div>
                                    <div className="flex justify-between text-xs text-muted items-center">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={`https://ui-avatars.com/api/?name=Faculty&background=random`}
                                                alt="Faculty"
                                                className="w-[26px] h-[26px] rounded-full"
                                            />
                                            <span>Faculty</span>
                                        </div>
                                        <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px] uppercase">
                                            {displayData.category}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default PracticeList;
