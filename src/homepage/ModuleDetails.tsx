import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, AlertCircle, ArrowRight, Activity, Calendar, Star, Check, CheckCircle, Circle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../shared/components/Card';
import { useAuth } from '../shared/context/AuthContext';

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
                setQuizzes(quizList || []);

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

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

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

    const fallbackImage = moduleData ? `https://ui-avatars.com/api/?name=${encodeURIComponent(moduleData.title)}&background=random&size=400` : '';
    const displayImage = imgError || !moduleData?.image_url ? fallbackImage : moduleData.image_url;

    return (
        <div className="min-h-screen bg-background font-sans text-text">
            {/* Hero Section with Blur Effect */}
            <div className="relative overflow-hidden bg-surface-highlight border-b border-gray-200 dark:border-white/5">
                {/* Background Blur */}
                <div
                    className="absolute inset-0 z-0 opacity-30 blur-3xl scale-110 pointer-events-none"
                    style={{
                        backgroundImage: `url(${displayImage})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                    }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20">
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 text-gray-600 hover:text-black dark:text-muted dark:hover:text-white transition-colors mb-8"
                    >
                        <div className="p-2 rounded-full bg-gray-200 group-hover:bg-gray-300 dark:bg-white/5 dark:group-hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="font-medium">Back to Courses</span>
                    </button>

                    <div className="flex flex-col md:flex-row gap-10 items-start">
                        {/* Thumbnail with Glass Effect */}
                        <div className="shrink-0 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl opacity-20 blur group-hover:opacity-40 transition-opacity duration-500" />
                            <div className="relative w-full md:w-[300px] aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white">
                                <img
                                    src={displayImage}
                                    alt={moduleData.title}
                                    className={`w-full h-full ${imgError || !moduleData.image_url ? 'object-cover' : 'object-contain p-4'}`}
                                    onError={() => setImgError(true)}
                                />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
                                        Module
                                    </span>
                                    <span className="h-1 w-1 rounded-full bg-muted/30" />
                                    <span className="text-muted text-sm font-semibold tracking-wide uppercase">
                                        {moduleData.category}
                                    </span>
                                </div>

                                <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-white dark:to-white/70 leading-tight">
                                    {moduleData.title}
                                </h1>

                                <p className="text-lg text-text-secondary max-w-2xl leading-relaxed">
                                    {moduleData.description || "Master the concepts in this comprehensive learning module."}
                                </p>
                            </div>

                            <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-white/5">
                                <div className="flex items-center gap-3 text-muted">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Assessments</p>
                                        <p className="font-bold text-text">{quizzes.length} Tests</p>
                                    </div>
                                </div>

                                {moduleData.category?.toLowerCase() === 'global' && (
                                    <>
                                        <div className="w-px h-10 bg-gray-200 dark:bg-white/5" />
                                        <div className="flex items-center gap-3 text-muted">
                                            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-500">
                                                <Star className="w-5 h-5 fill-yellow-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Your Rating</p>
                                                <div className="flex items-center gap-1">
                                                    <p className="font-bold text-text">4.8</p>
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star key={star} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
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
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-emerald-500/10'
                                        : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
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
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                                    onClick={() => isSelectionMode ? toggleQuizSelection(quiz.id) : navigate(`/course/${quiz.id}`)}
                                    className="group cursor-pointer"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className={`h-full bg-surface border rounded-2xl p-6 transition-all duration-300 relative overflow-hidden ${isSelectionMode && selectedQuizzes.includes(quiz.id)
                                        ? 'border-primary bg-primary/5'
                                        : 'border-white/5 hover:border-primary/30 hover:bg-surface-highlight'
                                        }`}>
                                        {/* Selection Checkbox Overlay */}
                                        {isSelectionMode && (
                                            <div className="absolute top-4 right-4 z-20">
                                                {selectedQuizzes.includes(quiz.id) ? (
                                                    <CheckCircle className="w-6 h-6 text-primary fill-primary/20" />
                                                ) : (
                                                    <Circle className="w-6 h-6 text-muted hover:text-white" />
                                                )}
                                            </div>
                                        )}

                                        {/* Hover Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                        <div className="relative z-10 flex flex-col h-full">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm">
                                                    <BookOpen className="w-6 h-6" />
                                                </div>
                                                {quiz.settings?.duration && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-white/5 text-xs font-medium text-muted">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{quiz.settings.duration} min</span>
                                                    </div>
                                                )}
                                            </div>

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
                                                    <button className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary font-bold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-primary/10 border border-primary/20 hover:border-primary/40">
                                                        Start Practice
                                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                                    </button>
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
