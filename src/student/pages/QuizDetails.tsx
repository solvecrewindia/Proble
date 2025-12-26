import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { Star, Clock, BookOpen, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const QuizDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [userRating, setUserRating] = React.useState(0);
    const [quiz, setQuiz] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Mock data for fallback or specific IDs if needed, but primarily use Supabase
    const mockQuizzes: Record<string, any> = {
        '1': {
            id: '1',
            title: 'Programming, Data Structures and Algorithms Using Python',
            description: 'This course introduces the concepts of programming, data structures and algorithms using Python.',
            rating: 4.8,
            totalRatings: 342,
            duration: '120 mins',
            questions: 60,
            difficulty: 'Intermediate',
            author: 'Prof. Madhavan Mukund'
        },
        // ... (keep other mocks if desired, or remove)
    };

    useEffect(() => {
        const fetchQuiz = async () => {
            if (!id) return;

            // Check if it's a mock ID (optional, for demo continuity)
            if (mockQuizzes[id]) {
                setQuiz(mockQuizzes[id]);
                setLoading(false);
                return;
            }

            // Fetch from Supabase
            const { data: quizData, error } = await supabase
                .from('quizzes')
                .select('*')
                .eq('id', id)
                .single();

            if (quizData) {
                // Fetch question count
                const { count } = await supabase
                    .from('questions')
                    .select('*', { count: 'exact', head: true })
                    .eq('quiz_id', id);

                setQuiz({
                    id: quizData.id,
                    title: quizData.title,
                    description: quizData.description,
                    rating: 4.5, // Default/Mock for now
                    totalRatings: 0,
                    duration: (quizData.settings?.duration || 60) + ' mins',
                    questions: count || 0,
                    difficulty: 'Intermediate', // logic or default
                    author: 'Faculty' // or fetch profile
                });
            }
            setLoading(false);
        };

        fetchQuiz();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Loading details...</div>;
    if (!quiz) return <div className="p-10 text-center text-red-500">Quiz not found.</div>;

    return (
        <div className="bg-surface w-full min-h-screen pb-12">
            <div className="max-w-7xl ml-0 px-8 py-6 space-y-8">
                {/* Back Button */}
                <div>
                    <Button
                        variant="ghost"
                        className="gap-2 pl-0 hover:bg-transparent hover:text-primary"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                </div>

                {/* Header Section */}
                <div className="space-y-6">
                    <div>
                        <h1 className="text-4xl font-bold text-text">{quiz.title}</h1>
                        <p className="text-muted mt-3 text-lg leading-relaxed">{quiz.description}</p>
                    </div>

                    {/* Meta Data & Rating Line */}
                    <div className="flex flex-wrap items-center gap-6 pt-2 pb-4">
                        <div className="flex items-center gap-2 text-muted">
                            <Clock className="w-5 h-5" />
                            <span className="font-medium">{quiz.duration}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted">
                            <BookOpen className="w-5 h-5" />
                            <span className="font-medium">{quiz.questions} Questions</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted">
                            <span className="px-3 py-1 rounded-full bg-background border border-border-custom text-xs uppercase tracking-wider font-semibold">
                                {quiz.difficulty}
                            </span>
                        </div>

                        {/* Divider */}
                        <div className="h-4 w-px bg-border-custom hidden sm:block"></div>

                        {/* Rating */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1 bg-yellow-500/10 px-3 py-1 rounded-full">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-semibold text-yellow-700 dark:text-yellow-400">{quiz.rating}</span>
                                <span className="text-xs text-muted">({quiz.totalRatings})</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-sm text-muted mr-2">Rate:</span>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setUserRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-4 h-4 ${star <= userRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Width Separator */}
            <div className="w-full border-b border-border-custom"></div>

            {/* Centered Section: Modules & Actions */}
            <div className="max-w-7xl mx-auto px-8 space-y-8 mt-12">
                {/* Syllabus Section Removed */}

                {/* Action Buttons */}
                <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center pb-12">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full sm:w-48 h-12 text-base shadow-sm border-border-custom"
                        onClick={() => navigate(`/student/practice/setup/${id}`)}
                    >
                        Practice Test
                    </Button>
                    <Button
                        variant="primary"
                        size="lg"
                        className="w-full sm:w-48 h-12 text-base shadow-lg shadow-primary/25"
                        onClick={() => navigate(`/student/test/${id}`)}
                    >
                        Start Assessment
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default QuizDetails;
