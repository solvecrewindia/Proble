import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { Star, Clock, BookOpen, ArrowLeft, ArrowRight, Check, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';

const QuizDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [quiz, setQuiz] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Rating State
    const [userRating, setUserRating] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    const [totalRatings, setTotalRatings] = useState(0);

    // Practice State
    const [isAddedToPractice, setIsAddedToPractice] = useState(false);
    const [practiceLoading, setPracticeLoading] = useState(false);
    const [moduleId, setModuleId] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!id) return;
            const { data: quizData } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', id)
                .single();

            if (quizData) {
                const { count } = await supabase
                    .from('questions')
                    .select('*', { count: 'exact', head: true })
                    .eq('quiz_id', id);

                setQuiz({
                    id: quizData.id,
                    title: quizData.title,
                    description: quizData.description,
                    type: quizData.type,
                    duration: (quizData.settings?.duration || 60) + ' mins',
                    questions: count || 0,
                    difficulty: 'Intermediate',
                });

                if (quizData.module_id) {
                    setModuleId(quizData.module_id);
                    checkPracticeStatus(quizData.module_id, quizData.id);
                } else {
                    setModuleId(null);
                    checkPracticeStatus(null, quizData.id);
                }

                if (quizData.type === 'global') {
                    fetchRatings(quizData.id);
                }
            }
            setLoading(false);
        };

        const checkPracticeStatus = async (modId: string | null, quizId: string) => {
            if (!user) return;

            let query = supabase.from('user_practice').select('id').eq('user_id', user.id);

            if (modId) {
                query = query.eq('module_id', modId);
            } else {
                query = query.eq('quiz_id', quizId);
            }

            const { data } = await query.single();
            if (data) setIsAddedToPractice(true);
        };

        const fetchRatings = async (quizId: string) => {
            // Fetch Average
            const { data: ratings } = await supabase
                .from('quiz_ratings')
                .select('rating')
                .eq('quiz_id', quizId);

            if (ratings && ratings.length > 0) {
                const avg = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;
                setAverageRating(Math.round(avg * 10) / 10);
                setTotalRatings(ratings.length);
            }

            // Fetch User Rating
            if (user) {
                const { data: myRating } = await supabase
                    .from('quiz_ratings')
                    .select('rating')
                    .eq('quiz_id', quizId)
                    .eq('user_id', user.id)
                    .single();
                if (myRating) setUserRating(myRating.rating);
            }
        };

        fetchQuiz();
    }, [id, user]);

    const handleRating = async (rating: number) => {
        if (!user || !quiz) return;

        // Optimistic UI
        setUserRating(rating);

        const { error } = await supabase
            .from('quiz_ratings')
            .upsert({
                user_id: user.id,
                quiz_id: quiz.id,
                rating: rating
            }, { onConflict: 'user_id, quiz_id' });

        if (error) {
            console.error('Error submitting rating:', error);
            // Revert on error? For now just log
        } else {
            // Refetch average to keep it sync
            const { data: ratings } = await supabase
                .from('quiz_ratings')
                .select('rating')
                .eq('quiz_id', quiz.id);
            if (ratings && ratings.length > 0) {
                const avg = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;
                setAverageRating(Math.round(avg * 10) / 10);
                setTotalRatings(ratings.length);
            }
        }
    };

    const togglePractice = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (practiceLoading || !quiz) return;

        setPracticeLoading(true);
        try {
            if (isAddedToPractice) {
                let query = supabase.from('user_practice').delete().eq('user_id', user.id);

                if (moduleId) {
                    query = query.eq('module_id', moduleId);
                } else {
                    query = query.eq('quiz_id', quiz.id);
                }

                const { error } = await query;
                if (error) throw error;
                setIsAddedToPractice(false);
            } else {
                const payload: any = { user_id: user.id };
                if (moduleId) {
                    payload.module_id = moduleId;
                } else {
                    payload.quiz_id = quiz.id;
                }

                const { error } = await supabase
                    .from('user_practice')
                    .insert(payload);
                if (error) throw error;
                setIsAddedToPractice(true);
            }
        } catch (err) {
            console.error('Error toggling practice:', err);
        } finally {
            setPracticeLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-background text-text flex items-center justify-center">Loading...</div>;
    if (!quiz) return <div className="min-h-screen bg-background text-text flex items-center justify-center">Quiz not found.</div>;

    return (
        <div className="min-h-screen bg-background text-text font-sans selection:bg-blue-500/30">
            <div className="max-w-6xl mx-auto px-6 pt-8 pb-20">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted hover:text-text transition-colors mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-medium">Back</span>
                </button>

                {/* Header Content */}
                <div className="space-y-4 mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text leading-tight">
                        {quiz.title}
                    </h1>
                    <p className="text-muted text-lg leading-relaxed max-w-3xl">
                        {quiz.description || "No description available for this assessment."}
                    </p>
                </div>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-sm text-muted mb-16 border-b border-neutral-300 dark:border-neutral-600 pb-16">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{quiz.duration}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span>{quiz.questions} Questions</span>
                    </div>

                    {quiz.type === 'global' && (
                        <div className="flex items-center gap-6 ml-2 animate-in fade-in duration-500">
                            <div className="flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-0.5 rounded text-yellow-500 border border-yellow-500/20">
                                <Star className="w-4 h-4 fill-yellow-500" />
                                <span className="font-bold">{averageRating || 0}</span>
                                <span className="text-yellow-500/50 text-xs">({totalRatings})</span>
                            </div>

                            <div className="flex items-center gap-1 group">
                                <span className="text-muted mr-2 text-xs uppercase font-bold tracking-wider group-hover:text-text transition-colors">Rate:</span>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => handleRating(star)}
                                        className="focus:outline-none transition-all hover:scale-110 active:scale-95"
                                    >
                                        <Star
                                            className={`w-4 h-4 ${star <= userRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-800 hover:text-gray-400'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {!moduleId && (
                        <button
                            onClick={togglePractice}
                            disabled={practiceLoading}
                            className={`ml-auto px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl
                                ${isAddedToPractice
                                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25 hover:shadow-primary/40'
                                }`}
                        >
                            {practiceLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : isAddedToPractice ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>Added</span>
                                </>
                            ) : (
                                <>
                                    <span>Add to My Practice</span>
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    {quiz.type !== 'master' && (
                        <button
                            onClick={() => navigate(`/student/practice/setup/${id}`)}
                            className="w-full sm:w-auto min-w-[180px] h-11 px-8 rounded-lg bg-surface text-text border border-neutral-300 dark:border-neutral-600 font-semibold hover:bg-background transition-all active:scale-95 text-sm"
                        >
                            Practice Test
                        </button>
                    )}
                    <button
                        onClick={() => navigate(`/student/test/${id}`)}
                        className="w-full sm:w-auto min-w-[180px] h-11 px-8 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] active:scale-95 text-sm"
                    >
                        Mock Test
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuizDetails;
