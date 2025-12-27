import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Check, X, Sparkles, Lightbulb, Moon, Sun, ChevronLeft, ChevronRight, CheckCircle2, Loader2, ZoomIn } from 'lucide-react';
import { useTheme } from '../../shared/context/ThemeContext';
import { supabase } from '../../lib/supabase';

const PracticeTest = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // quizId
    const { theme, setTheme } = useTheme();
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            if (!id) return;
            setLoading(true);

            // Fetch questions for the quiz
            const { data, error } = await supabase
                .from('questions')
                .select('*')
                .eq('quiz_id', id);

            if (error) {
                console.error('Error fetching practice questions:', error);
                setLoading(false);
                return;
            }

            if (data && data.length > 0) {
                // Randomize and pick 15
                const shuffled = data.sort(() => 0.5 - Math.random());
                const selected = shuffled.slice(0, 15);

                const mapped = selected.map((q: any, index: number) => {
                    // Normalize choices
                    let methods_choices = q.choices;
                    // If choices is a string (stringified JSON), parse it
                    if (typeof methods_choices === 'string') {
                        try { methods_choices = JSON.parse(methods_choices); } catch (e) { }
                    }

                    // Map options
                    const options = Array.isArray(methods_choices) ? methods_choices.map((c: any) => {
                        if (typeof c === 'string') return { text: c, image: null };
                        return { text: c.text || '', image: c.image || null };
                    }) : [];

                    return {
                        id: index + 1,
                        dbId: q.id,
                        question: q.text || q.question || "No question text",
                        imageUrl: q.image_url ? `${q.image_url}?t=${Date.now()}` : null,
                        options: options,
                        correct: Number(q.correct_answer) || 0,
                        explanation: q.explanation || q.answer_description || "No explanation available for this question."
                    };
                });

                setQuestions(mapped);
            }
            setLoading(false);
        };

        fetchQuestions();
    }, [id]);

    const handleOptionClick = (idx: number) => {
        if (userAnswers.hasOwnProperty(currentQIndex)) return;
        setUserAnswers(prev => ({ ...prev, [currentQIndex]: idx }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-text">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-2 text-lg">Loading Practice Session...</span>
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background text-text p-4">
                <h2 className="text-2xl font-bold mb-4">No Questions Found</h2>
                <p className="text-muted mb-6">Could not load questions for this practice session.</p>
                <button
                    onClick={() => navigate('/student/practice')}
                    className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                    Back to Practice List
                </button>
            </div>
        );
    }

    const q = questions[currentQIndex];
    const isAnswered = userAnswers.hasOwnProperty(currentQIndex);
    const selectedOpt = userAnswers[currentQIndex];

    return (
        <div className="min-h-screen bg-background text-text font-sans selection:bg-primary/20">
            {/* --- HEADER --- */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700 px-6 py-3 flex items-center justify-between transition-all">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
                        <img src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"} alt="Logo" className="h-8 w-auto object-contain rounded-lg group-hover:scale-105 transition-transform" />
                    </div>
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center w-full max-w-md hidden md:flex gap-3">
                    <div className="w-full h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden flex-1">
                        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${(Object.keys(userAnswers).length / questions.length) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-primary tabular-nums">
                        {Math.round((Object.keys(userAnswers).length / questions.length) * 100)}%
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface transition-colors">
                        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-neutral-600" />}
                    </button>
                    <button
                        onClick={() => navigate('/student/practice')}
                        className="px-4 py-1.5 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-dark transition-colors"
                    >
                        Exit
                    </button>
                </div>
            </header>

            {/* --- MAIN LAYOUT --- */}
            <main className="max-w-7xl mx-auto p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 min-h-[calc(100vh-80px)]">

                {/* --- LEFT: QUESTION --- */}
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-xl p-5 md:p-6 shadow-sm flex flex-col gap-4 min-h-[350px]">

                        {/* Question Meta */}
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-muted bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full text-xs">
                                Question {currentQIndex + 1} / {questions.length}
                            </span>
                            <span className="text-muted font-mono text-[10px] uppercase tracking-wider">
                                PRACTICE MODE
                            </span>
                        </div>

                        {/* Question Text */}
                        <div className="prose dark:prose-invert max-w-none">
                            <h2 className="text-lg md:text-xl font-semibold leading-relaxed text-text">
                                {q.question}
                            </h2>
                        </div>

                        {/* Optional Question Image */}
                        {q.imageUrl && q.imageUrl.length > 5 && (
                            <div className="relative group w-fit rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-black/20">
                                <img
                                    src={q.imageUrl}
                                    alt="Question Asset"
                                    className="max-h-[300px] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                                    onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-zoom-in" onClick={() => setZoomedImage(q.imageUrl)}>
                                    <ZoomIn className="text-white w-6 h-6" />
                                </div>
                            </div>
                        )}

                        {/* Options */}
                        <div className="mt-2 flex flex-col gap-2">
                            {q.options.map((opt: any, idx: number) => {
                                const optText = typeof opt === 'object' ? opt.text : opt;
                                const optImg = typeof opt === 'object' ? opt.image : null;

                                let variantClasses = "";
                                let icon = null;

                                // Default State
                                if (!isAnswered) {
                                    variantClasses = "border-neutral-200 dark:border-neutral-700 bg-surface hover:border-primary/50 hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer";
                                } else {
                                    // Evaluation State
                                    if (idx === q.correct) {
                                        // Correct Option (Always Green)
                                        variantClasses = "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400";
                                        icon = <CheckCircle2 className="w-5 h-5 text-green-500" />;
                                    } else if (idx === selectedOpt) {
                                        // Wrong Selection (Red)
                                        variantClasses = "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400";
                                        icon = <X className="w-5 h-5 text-red-500" />;
                                    } else {
                                        // Unselected Other Options (Dimmed)
                                        variantClasses = "border-neutral-200 dark:border-neutral-700 bg-surface opacity-50";
                                    }
                                }

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleOptionClick(idx)}
                                        className={cn(
                                            "group relative p-3 rounded-lg border transition-all duration-200 flex items-center gap-3",
                                            variantClasses
                                        )}
                                    >
                                        {/* Indicator */}
                                        <div className={cn(
                                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors flex-shrink-0",
                                            isAnswered && idx === q.correct ? "border-green-500 bg-green-500" :
                                                isAnswered && idx === selectedOpt ? "border-red-500 bg-red-500" :
                                                    "border-neutral-300 dark:border-neutral-600 group-hover:border-primary/60"
                                        )}>
                                            {isAnswered && idx === q.correct && <Check className="w-3.5 h-3.5 text-white" />}
                                            {isAnswered && idx === selectedOpt && idx !== q.correct && <X className="w-3.5 h-3.5 text-white" />}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="text-sm font-medium">{optText}</div>
                                            {optImg && (
                                                <img
                                                    src={optImg}
                                                    className="mt-2 h-16 rounded-md border border-neutral-200 dark:border-neutral-700 object-contain cursor-zoom-in hover:opacity-90 transition-opacity"
                                                    alt="Option"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setZoomedImage(optImg);
                                                    }}
                                                />
                                            )}
                                        </div>

                                        {/* Right Icon (Check/X) optional reinforcement */}
                                        {isAnswered && (idx === q.correct || (idx === selectedOpt && idx !== q.correct)) && (
                                            <div className="ml-auto">
                                                {idx === q.correct ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-red-500" />}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Navigation Bar */}
                    <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-xl p-3 flex justify-between items-center shadow-sm sticky bottom-4">
                        <button
                            onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentQIndex === 0}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm text-text hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" /> Previous
                        </button>

                        <button
                            onClick={() => {
                                if (currentQIndex === questions.length - 1) navigate('/student/practice');
                                else setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1));
                            }}
                            className={cn(
                                "flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm text-white transition-all shadow-md",
                                currentQIndex === questions.length - 1
                                    ? "bg-black dark:bg-white dark:text-black hover:scale-105"
                                    : "bg-primary hover:bg-primary-dark hover:scale-105 shadow-primary/25"
                            )}
                        >
                            {currentQIndex === questions.length - 1 ? 'Finish Practice' : 'Next'}
                            {currentQIndex !== questions.length - 1 && <ChevronRight className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* --- RIGHT: AI EXPLANATION --- */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 shadow-sm sticky top-20 overflow-hidden relative min-h-[300px] flex flex-col">
                        {/* Ambient Glow */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="flex items-center gap-3 mb-6 relative z-10 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                            </div>
                            <h3 className="font-bold text-sm text-text">AI Explanation</h3>
                        </div>

                        <div className="flex-1 relative z-10">
                            {isAnswered ? (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 prose dark:prose-invert prose-sm max-w-none text-muted leading-relaxed">
                                    <div dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-40 text-center text-muted gap-3 opacity-60">
                                    <Lightbulb className="w-12 h-12" />
                                    <p className="text-xs">Answer the question to unlock the AI explanation.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </main>

            {/* Image Zoom Overlay */}
            {zoomedImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
                    <X className="absolute top-6 right-6 w-10 h-10 text-white/70 hover:text-white transition-colors" />
                    <img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                </div>
            )}
        </div>
    );
};

export default PracticeTest;
