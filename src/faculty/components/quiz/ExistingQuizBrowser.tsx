import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Search, Folder, FileText, CheckSquare, Square, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/utils';
import type { Question, Module, Quiz } from '../../types';

interface ExistingQuizBrowserProps {
    onAddQuestions: (questions: Question[]) => void;
}

type ViewState = 'modules' | 'quizzes' | 'questions';

export function ExistingQuizBrowser({ onAddQuestions }: ExistingQuizBrowserProps) {
    const [view, setView] = useState<ViewState>('modules');
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Data States
    const [modules, setModules] = useState<Module[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);

    // Selection States
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

    // Fetch Modules on Mount
    useEffect(() => {
        fetchModules();
    }, []);

    const fetchModules = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('modules')
                .select('*')
                .order('created_at', { ascending: false });
            if (data) setModules(data as any);
        } catch (error) {
            console.error('Error fetching modules:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizzes = async (moduleId: string) => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('quizzes')
                .select('*, questions(count)')
                .eq('module_id', moduleId)
                .order('created_at', { ascending: false });
            if (data) setQuizzes(data as any);
        } catch (error) {
            console.error('Error fetching quizzes:', error);
            // Fallback
            const { data: retry } = await supabase
                .from('quizzes')
                .select('*')
                .eq('module_id', moduleId);
            if (retry) setQuizzes(retry as any);
        } finally {
            setLoading(false);
        }
    };

    // Need to verify table name for questions. Assuming 'questions' based on context but standardizing on 'questions' table.
    // If it's stored in a JSONB column in quizzes, then this will change.
    // But since there is a `questions` type, it's likely a table or a JSON blob. 
    // Given the previous code uses `questions` prop, and `StepQuestions` doesn't show fetch logic, 
    // I will assume for now that questions are stored in a 'questions' table OR I have to fetch the quiz row and read the JSON 'questions' column.
    // Let's check the types again. `Quiz` interface has `questions: Question[]`.
    // This strongly suggests it might be a JSON column `questions` on the `quizzes` table in Supabase, 
    // OR Supabase returns it via join (but types usually reflect response).
    // Let's try fetching the quiz WITH questions column.

    const fetchQuestions = async (quizId: string) => {
        setLoading(true);
        try {
            // First try to fetch from 'questions' table if it exists
            const { data: questionsData, error: questionsError } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', quizId);

            if (!questionsError && questionsData && questionsData.length > 0) {
                const mappedQuestions = questionsData.map((q: any) => {
                    const parsedCorrect = typeof q.correct_answer === 'string' ? (() => { try { return JSON.parse(q.correct_answer) } catch { return q.correct_answer } })() : q.correct_answer;

                    let type = (q.type || 'mcq').toLowerCase();
                    // Detect range type if stored as mcq but has min/max
                    if (type === 'mcq' && parsedCorrect && typeof parsedCorrect === 'object' && 'min' in parsedCorrect) {
                        type = 'range';
                    }

                    return {
                        id: q.id, // Keep DB ID for selection tracking
                        quizId: q.quiz_id,
                        type: type,
                        stem: q.text || q.stem || '',
                        imageUrl: q.image_url,
                        options: typeof q.choices === 'string' ? JSON.parse(q.choices) : (q.choices || q.options || []),
                        correct: parsedCorrect,
                        weight: q.weight || 1
                    };
                });
                setQuestions(mappedQuestions);
            } else {
                // Fallback: check if it's a JSON column on the quiz itself
                const { data: quizData, error: quizError } = await supabase
                    .from('quizzes')
                    .select('questions') // Select the JSON column
                    .eq('id', quizId)
                    .single();

                if (quizData && quizData.questions) {
                    // Ensure it's an array
                    const qArray = Array.isArray(quizData.questions)
                        ? quizData.questions
                        : typeof quizData.questions === 'string'
                            ? JSON.parse(quizData.questions)
                            : [];
                    // Ensure type consistency for JSON blob too
                    const mappedArr = qArray.map((q: any) => ({
                        ...q,
                        id: q.id || uuidv4(), // valid ID if missing
                        type: (q.type || 'mcq').toLowerCase(),
                        stem: q.stem || q.question || '', // Handle varied JSON keys
                        options: q.options || q.choices || []
                    }));
                    setQuestions(mappedArr);
                } else {
                    setQuestions([]);
                }
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleModuleClick = (module: Module) => {
        setSelectedModule(module);
        fetchQuizzes(module.id);
        setView('quizzes');
        setSearchQuery('');
    };

    const handleQuizClick = (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        fetchQuestions(quiz.id);
        setView('questions');
        setSearchQuery('');
        setSelectedQuestionIds(new Set()); // Reset selection when entering a new quiz
    };

    const toggleQuestionSelection = (qId: string) => {
        const newSet = new Set(selectedQuestionIds);
        if (newSet.has(qId)) {
            newSet.delete(qId);
        } else {
            newSet.add(qId);
        }
        setSelectedQuestionIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedQuestionIds.size === filteredQuestions.length) {
            setSelectedQuestionIds(new Set());
        } else {
            const newSet = new Set<string>();
            filteredQuestions.forEach(q => newSet.add(q.id));
            setSelectedQuestionIds(newSet);
        }
    };

    const handleAddSelected = () => {
        const selected = questions.filter(q => selectedQuestionIds.has(q.id));
        const copiedQuestions = selected.map(q => ({
            ...q,
            id: uuidv4(), // Generate new unique ID for the new quiz context
            quizId: '', // Clear old quiz ID
        }));
        onAddQuestions(copiedQuestions);
        // Maybe show success or reset?
        alert(`Added ${selected.length} questions!`);
        setSelectedQuestionIds(new Set());
    };

    // Filters
    const filteredModules = modules.filter(m => (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredQuizzes = quizzes.filter(q => (q.title || '').toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredQuestions = questions.filter(q => (q.stem || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header / Navigation */}
            <div className="flex items-center gap-4 border-b border-neutral-200 dark:border-neutral-700 pb-4">
                {view !== 'modules' && (
                    <Button variant="ghost" size="sm" onClick={() => {
                        if (view === 'questions') setView('quizzes');
                        else if (view === 'quizzes') setView('modules');
                        setSearchQuery('');
                    }}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                )}

                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text">
                        {view === 'modules' ? 'Select Module' :
                            view === 'quizzes' ? `Quizzes in "${selectedModule?.title}"` :
                                `Questions in "${selectedQuiz?.title}"`}
                    </h3>
                </div>

                <div className="relative w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                    <Input
                        placeholder={view === 'questions' ? "Search questions..." : "Search..."}
                        className="pl-9 bg-surface"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
                    <p className="text-muted">Loading...</p>
                </div>
            ) : (
                <>
                    {/* View: MODULES */}
                    {view === 'modules' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredModules.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-muted">No modules found.</div>
                            ) : (
                                filteredModules.map(module => (
                                    <Card
                                        key={module.id}
                                        className="p-4 cursor-pointer hover:border-primary transition-colors group"
                                        onClick={() => handleModuleClick(module)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                                <Folder className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-text group-hover:text-primary transition-colors">{module.title}</h4>
                                                <p className="text-sm text-muted">{module.category}</p>
                                            </div>
                                            <ChevronRight className="ml-auto h-5 w-5 text-muted group-hover:text-primary" />
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* View: QUIZZES */}
                    {view === 'quizzes' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredQuizzes.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-muted">No quizzes found in this module.</div>
                            ) : (
                                filteredQuizzes.map(quiz => (
                                    <Card
                                        key={quiz.id}
                                        className="p-4 cursor-pointer hover:border-primary transition-colors group"
                                        onClick={() => handleQuizClick(quiz)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="h-10 w-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-text group-hover:text-primary transition-colors">{quiz.title}</h4>
                                                <div className="flex gap-2 mt-1">
                                                    <Badge variant="outline" className="text-xs">{quiz.status}</Badge>
                                                    <span className="text-xs text-muted flex items-center">
                                                        {(() => {
                                                            const qs = quiz.questions as any;
                                                            if (Array.isArray(qs) && qs.length > 0 && qs[0].count !== undefined) return qs[0].count;
                                                            if (Array.isArray(qs)) return qs.length;
                                                            return '?';
                                                        })()} Qs
                                                    </span>
                                                </div>
                                            </div>
                                            <ChevronRight className="ml-auto h-5 w-5 text-muted group-hover:text-primary" />
                                        </div>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}

                    {/* View: QUESTIONS */}
                    {view === 'questions' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-medium text-text hover:text-primary">
                                        {selectedQuestionIds.size === filteredQuestions.length && filteredQuestions.length > 0 ? (
                                            <CheckSquare className="h-5 w-5 text-primary" />
                                        ) : (
                                            <Square className="h-5 w-5 text-muted" />
                                        )}
                                        Select All
                                    </button>
                                    <span className="text-sm text-muted">({selectedQuestionIds.size} selected)</span>
                                </div>
                            </div>

                            {filteredQuestions.length === 0 ? (
                                <div className="text-center py-10 text-muted">No questions found in this quiz.</div>
                            ) : (
                                <div className="grid gap-3">
                                    {filteredQuestions.map((q, idx) => {
                                        const isSelected = selectedQuestionIds.has(q.id);
                                        return (
                                            <Card
                                                key={q.id}
                                                className={cn(
                                                    "p-4 cursor-pointer transition-all border-2",
                                                    isSelected ? "border-primary bg-primary/5" : "border-transparent border-neutral-200 dark:border-neutral-700 hover:border-primary/50"
                                                )}
                                                onClick={() => toggleQuestionSelection(q.id)}
                                            >
                                                <div className="flex gap-4">
                                                    <div className="mt-1">
                                                        {isSelected ? (
                                                            <CheckSquare className="h-5 w-5 text-primary" />
                                                        ) : (
                                                            <Square className="h-5 w-5 text-muted" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between">
                                                            <Badge variant="secondary" className="mb-2 text-xs">{q.type.toUpperCase()}</Badge>
                                                            <span className="text-xs text-muted">Pts: {q.weight}</span>
                                                        </div>
                                                        <p className="font-medium text-text">{q.stem}</p>
                                                        {q.options && (
                                                            <div className="mt-2 text-sm text-muted pl-4 border-l-2 border-neutral-300 dark:border-neutral-600">
                                                                {q.options.slice(0, 2).map((opt, i) => (
                                                                    <div key={i} className="truncate">• {typeof opt === 'object' ? (opt as any).text || (opt as any).label : opt}</div>
                                                                ))}
                                                                {q.options.length > 2 && <div className="italic text-xs">+ {q.options.length - 2} more</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Card>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Footer Action */}
                            <div className="sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t border-neutral-200 dark:border-neutral-700 mt-4 flex justify-between items-center shadow-lg rounded-xl">
                                <div className="text-sm font-medium">
                                    {selectedQuestionIds.size} questions ready to add
                                </div>
                                <Button
                                    onClick={handleAddSelected}
                                    disabled={selectedQuestionIds.size === 0}
                                    className="px-8"
                                >
                                    Add Selected
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
