import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Clock, FileText, ChevronRight, ArrowLeft, Trash2, Search } from 'lucide-react';

const QuizList = () => {
    const { category } = useParams();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter state could be added here for search if needed in future
    // const [searchTerm, setSearchTerm] = useState('');

    const categoryTitle = category ? category.toUpperCase() : 'Global';

    useEffect(() => {
        fetchQuizzes();
    }, [category]);

    const fetchQuizzes = async () => {
        try {
            setLoading(true);
            let query = supabase.from('quizzes').select('*');

            if (categoryTitle === 'GLOBAL') {
                query = query.eq('type', 'global');
            } else {
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
            setQuizzes(quizzes.filter(q => q.id !== quizId));
        } catch (error) {
            console.error('Error deleting quiz:', error);
            alert('Failed to delete quiz');
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/quizzes')}
                        className="p-3 hover:bg-white/5 rounded-full transition-all duration-200 group border border-transparent hover:border-white/10"
                    >
                        <ArrowLeft className="w-5 h-5 text-text-secondary group-hover:text-white" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                            {categoryTitle} Quizzes
                        </h1>
                        <p className="text-text-secondary mt-1">Manage and track {categoryTitle.toLowerCase()} assessments</p>
                    </div>
                </div>

                <button
                    onClick={() => navigate(`/admin/quizzes/${category}/create`)}
                    className="btn-primary flex items-center gap-2 shadow-lg shadow-primary/20"
                >
                    <Plus className="h-5 w-5" />
                    <span className="font-semibold">Create New Quiz</span>
                </button>
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse backdrop-blur-sm border border-white/5" />
                    ))}
                </div>
            ) : quizzes.length === 0 ? (
                <div className="text-center py-20 bg-surface/30 backdrop-blur-md rounded-3xl border border-dashed border-white/10">
                    <div className="inline-flex p-4 rounded-full bg-white/5 mb-6">
                        <FileText className="w-8 h-8 text-muted" />
                    </div>
                    <h3 className="text-xl font-medium text-text mb-2">No Quizzes Found</h3>
                    <p className="text-text-secondary mb-6 max-w-md mx-auto">
                        There are no quizzes in this category yet. Get started by creating your first assessment.
                    </p>
                    <button
                        onClick={() => navigate(`/admin/quizzes/${category}/create`)}
                        className="text-primary hover:text-primary-glow font-medium transition-colors"
                    >
                        Create Now &rarr;
                    </button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {quizzes.map((quiz) => (
                        <div
                            key={quiz.id}
                            onClick={() => navigate(`/admin/quizzes/${category}/edit/${quiz.id}`)}
                            className="glass-card group p-6 relative flex flex-col h-full cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${quiz.settings?.duration > 45
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    }`}>
                                    {quiz.settings?.duration || 60} min
                                </span>

                                <button
                                    onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                                    className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete Quiz"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <h3 className="text-lg font-semibold text-text mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                {quiz.title}
                            </h3>

                            <p className="text-text-secondary text-sm mb-6 line-clamp-2 flex-grow">
                                {quiz.description || 'No description provided for this assessment.'}
                            </p>

                            <div className="flex items-center justify-between mt-auto">
                                <div className="flex items-center gap-2 text-xs text-text-secondary">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Last updated today</span>
                                </div>
                                <span className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                                    Edit <ChevronRight className="w-4 h-4 ml-1" />
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
