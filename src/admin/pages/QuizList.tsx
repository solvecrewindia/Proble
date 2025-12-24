import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Clock, FileText, ChevronRight, ArrowLeft, Trash2 } from 'lucide-react';

const QuizList = () => {
    const { category } = useParams();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const categoryTitle = category ? category.toUpperCase() : 'Global';

    useEffect(() => {
        fetchQuizzes();
    }, [category]);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            // Fetch quizzes where settings->>category matches. 
            // Note: IF category is 'global', we might use type='global' OR settings->>category='global'
            // For now, assuming we use settings->category for all custom categories.

            let query = supabase.from('quizzes').select('*');

            if (categoryTitle === 'GLOBAL') {
                // For global, maybe fetch type = global
                query = query.eq('type', 'global');
            } else {
                // For others, use the JSONB column
                query = query.contains('settings', { category: categoryTitle });
            }

            const { data, error } = await query;
            if (error) throw error;
            setQuizzes(data || []);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteQuiz = async (e: React.MouseEvent, quizId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this quiz?')) return;

        try {
            const { error } = await supabase.from('quizzes').delete().eq('id', quizId);

            if (error) throw error;

            // Optimistic update or refetch
            setQuizzes(quizzes.filter(q => q.id !== quizId));
        } catch (error) {
            console.error('Error deleting quiz:', error);
            alert('Failed to delete quiz');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/admin/quizzes')} className="p-2 hover:bg-surface rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-text" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text">{categoryTitle} Quizzes</h1>
                    <p className="text-muted text-sm">Manage quizzes for {categoryTitle} module</p>
                </div>
                <div className="ml-auto">
                    <button
                        onClick={() => navigate(`/admin/quizzes/${category}/create`)}
                        className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Create Quiz
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted">Loading quizzes...</div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-20 bg-surface rounded-2xl border border-surface">
                    <div className="block mb-4">
                        <FileText className="w-12 h-12 text-muted mx-auto opacity-50" />
                    </div>
                    <h3 className="text-lg font-medium text-text">No Quizzes Found</h3>
                    <p className="text-muted mb-4">Create your first quiz for this module.</p>
                    <button
                        onClick={() => navigate(`/admin/quizzes/${category}/create`)}
                        className="text-primary hover:underline text-sm font-medium"
                    >
                        Create New Quiz
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((quiz) => (
                        <div key={quiz.id} className="group relative bg-surface border border-surface hover:border-primary/50 rounded-xl p-5 transition-all hover:shadow-md cursor-pointer">
                            <h3 className="font-semibold text-text mb-2 line-clamp-1">{quiz.title}</h3>
                            <button
                                onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                                className="absolute top-2 right-2 p-2 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all bg-surface/80 rounded-full z-10"
                                title="Delete Quiz"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <p className="text-muted text-xs mb-4 line-clamp-2 min-h-[2.5em]">{quiz.description || 'No description provided.'}</p>

                            <div className="flex items-center justify-between text-xs text-muted border-t border-surface/50 pt-3">
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{quiz.settings?.duration || 60} mins</span>
                                </div>
                                <span className="flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    Edit <ChevronRight className="w-3 h-3 ml-1" />
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QuizList;
