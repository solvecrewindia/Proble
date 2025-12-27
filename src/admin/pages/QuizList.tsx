import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Plus, Clock, FileText, ChevronRight, ArrowLeft, Trash2, Search, Folder, Layers } from 'lucide-react';
import { Module } from '../../faculty/types';

const QuizList = () => {
    const { category, moduleId } = useParams();
    const navigate = useNavigate();
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'single' | 'modules'>('single');
    const [currentModule, setCurrentModule] = useState<Module | null>(null);

    const categoryTitle = category ? category.toUpperCase() : (currentModule?.category || 'Global');
    const isModuleSupported = ['NPTEL', 'GATE', 'SRMIST'].includes(categoryTitle);

    useEffect(() => {
        fetchData();
    }, [category, moduleId, viewMode]);

    const fetchData = async () => {
        try {
            setLoading(true);

            if (moduleId) {
                // Fetch specific Module details first
                const { data: moduleData, error: moduleError } = await supabase
                    .from('modules')
                    .select('*')
                    .eq('id', moduleId)
                    .single();

                if (moduleError) throw moduleError;
                setCurrentModule(moduleData);

                // Fetch Quizzes in this module
                const { data: quizData, error: quizError } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('module_id', moduleId);

                if (quizError) throw quizError;
                setQuizzes(quizData || []);
                return;
            }

            if (viewMode === 'modules') {
                // Fetch Modules List
                let query = supabase.from('modules').select('*');
                if (categoryTitle !== 'GLOBAL') {
                    query = query.eq('category', categoryTitle);
                }
                const { data, error } = await query;
                if (error) throw error;
                setModules(data || []);
            } else {
                // Fetch Quizzes (Standalone)
                let query = supabase.from('quizzes').select('*');

                if (categoryTitle === 'GLOBAL') {
                    query = query.eq('type', 'global');
                } else {
                    query = query.contains('settings', { category: categoryTitle });
                }

                query = query.is('module_id', null);

                const { data, error } = await query;
                if (error) throw error;
                setQuizzes(data || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
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

    const handleDeleteModule = async (e: React.MouseEvent, modId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this module? All quizzes inside it will be unlinked or deleted.')) return;

        try {
            const { error } = await supabase.from('modules').delete().eq('id', modId);
            if (error) throw error;
            setModules(modules.filter(m => m.id !== modId));
        } catch (error) {
            console.error('Error deleting module:', error);
            alert('Failed to delete module');
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            if (moduleId) {
                                navigate(`/admin/quizzes/${currentModule?.category || 'GATE'}`);
                            } else {
                                navigate('/admin/quizzes');
                            }
                        }}
                        className="p-3 hover:bg-white/5 rounded-full transition-all duration-200 group border border-transparent hover:border-white/10"
                    >
                        <ArrowLeft className="w-5 h-5 text-text-secondary group-hover:text-white" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
                            {moduleId ? currentModule?.title : `${categoryTitle} Quizzes`}
                        </h1>
                        <p className="text-text-secondary mt-1">
                            {moduleId
                                ? 'Manage quizzes within this module'
                                : `Manage and track ${categoryTitle.toLowerCase()} assessments`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    {/* Toggle for Modules vs Single */}
                    {!moduleId && isModuleSupported && (
                        <div className="flex p-1 bg-surface border border-white/10 rounded-xl">
                            <button
                                onClick={() => setViewMode('modules')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'modules' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-text-secondary hover:text-white'
                                    }`}
                            >
                                Multiple Modules
                            </button>
                            <button
                                onClick={() => setViewMode('single')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === 'single' ? 'bg-primary text-black shadow-lg shadow-primary/20' : 'text-text-secondary hover:text-white'
                                    }`}
                            >
                                Single Module
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            if (!moduleId && viewMode === 'modules') {
                                navigate(`/admin/modules/${category}/create`);
                            } else {
                                const targetCategory = moduleId ? currentModule?.category : category;
                                navigate(`/admin/quizzes/${targetCategory}/create`, {
                                    state: { moduleId: moduleId }
                                });
                            }
                        }}
                        className="btn-primary flex items-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-5 w-5" />
                        <span className="font-semibold">
                            {!moduleId && viewMode === 'modules' ? 'Create Module' : 'Create New Quiz'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-48 bg-white/5 rounded-2xl animate-pulse backdrop-blur-sm border border-white/5" />
                    ))}
                </div>
            ) : !moduleId && viewMode === 'modules' ? (
                modules.length === 0 ? (
                    <div className="text-center py-20 bg-surface/30 backdrop-blur-md rounded-3xl border border-dashed border-white/10">
                        <div className="inline-flex p-4 rounded-full bg-white/5 mb-6">
                            <Layers className="w-8 h-8 text-muted" />
                        </div>
                        <h3 className="text-xl font-medium text-text mb-2">No Modules Found</h3>
                        <p className="text-text-secondary mb-6 max-w-md mx-auto">
                            No modules created yet. Create a folder to group your quizzes.
                        </p>
                        <button
                            onClick={() => navigate(`/admin/modules/${category}/create`)}
                            className="text-primary hover:text-primary-glow font-medium transition-colors"
                        >
                            Create Module &rarr;
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {modules.map((module) => (
                            <div
                                key={module.id}
                                onClick={() => navigate(`/admin/modules/${module.id}`)}
                                className="glass-card group p-6 relative flex flex-col h-full cursor-pointer hover:border-primary/50 transition-colors"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                        <Folder className="w-6 h-6" />
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteModule(e, module.id)}
                                        className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Delete Module"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                {module.image_url && (
                                    <div className="w-full h-32 mb-4 rounded-lg overflow-hidden border border-white/10">
                                        <img src={module.image_url} alt={module.title} className="w-full h-full object-cover" />
                                    </div>
                                )}

                                <h3 className="text-lg font-semibold text-text mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                    {module.title}
                                </h3>

                                <p className="text-text-secondary text-sm mb-6 line-clamp-2 flex-grow">
                                    {module.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center justify-between mt-auto">
                                    <span className="flex items-center text-primary text-sm font-medium group-hover:translate-x-1 transition-transform">
                                        View Contents <ChevronRight className="w-4 h-4 ml-1" />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                quizzes.length === 0 ? (
                    <div className="text-center py-20 bg-surface/30 backdrop-blur-md rounded-3xl border border-dashed border-white/10">
                        <div className="inline-flex p-4 rounded-full bg-white/5 mb-6">
                            <FileText className="w-8 h-8 text-muted" />
                        </div>
                        <h3 className="text-xl font-medium text-text mb-2">No Quizzes Found</h3>
                        <p className="text-text-secondary mb-6 max-w-md mx-auto">
                            {moduleId
                                ? 'This module is empty. Add a quiz to get started.'
                                : 'There are no independent quizzes in this category yet.'}
                        </p>
                        <button
                            onClick={() => {
                                const targetCategory = moduleId ? currentModule?.category : category;
                                navigate(`/admin/quizzes/${targetCategory}/create`, { state: { moduleId } });
                            }}
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
                                onClick={() => {
                                    const targetCat = category || currentModule?.category || quiz.settings?.category || 'global';
                                    navigate(`/admin/quizzes/${targetCat.toLowerCase()}/edit/${quiz.id}`);
                                }}
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
                )
            )}
        </div>
    );
};

export default QuizList;
