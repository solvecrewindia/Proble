import { useState, useEffect } from 'react';
import { Search, Star, Clock, PlayCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { getAvatarColor } from '../../shared/utils/color';

const CATEGORIES = ['All', 'Technology', 'Mathematics', 'Arts', 'Science', 'Business'];

interface GlobalQuiz {
    id: string;
    title: string;
    instructor: {
        name: string; // resolved from profiles
        avatar: string;
        department: string;
    };
    rating: number;     // placeholder
    participants: number; // placeholder
    category: string;   // from settings.category
    questions: number;
    duration: number;   // from settings.duration
    thumbnail: string;
    type?: string; // 'Test' or 'Module'
    description?: string;
    accessCode?: string;
}

export default function Global() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedQuiz, setSelectedQuiz] = useState<GlobalQuiz | null>(null);
    const [globalQuizzes, setGlobalQuizzes] = useState<GlobalQuiz[]>([]);
    const [loading, setLoading] = useState(true);
    // const [errorMsg, setErrorMsg] = useState(''); // Removed as per instruction

    useEffect(() => {
        const fetchGlobalContent = async () => {
            setLoading(true);
            // setErrorMsg(''); // Removed as per instruction
            try {
                // 1. Fetch Quizzes (Global) without Join
                const { data: quizzes, error: quizError } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('type', 'global');

                if (quizError) throw quizError;

                // 2. Fetch Modules (Global Courses) without Join
                const { data: modules, error: moduleError } = await supabase
                    .from('modules')
                    .select('*')
                    .eq('category', 'Global');

                if (moduleError) throw moduleError;

                // 3. Get all unique creator IDs
                const creatorIds = new Set<string>();
                quizzes?.forEach((q: any) => q.created_by && creatorIds.add(q.created_by));
                modules?.forEach((m: any) => m.created_by && creatorIds.add(m.created_by));

                // 4. Fetch Profiles Manually
                let profilesMap: Record<string, any> = {};
                if (creatorIds.size > 0) {
                    const { data: profiles, error: profilesError } = await supabase
                        .from('profiles')
                        .select('id, username, email, role')
                        .in('id', Array.from(creatorIds));

                    if (!profilesError && profiles) {
                        profiles.forEach((p: any) => {
                            profilesMap[p.id] = p;
                        });
                    }
                }

                let mergedContent: GlobalQuiz[] = [];

                // Map Quizzes
                if (quizzes) {
                    const mappedQuizzes = (quizzes as any[]).map(q => {
                        const settings = q.settings || {};
                        const category = settings.category || 'Technology';
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500'];
                        const randomColor = colors[Math.floor(Math.random() * colors.length)];

                        const profile = profilesMap[q.created_by];

                        return {
                            id: q.id,
                            title: q.title,
                            instructor: {
                                name: profile?.username || 'Unknown Faculty',
                                avatar: (profile?.username?.[0] || 'U').toUpperCase(),
                                department: 'Faculty'
                            },
                            rating: 4.5,
                            participants: 0,
                            category: category,
                            questions: 10,
                            duration: settings.duration || 60,
                            thumbnail: q.image_url ? `url(${q.image_url})` : randomColor,
                            type: 'Test',
                            description: q.description,
                            accessCode: q.code || q.accessCode
                        };
                    });
                    mergedContent = [...mergedContent, ...mappedQuizzes];
                }

                // Map Modules
                if (modules) {
                    const mappedModules = (modules as any[]).map(m => {
                        const profile = profilesMap[m.created_by];
                        return {
                            id: m.id,
                            title: m.title,
                            instructor: {
                                name: profile?.username || 'Unknown Faculty',
                                avatar: (profile?.username?.[0] || 'U').toUpperCase(),
                                department: 'Faculty'
                            },
                            rating: 4.8,
                            participants: 0,
                            category: m.category || 'Global',
                            questions: 0,
                            duration: 0,
                            thumbnail: m.image_url ? `url(${m.image_url})` : 'bg-pink-500',
                            type: 'Module',
                            description: m.description
                        };
                    });
                    mergedContent = [...mergedContent, ...mappedModules];
                }

                setGlobalQuizzes(mergedContent);

            } catch (err: any) {
                console.error('Error fetching global content:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchGlobalContent();
    }, []);

    const filteredQuizzes = globalQuizzes.filter(quiz => {
        const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quiz.instructor.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || quiz.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleCopyLink = async (quiz: GlobalQuiz) => {
        const identifier = quiz.accessCode || quiz.id; // Correct logic for identifier
        const link = `${window.location.origin}/quiz/${identifier}`;
        try {
            await navigator.clipboard.writeText(link);
            alert("Link copied to clipboard!");
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Hero / Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-text">Explore Global Tests By Other Facultys</h1>
                    <p className="text-muted mt-1">Discover assessments from top rated faculty worldwide.</p>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-surface p-4 rounded-xl border border-neutral-300 dark:border-neutral-600 shadow-sm">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted" />
                    <Input
                        placeholder="Search for tests, topics, or instructors..."
                        className="pl-10 border-none bg-background focus:ring-0 text-text placeholder:text-muted"
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
                                : 'bg-background text-muted hover:bg-neutral-200 dark:hover:bg-neutral-800'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Quiz Grid */}
            {loading ? (
                <div className="text-center py-20 text-muted">Loading available tests...</div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="text-center py-20 text-muted">No global tests found matching.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredQuizzes.map((quiz) => (
                        <Card key={quiz.id} className="group hover:shadow-lg transition-all duration-300 border-neutral-300 dark:border-neutral-600 overflow-hidden cursor-pointer bg-surface" onClick={() => setSelectedQuiz(quiz)}>
                            {/* Thumbnail */}
                            <div className={`h-40 w-full ${quiz.thumbnail.startsWith('url') ? 'bg-cover bg-center' : quiz.thumbnail} relative`} style={quiz.thumbnail.startsWith('url') ? { backgroundImage: quiz.thumbnail } : {}}>
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <Badge className="bg-surface/90 text-text backdrop-blur-sm">
                                        {quiz.category}
                                    </Badge>
                                    {(quiz.type === 'Module' || quiz.type === 'Test') && (
                                        <Badge className={`${quiz.type === 'Module' ? 'bg-purple-500' : 'bg-primary'} text-white border-none shadow-sm`}>
                                            {quiz.type}
                                        </Badge>
                                    )}
                                </div>
                            </div>

                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <h3 className="font-bold text-lg text-text line-clamp-2 group-hover:text-primary transition-colors">
                                        {quiz.title}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-white border border-transparent shadow-sm ${getAvatarColor(quiz.instructor.name)}`}>
                                            {quiz.instructor.avatar}
                                        </div>
                                        <span className="text-sm text-muted truncate">{quiz.instructor.name}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm text-muted pt-2 border-t border-neutral-300 dark:border-neutral-600">
                                    <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                                        <span className="font-medium text-text">{quiz.rating}</span>
                                        <span className="text-xs">({quiz.participants})</span>
                                    </div>
                                    {quiz.type === 'Test' && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{quiz.duration}m</span>
                                        </div>
                                    )}
                                    {quiz.type === 'Module' && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs uppercase tracking-wider font-bold text-purple-500">Course</span>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Test Details Modal */}
            {selectedQuiz && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl animate-in fade-in zoom-in-95 duration-200 border border-neutral-300 dark:border-neutral-600">
                        <div className={`h-32 w-full ${selectedQuiz.thumbnail.startsWith('url') ? 'bg-cover bg-center' : selectedQuiz.thumbnail} relative`} style={selectedQuiz.thumbnail.startsWith('url') ? { backgroundImage: selectedQuiz.thumbnail } : {}}>
                            <button
                                onClick={() => setSelectedQuiz(null)}
                                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <Badge variant="secondary" className="mb-2 mr-2">{selectedQuiz.category}</Badge>
                                {selectedQuiz.type && (
                                    <Badge className={`${selectedQuiz.type === 'Module' ? 'bg-purple-500' : 'bg-primary'} text-white border-none`}>
                                        {selectedQuiz.type}
                                    </Badge>
                                )}
                                <h2 className="text-3xl font-bold text-text mt-2">{selectedQuiz.title}</h2>
                                <div className="flex items-center gap-2 mt-3 text-muted">
                                    <span className="font-medium">{selectedQuiz.instructor.name}</span>
                                    <span>•</span>
                                    <span>{selectedQuiz.instructor.department}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-4 border-y border-neutral-300 dark:border-neutral-600">
                                {selectedQuiz.type === 'Test' ? (
                                    <>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-text">{selectedQuiz.questions}</div>
                                            <div className="text-xs text-muted uppercase tracking-wide">Questions</div>
                                        </div>
                                        <div className="text-center border-l border-neutral-300 dark:border-neutral-600">
                                            <div className="text-2xl font-bold text-text">{selectedQuiz.duration}</div>
                                            <div className="text-xs text-muted uppercase tracking-wide">Minutes</div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-text">Course</div>
                                            <div className="text-xs text-muted uppercase tracking-wide">Type</div>
                                        </div>
                                        <div className="text-center border-l border-neutral-300 dark:border-neutral-600">
                                            <div className="text-2xl font-bold text-text">Self-Paced</div>
                                            <div className="text-xs text-muted uppercase tracking-wide">Duration</div>
                                        </div>
                                    </>
                                )}
                                <div className="text-center border-l border-neutral-300 dark:border-neutral-600">
                                    <div className="text-2xl font-bold text-text">{selectedQuiz.rating}</div>
                                    <div className="text-xs text-muted uppercase tracking-wide">Rating</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-text">Description</h3>
                                <p className="text-muted leading-relaxed">
                                    {selectedQuiz.description || (selectedQuiz.type === 'Test'
                                        ? "This assessment covers key concepts and evaluates your understanding of the subject matter. Ensure you are prepared before starting."
                                        : "This module provides a comprehensive learning path including lessons, resources, and assessments to master the topic.")}
                                </p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button className="flex-1 h-12 text-lg gap-2" onClick={() => handleCopyLink(selectedQuiz)}>
                                    <PlayCircle className="h-5 w-5" /> Share {selectedQuiz.type || 'Assessment'}
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
