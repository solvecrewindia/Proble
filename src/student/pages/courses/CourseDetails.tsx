import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Star, Clock, BookOpen, ArrowLeft, Check, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../shared/context/AuthContext';

const QuizDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [quiz, setQuiz] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // Rating State
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

                // Auth Check for Master Quizzes
                if (quizData.type === 'master' && !user) {
                    navigate('/login', { state: { from: location }, replace: true });
                    return;
                }

                // Domain Restriction Check
                if (quizData.settings?.allowedDomain && user) {
                    const userEmail = user.email || '';
                    if (!userEmail.endsWith(quizData.settings.allowedDomain)) {
                        alert(`This quiz is restricted to users from ${quizData.settings.allowedDomain} only.`);
                        navigate('/'); // Redirect to home or another page
                        return;
                    }
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


        };

        fetchQuiz();
    }, [id, user]);



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
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-muted hover:text-text transition-colors mb-12 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-medium">Back</span>
                </button>

                {/* Header Section */}
                <div className="flex flex-col md:flex-row gap-8 items-start justify-between mb-16 border-b border-neutral-200 dark:border-neutral-800 pb-12">
                    <div className="space-y-6 max-w-2xl">
                        <div className="space-y-2">
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-text leading-tight text-balance">
                                {quiz.title}
                            </h1>
                            <p className="text-muted text-lg leading-relaxed">
                                {quiz.description || "No description available for this assessment."}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-muted">
                                <Clock className="w-4 h-4" />
                                <span>{quiz.duration}</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-muted">
                                <BookOpen className="w-4 h-4" />
                                <span>{quiz.questions} Questions</span>
                            </div>
                            {quiz.type === 'global' && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-sm font-medium text-yellow-600 dark:text-yellow-500">
                                    <Star className="w-4 h-4 fill-current" />
                                    <span>{averageRating || 0} ({totalRatings})</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!moduleId && (
                        <button
                            onClick={togglePractice}
                            disabled={practiceLoading}
                            className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl shrink-0
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
                                    <span>In My Practice</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    <span>Add to My Practice</span>
                                </>
                            )}
                        </button>
                    )}
                </div>


            </div>
        </div>
    );
};

export default QuizDetails;
