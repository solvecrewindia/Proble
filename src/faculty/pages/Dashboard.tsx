import React, { useState } from 'react';
import { Search, Star, Users, Clock, Filter, PlayCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';

// Mock Data for Global Quizzes
const MOCK_GLOBAL_QUIZZES = [
    {
        id: '1',
        title: 'Introduction to Computer Science',
        instructor: {
            name: 'Dr. Sarah Smith',
            avatar: 'S',
            department: 'Computer Science'
        },
        rating: 4.8,
        participants: 1250,
        category: 'Technology',
        questions: 50,
        duration: 60,
        thumbnail: 'bg-blue-500'
    },
    {
        id: '2',
        title: 'Advanced Calculus II',
        instructor: {
            name: 'Prof. John Doe',
            avatar: 'J',
            department: 'Mathematics'
        },
        rating: 4.5,
        participants: 850,
        category: 'Mathematics',
        questions: 30,
        duration: 90,
        thumbnail: 'bg-green-500'
    },
    {
        id: '3',
        title: 'Modern Art History',
        instructor: {
            name: 'Emily White',
            avatar: 'E',
            department: 'Arts'
        },
        rating: 4.9,
        participants: 2100,
        category: 'Arts',
        questions: 40,
        duration: 45,
        thumbnail: 'bg-purple-500'
    },
    {
        id: '4',
        title: 'Physics for Engineers',
        instructor: {
            name: 'Dr. Alan Grant',
            avatar: 'A',
            department: 'Physics'
        },
        rating: 4.6,
        participants: 1500,
        category: 'Science',
        questions: 60,
        duration: 120,
        thumbnail: 'bg-orange-500'
    },
];

const CATEGORIES = ['All', 'Technology', 'Mathematics', 'Arts', 'Science', 'Business'];

export default function Dashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedQuiz, setSelectedQuiz] = useState<any>(null);

    const filteredQuizzes = MOCK_GLOBAL_QUIZZES.filter(quiz => {
        const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quiz.instructor.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || quiz.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-8">
            {/* Hero / Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Explore Global Tests By Other Facultys</h1>
                    <p className="text-neutral-500 mt-1">Discover assessments from top rated faculty worldwide.</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-neutral-200 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
                    <Input
                        placeholder="Search for tests, topics, or instructors..."
                        className="pl-10 border-none bg-neutral-50 focus:ring-0"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-primary text-white'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quiz Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredQuizzes.map((quiz) => (
                    <Card key={quiz.id} className="group hover:shadow-lg transition-all duration-300 border-neutral-200 overflow-hidden cursor-pointer" onClick={() => setSelectedQuiz(quiz)}>
                        {/* Thumbnail */}
                        <div className={`h-40 w-full ${quiz.thumbnail} relative`}>
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                            <Badge className="absolute top-3 right-3 bg-white/90 text-neutral-900 backdrop-blur-sm">
                                {quiz.category}
                            </Badge>
                        </div>

                        <CardContent className="p-4 space-y-4">
                            <div>
                                <h3 className="font-bold text-lg text-neutral-900 line-clamp-2 group-hover:text-primary transition-colors">
                                    {quiz.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600">
                                        {quiz.instructor.avatar}
                                    </div>
                                    <span className="text-sm text-neutral-600 truncate">{quiz.instructor.name}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm text-neutral-500 pt-2 border-t border-neutral-100">
                                <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                    <span className="font-medium text-neutral-900">{quiz.rating}</span>
                                    <span className="text-xs">({quiz.participants})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{quiz.duration}m</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Test Details Modal */}
            {selectedQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className={`h-32 w-full ${selectedQuiz.thumbnail} relative`}>
                            <button
                                onClick={() => setSelectedQuiz(null)}
                                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <Badge variant="secondary" className="mb-2">{selectedQuiz.category}</Badge>
                                <h2 className="text-3xl font-bold text-neutral-900">{selectedQuiz.title}</h2>
                                <div className="flex items-center gap-2 mt-3 text-neutral-600">
                                    <span className="font-medium">{selectedQuiz.instructor.name}</span>
                                    <span>•</span>
                                    <span>{selectedQuiz.instructor.department}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-4 border-y border-neutral-100">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-neutral-900">{selectedQuiz.questions}</div>
                                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Questions</div>
                                </div>
                                <div className="text-center border-l border-neutral-100">
                                    <div className="text-2xl font-bold text-neutral-900">{selectedQuiz.duration}</div>
                                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Minutes</div>
                                </div>
                                <div className="text-center border-l border-neutral-100">
                                    <div className="text-2xl font-bold text-neutral-900">{selectedQuiz.rating}</div>
                                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Rating</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg">Instructions & Rules</h3>
                                <ul className="space-y-2 text-sm text-neutral-600">
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-400 shrink-0" />
                                        You cannot exit full-screen mode once the exam starts.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-400 shrink-0" />
                                        Tab switching is monitored and will be flagged as malpractice.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-400 shrink-0" />
                                        Ensure you have a stable internet connection.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-neutral-400 shrink-0" />
                                        Malpractice will lead to immediate disqualification.
                                    </li>
                                </ul>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button className="flex-1 h-12 text-lg gap-2" onClick={() => alert('Starting quiz...')}>
                                    <PlayCircle className="h-5 w-5" /> Start Assessment
                                </Button>
                                <Button variant="outline" className="h-12 px-6" onClick={() => setSelectedQuiz(null)}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
