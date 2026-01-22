import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Loader2, RotateCw, Lightbulb } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ReferenceCard {
    id: number;
    question: string;
    answer: string;
    type: string;
    options?: any[];
}

const FlashCards = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [questions, setQuestions] = useState<ReferenceCard[]>([]);
    const [title, setTitle] = useState('');

    // State to track which cards are flipped
    const [flippedCards, setFlippedCards] = useState<Record<number, boolean>>({});

    useEffect(() => {
        const fetchContent = async () => {
            if (!id) return;
            try {
                // Fetch Quiz Details
                const { data: quizData } = await supabase
                    .from('quizzes')
                    .select('title')
                    .eq('id', id)
                    .single();

                if (quizData) setTitle(quizData.title);

                // Fetch Questions
                const { data, error } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('quiz_id', id)
                    .limit(10); // Limit to 10 cards as requested

                if (error) throw error;

                if (data) {
                    const processed = data.map((q: any, index: number) => {
                        let answerText = "Answer not available";

                        try {
                            // Determine Correct Answer Text
                            if (q.type === 'msq') {
                                const correctIndices = JSON.parse(q.correct_answer || '[]');
                                const correctOptions = correctIndices.map((i: number) => {
                                    const opt = q.choices[i];
                                    return typeof opt === 'object' ? opt.text : opt;
                                });
                                answerText = correctOptions.join(', ');
                            } else if (q.type === 'range') {
                                const range = JSON.parse(q.correct_answer || '{}');
                                answerText = `${range.min} - ${range.max}`;
                            } else {
                                // Single Choice (MCQ)
                                const correctIndex = Number(q.correct_answer) || 0;
                                const opt = q.choices ? q.choices[correctIndex] : null;
                                if (opt) {
                                    answerText = typeof opt === 'object' ? opt.text : opt;
                                }
                            }
                        } catch (e) {
                            console.error("Error parsing answer", e);
                        }

                        return {
                            id: index,
                            question: q.text,
                            answer: answerText,
                            type: q.type,
                            options: q.choices
                        };
                    });
                    setQuestions(processed);
                }
            } catch (err) {
                console.error("Error fetching flashcards:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, [id]);

    const handleCardClick = (index: number) => {
        setFlippedCards(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="min-h-screen bg-background text-foreground p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">{title}</h1>
                        <p className="text-muted-foreground text-sm">Flashcards • {questions.length} Cards</p>
                    </div>
                </div>

                {/* Grid - 5 columns for "up 5 down 5" layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 perspective-1000">
                    {questions.map((card) => (
                        <div
                            key={card.id}
                            className={cn(
                                "group relative h-80 cursor-pointer perspective-1000",
                                // "perspective" class is essential for 3d flip
                            )}
                            onClick={() => handleCardClick(card.id)}
                        >
                            <div className={cn(
                                "w-full h-full relative transition-all duration-500 transform-style-3d shadow-lg rounded-xl",
                                flippedCards[card.id] ? "rotate-y-180" : ""
                            )}>
                                {/* Front Face (Question) */}
                                <div className="absolute inset-0 backface-hidden bg-surface border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary shrink-0">
                                        <Lightbulb className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 w-full overflow-y-auto no-scrollbar pr-2 flex items-center justify-center">
                                        <h3 className="font-medium text-sm select-none text-text leading-relaxed">
                                            {card.question}
                                        </h3>
                                    </div>
                                    <p className="mt-4 text-[10px] text-muted-foreground uppercase tracking-widest shrink-0 font-bold opacity-70">Tap to reveal</p>
                                </div>

                                {/* Back Face (Answer) */}
                                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-primary/5 border-2 border-primary rounded-xl p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mb-4 shadow-lg shadow-primary/25 shrink-0">
                                        <RotateCw className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 w-full overflow-y-auto no-scrollbar pr-2 flex items-center justify-center">
                                        <h3 className="font-semibold text-sm text-primary select-none leading-relaxed">
                                            {card.answer}
                                        </h3>
                                    </div>
                                    <p className="mt-4 text-[10px] text-primary/60 uppercase tracking-widest shrink-0 font-bold opacity-70">Tap to hide</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <style>{`
                    .perspective-1000 { perspective: 1000px; }
                    .transform-style-3d { transform-style: preserve-3d; }
                    .backface-hidden { backface-visibility: hidden; }
                    .rotate-y-180 { transform: rotateY(180deg); }
                    .no-scrollbar::-webkit-scrollbar { display: none; }
                    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
            </div>
        </div >
    );
};

export default FlashCards;
