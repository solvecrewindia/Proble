import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { Star, Clock, BookOpen, ArrowLeft } from 'lucide-react';

const QuizDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [userRating, setUserRating] = React.useState(0);

    // Mock data
    const quizzes: Record<string, any> = {
        '1': {
            id: '1',
            title: 'Programming, Data Structures and Algorithms Using Python',
            description: 'This course introduces the concepts of programming, data structures and algorithms using Python. It covers basic data types, control flow, functions, lists, dictionaries, scaling up to complex data structures like trees and graphs.',
            rating: 4.8,
            totalRatings: 342,
            duration: '120 mins',
            questions: 60,
            difficulty: 'Intermediate',
            author: 'Prof. Madhavan Mukund'
        },
        '2': {
            id: '2',
            title: 'Database Management System',
            description: 'A comprehensive study of Database Management Systems, covering areas like ER models, Relational Algebra, SQL, Normalization, Indexing and Transaction Processing.',
            rating: 4.6,
            totalRatings: 215,
            duration: '90 mins',
            questions: 45,
            difficulty: 'Hard',
            author: 'Prof. Partha Pratim Das'
        },
        '3': {
            id: '3',
            title: 'Operating System Fundamentals',
            description: 'Dive deep into the core of computer systems. Learn about Processes, Threads, Scheduling, Synchronization, Deadlocks, Memory Management and File Systems.',
            rating: 4.7,
            totalRatings: 189,
            duration: '90 mins',
            questions: 50,
            difficulty: 'Hard',
            author: 'Prof. Chester Rebeiro'
        },
        '4': {
            id: '4',
            title: 'Machine Learning by IIT Madras',
            description: 'An introduction to Machine Learning covering Supervised and Unsupervised Learning, Regression, Classification, Clustering, Neural Networks and Deep Learning.',
            rating: 4.9,
            totalRatings: 560,
            duration: '150 mins',
            questions: 75,
            difficulty: 'Expert',
            author: 'Prof. Balaraman Ravindran'
        },
    };

    const quiz = quizzes[id || '1'] || quizzes['1'];

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
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                    <h2 className="text-2xl font-bold text-text">Syllabus & Modules</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { title: 'Section 1: Fundamentals', desc: 'Basic concepts and terminology.' },
                            { title: 'Section 2: Core Logic', desc: 'Deep dive into problem solving.' },
                            { title: 'Section 3: Advanced Topics', desc: 'Complex scenarios and edge cases.' },
                            { title: 'Section 4: Practical Application', desc: 'Real-world examples and case studies.' }
                        ].map((module, idx) => (
                            <div key={idx} className="p-4 rounded-xl border border-border-custom bg-background/50 hover:bg-background transition-colors">
                                <h3 className="font-semibold text-text mb-1">{module.title}</h3>
                                <p className="text-sm text-muted">{module.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

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
                        onClick={() => navigate(`/student/practice/mcq/${id}`)}
                    >
                        Mock Test
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default QuizDetails;
