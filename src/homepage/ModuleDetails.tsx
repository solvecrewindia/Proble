import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, AlertCircle, ArrowRight, Activity, Star, Check, CheckCircle, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../shared/context/AuthContext';
import FullScreenLoader from '../shared/components/FullScreenLoader';

const ModuleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [moduleData, setModuleData] = useState<any>(null);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuizzes, setSelectedQuizzes] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isAddedToPractice, setIsAddedToPractice] = useState(false);
    const [practiceLoading, setPracticeLoading] = useState(false);
    const [imgError, setImgError] = useState(false);
    const [completedQuizzes, setCompletedQuizzes] = useState<string[]>([]);

    useEffect(() => {
        const fetchModuleData = async () => {
            if (!id) return;
            setLoading(true);

            try {
                // 1. Fetch Module Details
                const { data: mod, error: modError } = await supabase
                    .from('modules')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (modError) throw modError;
                setModuleData(mod);

                // 2. Fetch Linked Quizzes
                const { data: quizList, error: quizError } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('module_id', id)
                    .eq('status', 'active'); // Only show active quizzes

                if (quizError) throw quizError;

                // Sort quizzes numerically by title (e.g. Week 1, Week 2, ..., Week 10)
                const sortedQuizzes = (quizList || []).sort((a, b) => {
                    const titleA = a.title || '';
                    const titleB = b.title || '';
                    return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' });
                });

                setQuizzes(sortedQuizzes);

                // Fetch completed quizzes for the current user
                if (sortedQuizzes.length > 0) {
                    const quizIds = sortedQuizzes.map(q => q.id);
                    const { data: resultsData } = await supabase
                        .from('quiz_results')
                        .select('student_id, quiz_id')
                        .in('quiz_id', quizIds);
                    
                    if (resultsData) {
                        if (user) {
                            const userCompleted = resultsData.filter(r => r.student_id === user.id).map(r => r.quiz_id);
                            setCompletedQuizzes(userCompleted);
                        }
                    }
                }

                // 3. Check if added to practice
                if (user) {
                    const { data: practiceData } = await supabase
                        .from('user_practice')
                        .select('*')
                        .eq('user_id', user.id)
                        .eq('module_id', id)
                        .single();

                    if (practiceData) setIsAddedToPractice(true);
                }

            } catch (err) {
                console.error('Error fetching module details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchModuleData();
    }, [id, user]);

    const togglePractice = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (practiceLoading) return;

        try {
            setPracticeLoading(true);
            if (isAddedToPractice) {
                // Remove
                const { error } = await supabase
                    .from('user_practice')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('module_id', id);

                if (error) throw error;
                setIsAddedToPractice(false);
            } else {
                // Add
                const { error } = await supabase
                    .from('user_practice')
                    .insert({
                        user_id: user.id,
                        module_id: id
                    });

                if (error) throw error;
                setIsAddedToPractice(true);
            }
        } catch (err) {
            console.error('Error toggling practice:', err);
        } finally {
            setPracticeLoading(false);
        }
    };

    const toggleQuizSelection = (quizId: string) => {
        setSelectedQuizzes(prev => {
            if (prev.includes(quizId)) return prev.filter(id => id !== quizId);
            return [...prev, quizId];
        });
    };

    const handleStartCombinedTest = () => {
        if (selectedQuizzes.length === 0) return;
        navigate(`/student/test/combined?ids=${selectedQuizzes.join(',')}`);
    };

    if (loading) return <FullScreenLoader />;

    if (!moduleData) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-text">Module not found</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 text-primary hover:underline"
                >
                    Go Back
                </button>
            </div>
        </div>
    );

    const fallbackImage = moduleData ? `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230097b2"/><stop offset="100%" stop-color="%23a855f7"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23g)"/><text x="50%" y="50%" font-family="sans-serif" font-size="120" fill="white" font-weight="bold" dominant-baseline="middle" text-anchor="middle">${encodeURIComponent(moduleData.title.charAt(0).toUpperCase())}</text></svg>` : '';
    const displayImage = imgError || !moduleData?.image_url ? fallbackImage : moduleData.image_url;

    return (
        <div className="min-h-screen bg-background font-sans text-text">
            {/* Hero Section matching Home Page */}
            <div className="relative py-12 md:py-16 px-5 text-white overflow-hidden">
                {/* Abstract Background */}
                <div className="absolute inset-0 bg-primary z-0"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary-600 via-primary to-[#00d4ff] opacity-80 z-0"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/20 rounded-full blur-3xl z-0"></div>
                <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-2xl z-0"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-8"
                    >
                        <div className="p-2 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="font-medium">Back to Courses</span>
                    </button>

                    <div className="flex flex-col md:flex-row gap-10 items-start">
                        {/* Content */}
                        <div className="flex-1 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-lg bg-white/20 text-white border border-white/30 text-xs font-bold uppercase tracking-wider shadow-glass">
                                        Module
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-white/50" />
                                    <span className="text-white/90 text-sm font-semibold tracking-wide uppercase">
                                        {moduleData.category}
                                    </span>
                                </div>

                                <h1 className="text-4xl md:text-5xl font-display font-bold text-white leading-tight tracking-tight">
                                    {moduleData.title}
                                </h1>

                                <p className="text-lg text-white/90 max-w-2xl leading-relaxed">
                                    {moduleData.description || "Master the concepts in this comprehensive learning module."}
                                </p>
                            </div>

                            <div className="flex items-center gap-6 pt-6 border-t border-white/20">
                                <div className="flex items-center gap-3 text-white/90">
                                    <div className="p-2 rounded-lg bg-white/20 text-white shadow-glass">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider font-semibold opacity-80">Assessments</p>
                                        <p className="font-bold text-white">{quizzes.length} Tests</p>
                                    </div>
                                </div>

                                {moduleData.category?.toLowerCase() === 'global' && (
                                    <>
                                        <div className="w-px h-10 bg-white/20" />
                                        <div className="flex items-center gap-3 text-white/90">
                                            <div className="p-2 rounded-lg bg-white/20 text-white shadow-glass">
                                                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider font-semibold opacity-80">Your Rating</p>
                                                <div className="flex items-center gap-1">
                                                    <p className="font-bold text-white">4.8</p>
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star key={star} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={togglePractice}
                                    disabled={practiceLoading}
                                    className={`ml-auto px-6 py-3 font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isAddedToPractice
                                        ? 'bg-white/20 text-white border border-white/30 shadow-glass'
                                        : 'bg-white text-primary hover:bg-gray-50 shadow-xl'
                                        }`}
                                >
                                    {isAddedToPractice ? (
                                        <>
                                            <span>Added to Practice</span>
                                            <Check className="w-5 h-5" />
                                        </>
                                    ) : (
                                        <>
                                            <span>Add to My Practice</span>
                                            {practiceLoading ? (
                                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            ) : (
                                                <ArrowRight className="w-5 h-5" />
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            < div className="max-w-7xl mx-auto px-6 py-16" >
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-3xl font-bold text-black dark:bg-clip-text dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:to-white/60">
                        Included Assessments
                    </h2>

                    <div className="flex items-center gap-4">
                        {isSelectionMode && selectedQuizzes.length > 0 && (
                            <button
                                onClick={handleStartCombinedTest}
                                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/25 flex items-center gap-2 animate-in fade-in zoom-in"
                            >
                                <Activity className="w-4 h-4" />
                                Start Combined ({selectedQuizzes.length})
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedQuizzes([]);
                            }}
                            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${isSelectionMode
                                ? 'bg-primary/10 text-primary border-primary/20 dark:bg-white/10 dark:text-white dark:border-white/20'
                                : 'text-black border-transparent hover:bg-black/5 dark:text-muted dark:hover:bg-white/5'
                                }`}
                        >
                            {isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
                        </button>
                    </div>
                </div>

                {
                    quizzes.length === 0 ? (
                        <div className="text-center py-20 bg-surface/50 rounded-3xl border border-white/5 border-dashed">
                            <div className="w-16 h-16 rounded-2xl bg-surface-highlight flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <BookOpen className="w-8 h-8 text-muted opacity-50" />
                            </div>
                            <h3 className="text-xl font-medium text-text mb-2">No assessments yet</h3>
                            <p className="text-muted">Check back later for new content in this module.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {quizzes.map((quiz, index) => (
                                <div
                                    key={quiz.id}
                                    onClick={() => {
                                        if (isSelectionMode) {
                                            toggleQuizSelection(quiz.id);
                                            return;
                                        }
                                        navigate(`/course/details/${quiz.id}`);
                                    }}
                                    className="group cursor-pointer"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className={`h-full bg-surface border rounded-2xl flex flex-col transition-all duration-300 relative overflow-hidden ${isSelectionMode && selectedQuizzes.includes(quiz.id)
                                        ? 'border-primary bg-primary/5'
                                        : 'border-white/5 hover:border-primary/30 hover:bg-surface-highlight'
                                        }`}>
                                        
                                        {/* Image / Placeholder Area */}
                                        <div className="relative w-full h-[60px] overflow-hidden bg-neutral-100 dark:bg-neutral-900 shrink-0">
                                            <div className="w-full h-full bg-primary/5 dark:bg-primary/10 text-primary flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-500">
                                                {/* Subtle dotted pattern for premium feel */}
                                                <div className="absolute inset-0 opacity-[0.15] dark:opacity-[0.2]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>
                                            </div>

                                            {/* Duration Badge */}
                                            {quiz.settings?.duration && (
                                                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white shadow-sm">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{quiz.settings.duration} min</span>
                                                </div>
                                            )}

                                            {/* Selection Checkbox Overlay */}
                                            {isSelectionMode && (
                                                <div className="absolute top-3 left-3 z-20">
                                                    {selectedQuizzes.includes(quiz.id) ? (
                                                        <CheckCircle className="w-6 h-6 text-primary fill-primary/20 bg-black/50 rounded-full" />
                                                    ) : (
                                                        <Circle className="w-6 h-6 text-white/70 hover:text-white bg-black/20 rounded-full" />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Hover Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                        <div className="relative z-10 flex flex-col flex-1 p-5 pt-4">

                                            <h3 className="text-xl font-bold text-text mb-3 group-hover:text-primary transition-colors line-clamp-2">
                                                {quiz.title}
                                            </h3>

                                            {moduleData.category?.toLowerCase() === 'global' && (
                                                <div className="flex items-center gap-1 mb-3">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <Star key={star} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                                    ))}
                                                    <span className="text-xs text-muted ml-1">(4.8)</span>
                                                </div>
                                            )}

                                            <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-6 flex-1">
                                                {quiz.description || "Test your knowledge with this comprehensive assessment."}
                                            </p>

                                            {!isSelectionMode && (
                                                <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                                                    {moduleData?.title?.toLowerCase().includes('placement race') && completedQuizzes.includes(quiz.id) ? (
                                                        <button className="flex-1 bg-green-500/10 hover:bg-green-500/20 text-green-500 font-bold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-green-500/20 group-hover:shadow-lg group-hover:shadow-green-500/10">
                                                            <CheckCircle className="w-4 h-4" /> Already Done!
                                                        </button>
                                                    ) : (
                                                        <button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-primary/10 border border-primary/20 hover:border-primary/40">
                                                            {moduleData?.title?.toLowerCase().includes('placement race') ? 'Take Mock Test' : 'Start Practice'}
                                                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div >
        </div >
    );
};

export default ModuleDetails;
