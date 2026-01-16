import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Check, X, Sparkles, Lightbulb, Moon, Sun, ChevronLeft, ChevronRight, CheckCircle2, Loader2, ZoomIn, BookOpen, BrainCircuit, Target, ListChecks, Calculator as CalculatorIcon } from 'lucide-react';
import { useTheme } from '../../shared/context/ThemeContext';
import { supabase } from '../../lib/supabase';
import { searchVideos, VideoResult } from '../services/videoSearchService';
import { Youtube, PlayCircle } from 'lucide-react';
import { Calculator } from '../../shared/components/Calculator';

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
    const [showCalculator, setShowCalculator] = useState(false);

    // AI Explanation State
    const [aiExplanation, setAiExplanation] = useState<any | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);

    // Video Search State
    const [relatedVideos, setRelatedVideos] = useState<VideoResult[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [videoError, setVideoError] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        setRelatedVideos([]);
    }, [currentQIndex]);

    // Fetch videos when AI explanation provides a topic
    useEffect(() => {
        if (aiExplanation && (aiExplanation.search_query || aiExplanation.title) && relatedVideos.length === 0) {
            setLoadingVideos(true);
            const query = aiExplanation.search_query || aiExplanation.title;
            searchVideos(query)
                .then(({ videos, error }) => {
                    setRelatedVideos(videos);
                    setVideoError(error);
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingVideos(false));
        }
    }, [aiExplanation, relatedVideos.length]);

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
                setFetchError(error.message);
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

    // Reset AI explanation when changing questions
    useEffect(() => {
        setAiExplanation(null);
        setAiError(null);
    }, [currentQIndex]);

    const handleOptionClick = (idx: number) => {
        if (userAnswers.hasOwnProperty(currentQIndex)) return;
        setUserAnswers(prev => ({ ...prev, [currentQIndex]: idx }));

        // Auto-advance if correct
        const q = questions[currentQIndex];
        if (q && idx === q.correct) {
            setTimeout(() => {
                if (currentQIndex < questions.length - 1) {
                    setCurrentQIndex(prev => prev + 1);
                }
            }, 1000); // 1 second delay
        }
    };

    const generateAiExplanation = async () => {
        if (!questions[currentQIndex]) return;

        setIsGeneratingAi(true);
        setAiError(null);

        const q = questions[currentQIndex];

        // Check for images
        const hasQuestionImage = !!q.imageUrl;
        const hasOptionImages = q.options.some((o: any) => typeof o === 'object' && o.image);
        const hasImages = hasQuestionImage || hasOptionImages;

        const model = hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.1-8b-instant';

        let promptText = `
You are an AI explanation engine for a student exam platform.

TASK:
Convert the given MCQ into a short, clear, exam-focused explanation for students.
${hasImages ? "If the question or options are images, READ the content from the images directly to determine the answer and explanation." : ""}

OUTPUT FORMAT:
Return ONLY valid JSON. No extra text before or after.

{
  "title": "",
  "search_query": "",
  "answer": "Option [Letter]: [Exact option text]",
  "justification": "",
  "summary": "",
  "key_points": ["", ""],
  "takeaway": ""
}

STRICT RULES:
- Use very simple language suitable for exams
- Do NOT add new facts or assumptions
- Do NOT change the meaning of the question or options
- Keep everything short and practical
- No emojis
- No markdown
- No quotes inside values unless required
- Do NOT mention the question explicitly in the output

FIELD RULES:
- title: Short topic name (5–7 words)
- search_query: A precise specific phrase to search on YouTube for a tutorial (e.g., 'Integration by Parts Calculus', 'Binary Search Tree logic'). Avoid generic terms.
- answer: Clearly state the correct option
- justification: Why this option is correct (min 50 words)
- summary: What this concept is about (min 150 words)
- key_points:
  - Include formulas, steps, or rules if present
  - Otherwise include 2 key exam points
- takeaway: One-line exam tip or memory aid
- Briefly imply why other options are wrong (no listing)

INPUT:
Question: ${q.question}
Options: ${q.options.map((o: any) => typeof o === 'object' ? o.text : o).join(', ')}
Correct Answer: ${typeof q.options[q.correct] === 'object' ? q.options[q.correct].text : q.options[q.correct]}
`;

        // Construct Content Payload
        let messagesContent: any[] = [{ type: "text", text: promptText }];

        if (hasQuestionImage && q.imageUrl) {
            messagesContent.push({
                type: "image_url",
                image_url: {
                    url: q.imageUrl
                }
            });
        }

        if (hasOptionImages) {
            q.options.forEach((o: any, idx: number) => {
                if (typeof o === 'object' && o.image) {
                    messagesContent.push({
                        type: "text",
                        text: `Option ${idx}:`
                    });
                    messagesContent.push({
                        type: "image_url",
                        image_url: {
                            url: o.image
                        }
                    });
                }
            });
        }

        const messages = hasImages
            ? [{ role: "user", content: messagesContent }]
            : [{ role: "user", content: promptText }];

        try {
            // Try different env var patterns just in case
            const rawApiKey = import.meta.env.VITE_GROQ_API_KEYS || import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEYS;

            if (!rawApiKey) {
                console.error("No API key found in environment variables");
                throw new Error("API Key missing. Please set VITE_GROQ_API_KEYS in .env");
            }

            // Sanitize key: remove whitespace, trailing commas, and quotes
            const apiKey = rawApiKey.trim().replace(/,$/, '').replace(/^["']|["']$/g, '');
            console.log("Using API Key:", apiKey.substring(0, 4) + "..." + apiKey.substring(apiKey.length - 4));

            if (apiKey.length < 10) {
                throw new Error("API Key seems too short. Please check your .env file.");
            }

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || 'Failed to fetch AI explanation');
            }

            const data = await response.json();
            const content = data.choices[0]?.message?.content;

            if (content) {
                try {
                    // Cleanup json markdown if present
                    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                    const json = JSON.parse(cleanContent);
                    setAiExplanation(json);
                } catch (e) {
                    console.error("JSON Parse Error:", e);
                    throw new Error("Failed to parse AI response");
                }
            } else {
                throw new Error("Empty response from AI");
            }

        } catch (err: any) {
            console.error("AI Error:", err);
            setAiError(err.message);
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Auto-generate AI explanation when question is answered INCORRECTLY
    useEffect(() => {
        const isAnswered = userAnswers.hasOwnProperty(currentQIndex);
        if (isAnswered && !aiExplanation && !isGeneratingAi && !aiError) {
            const q = questions[currentQIndex];
            const selectedOpt = userAnswers[currentQIndex];
            // Only generate if wrong answer
            if (q && selectedOpt !== q.correct) {
                generateAiExplanation();
            }
        }
    }, [userAnswers, currentQIndex]);

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
                {fetchError ? (
                    <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6 max-w-md text-center border border-red-200 dark:border-red-800">
                        <p className="font-bold text-sm mb-1">Error Loading Questions</p>
                        <p className="text-xs break-all opacity-90">{fetchError}</p>
                    </div>
                ) : (
                    <p className="text-muted mb-6">Could not load questions for this practice session.</p>
                )}
                <button
                    onClick={() => navigate(`/student/practice/${id}`)}
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
                    <button
                        onClick={() => setShowCalculator(!showCalculator)}
                        className={cn(
                            "p-2 rounded-full transition-colors",
                            showCalculator ? "bg-primary text-white" : "hover:bg-surface text-neutral-600 dark:text-neutral-400"
                        )}
                        title="Calculator"
                    >
                        <CalculatorIcon className="w-5 h-5" />
                    </button>
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-surface transition-colors">
                        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-neutral-600" />}
                    </button>
                    <button
                        onClick={() => navigate(`/student/practice/${id}`)}
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

                                // Default State
                                if (!isAnswered) {
                                    variantClasses = "border-neutral-200 dark:border-neutral-700 bg-surface hover:border-primary/50 hover:bg-neutral-50 dark:hover:bg-white/5 cursor-pointer";
                                } else {
                                    // Evaluation State
                                    if (idx === q.correct) {
                                        // Correct Option (Always Green)
                                        variantClasses = "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400";
                                    } else if (idx === selectedOpt) {
                                        // Wrong Selection (Red)
                                        variantClasses = "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400";
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
                                                    "border-neutral-300 dark:border-neutral-300 dark:border-neutral-600 group-hover:border-primary/60"
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
                                if (currentQIndex === questions.length - 1) navigate(`/student/practice/${id}`);
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

                    {/* Related Videos Section (Moved to Left Column) */}
                    {isAnswered && (aiExplanation || selectedOpt !== q.correct) && (
                        <div className="bg-surface border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                                <Youtube className="w-5 h-5 text-red-600" />
                                <h3 className="font-bold text-sm text-text">Recommended Study Videos</h3>
                            </div>

                            {videoError && (
                                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-400 flex flex-col gap-2">
                                    <div className="flex gap-2 items-start">
                                        <span className="font-bold shrink-0">Note:</span>
                                        <span>Video search issue: {videoError}. Showing examples.</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setVideoError(null);
                                            setLoadingVideos(true);
                                            const query = aiExplanation?.search_query || aiExplanation?.title || "";
                                            if (query) {
                                                searchVideos(query)
                                                    .then(({ videos, error }) => {
                                                        setRelatedVideos(videos);
                                                        setVideoError(error);
                                                    })
                                                    .catch(err => console.error(err))
                                                    .finally(() => setLoadingVideos(false));
                                            }
                                        }}
                                        disabled={loadingVideos}
                                        className="self-start px-3 py-1 bg-amber-100 dark:bg-amber-800/30 hover:bg-amber-200 dark:hover:bg-amber-800/50 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                                    >
                                        {loadingVideos ? 'Retrying...' : 'Retry Connection'}
                                    </button>
                                </div>
                            )}

                            {loadingVideos ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-20 bg-neutral-100 dark:bg-white/5 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : relatedVideos.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {relatedVideos.map((video) => (
                                        <a
                                            key={video.id}
                                            href={`https://www.youtube.com/watch?v=${video.id}${video.relevantTimestampSeconds ? `&t=${video.relevantTimestampSeconds}s` : ''}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                                        >
                                            <div className="relative w-28 h-20 bg-black rounded-md overflow-hidden flex-shrink-0">
                                                <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <PlayCircle className="w-8 h-8 text-white opacity-70 group-hover:opacity-100 dark:drop-shadow-lg" />
                                                </div>
                                                {/* Duration Badge */}
                                                <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[9px] px-1 py-0.5 rounded font-medium">
                                                    {video.duration || '0:00'}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h4 className="text-sm font-bold text-text line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                                    {video.title}
                                                </h4>
                                                <p className="text-[11px] text-muted mt-1 truncate">{video.channelTitle}</p>

                                                <div className="flex items-center gap-2 mt-1">
                                                    {video.viewCount && <span className="text-[10px] text-muted truncate">{video.viewCount}</span>}
                                                    {video.relevantTimestamp && (
                                                        <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 whitespace-nowrap" title={`Starts at ${video.relevantTimestamp}`}>
                                                            {video.relevantTimestamp} • {video.relevantSegment || 'Topic'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted text-xs">
                                    No videos found for this topic.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* --- RIGHT: AI EXPLANATION & VIDEOS --- */}
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
                                <>
                                    {aiExplanation ? (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
                                            {/* Key Info Cards */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg">
                                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Answer</span>
                                                    </div>
                                                    <p className="text-xs font-medium leading-normal">{aiExplanation.answer}</p>
                                                </div>
                                                <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg">
                                                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                                        <Target className="w-3 h-3" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">Topic</span>
                                                    </div>
                                                    <p className="text-xs font-medium leading-normal line-clamp-2">{aiExplanation.title}</p>
                                                </div>
                                            </div>

                                            {/* Summary */}
                                            <div className="prose dark:prose-invert prose-sm max-w-none">
                                                <h4 className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider mb-2">
                                                    <BookOpen className="w-3 h-3" /> Concept Summary
                                                </h4>
                                                <p className="text-sm text-text/80 leading-relaxed bg-neutral-50 dark:bg-white/5 p-3 rounded-lg border border-neutral-100 dark:border-white/5">
                                                    {aiExplanation.summary}
                                                </p>
                                            </div>

                                            {/* Key Points */}
                                            {aiExplanation.key_points && aiExplanation.key_points.length > 0 && (
                                                <div>
                                                    <h4 className="flex items-center gap-2 text-xs font-bold text-muted uppercase tracking-wider mb-2">
                                                        <ListChecks className="w-3 h-3" /> Key Exam Points
                                                    </h4>
                                                    <ul className="space-y-2">
                                                        {aiExplanation.key_points.map((pt: string, i: number) => (
                                                            <li key={i} className="flex gap-2 text-xs text-text/80 p-2 bg-neutral-50 dark:bg-white/5 rounded-md">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                                                                {pt}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {/* Takeaway */}
                                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-3">
                                                <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                                                <div>
                                                    <div className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider mb-0.5">Exam Takeaway</div>
                                                    <p className="text-xs text-text/90 italic">{aiExplanation.takeaway}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 prose dark:prose-invert prose-sm max-w-none text-muted leading-relaxed">
                                                <div dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                            </div>

                                            {/* Generate Button */}
                                            <div className="pt-4 border-t border-dashed border-neutral-200 dark:border-neutral-700">
                                                <button
                                                    onClick={generateAiExplanation}
                                                    disabled={isGeneratingAi}
                                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                                                >
                                                    {isGeneratingAi ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Generating Explanation...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <BrainCircuit className="w-4 h-4" />
                                                            Generate Deep Explanation
                                                        </>
                                                    )}
                                                </button>
                                                {aiError && (
                                                    <p className="text-xs text-red-500 mt-2 text-center bg-red-500/10 p-2 rounded-lg">{aiError}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
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
            {
                zoomedImage && (
                    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200 cursor-zoom-out" onClick={() => setZoomedImage(null)}>
                        <X className="absolute top-6 right-6 w-10 h-10 text-white/70 hover:text-white transition-colors" />
                        <img src={zoomedImage} className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                    </div>
                )
            }
            {/* Calculator Overlay */}
            {showCalculator && <Calculator onClose={() => setShowCalculator(false)} />}
        </div>
    );
};

export default PracticeTest;



