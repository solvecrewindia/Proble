import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Clock, AlertCircle, ArrowRight, Activity, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Card } from '../shared/components/Card';

const ModuleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [moduleData, setModuleData] = useState<any>(null);
    const [quizzes, setQuizzes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

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

            } catch (err) {
                console.error('Error fetching module details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchModuleData();
    }, [id]);

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

    return (
        <div className="min-h-screen bg-background font-sans text-text">

            {/* Hero Section with Blur Effect */}
            <div className="relative overflow-hidden bg-surface-highlight border-b border-white/5">
                {/* Background Blur */}
                <div
                    className="absolute inset-0 z-0 opacity-30 blur-3xl scale-110 pointer-events-none"
                    style={{
                        backgroundImage: `url(${moduleData.image_url || '/placeholder-course.jpg'})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover',
                    }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />

                <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-20">
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 text-muted hover:text-white transition-colors mb-8"
                    >
                        <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </div>
                        <span className="font-medium">Back to Courses</span>
                    </button>

                    <div className="flex flex-col md:flex-row gap-10 items-start">
                        {/* Thumbnail with Glass Effect - Improved for Logo Visibility */}
                        <div className="shrink-0 relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl opacity-20 blur group-hover:opacity-40 transition-opacity duration-500" />
                            <div className="relative w-full md:w-[300px] aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-white">
                                <img
                                    src={moduleData.image_url}
                                    alt={moduleData.title}
                                    className="w-full h-full object-contain p-4"
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

                                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 leading-tight">
                                    {moduleData.title}
                                </h1>

                                <p className="text-lg text-text-secondary max-w-2xl leading-relaxed">
                                    {moduleData.description || "Master the concepts in this comprehensive learning module."}
                                </p>
                            </div>

                            <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3 text-muted">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Assessments</p>
                                        <p className="font-bold text-text">{quizzes.length} Tests</p>
                                    </div>
                                </div>
                                <div className="w-px h-10 bg-white/5" />
                                <div className="flex items-center gap-3 text-muted">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase tracking-wider font-semibold opacity-70">Level</p>
                                        <p className="font-bold text-text">Intermediate</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-6 py-16">
                <div className="flex items-center justify-between mb-10">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        Included Assessments
                    </h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent ml-8" />
                </div>

                {quizzes.length === 0 ? (
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
                                onClick={() => navigate(`/course/${quiz.id}`)}
                                className="group cursor-pointer"
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                <div className="h-full bg-surface border border-white/5 rounded-2xl p-6 hover:border-primary/30 hover:bg-surface-highlight transition-all duration-300 relative overflow-hidden">
                                    {/* Hover Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">
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

                                        <p className="text-muted text-sm leading-relaxed line-clamp-2 mb-6 flex-1">
                                            {quiz.description || "Test your knowledge with this comprehensive assessment."}
                                        </p>

                                        <div className="flex items-center justify-between pt-6 border-t border-white/5 mt-auto">
                                            <span className="text-xs font-bold text-muted uppercase tracking-wider">
                                                Practice Test
                                            </span>
                                            <button className="flex items-center gap-2 text-sm font-bold text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                                Start Assessment
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModuleDetails;
