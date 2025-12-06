import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Check, X, Sparkles, Lightbulb, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../shared/context/ThemeContext';

const PracticeTest = () => {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

    // Mock Data
    const questions = [
        {
            id: 1,
            question: "The Indian Contract Act 1872 came into force on...",
            options: ["1st September 1872", "1st October 1872", "1st January 1873", "15th August 1872"],
            correct: 0,
            explanation: "The Indian Contract Act, 1872 came into force on <strong>1st September 1872</strong>. It applies to the whole of India. It is one of the oldest mercantile laws in the country."
        },
        {
            id: 2,
            question: "Which of the following is NOT a valid essential of a valid contract?",
            options: ["Offer and Acceptance", "Lawful Consideration", "Impossible Act", "Free Consent"],
            correct: 2,
            explanation: "An agreement to do an act impossible in itself is void (Section 56). Therefore, the possibility of performance is an essential element of a valid contract. An <strong>Impossible Act</strong> cannot form a valid contract."
        },
        {
            id: 3,
            question: "A proposal when accepted becomes a...",
            options: ["Promise", "Contract", "Agreement", "Consideration"],
            correct: 0,
            explanation: "According to Section 2(b) of the Indian Contract Act, 1872, when the person to whom the proposal is made signifies his assent thereto, the proposal is said to be accepted. A proposal, when accepted, becomes a <strong>Promise</strong>."
        },
        {
            id: 4,
            question: "An agreement enforceable by law is a...",
            options: ["Promise", "Contract", "Obligation", "Lawful Promise"],
            correct: 1,
            explanation: "Section 2(h) of the Indian Contract Act, 1872 defines a <strong>Contract</strong> as an agreement enforceable by law."
        },
        {
            id: 5,
            question: "Void Agreement signifies...",
            options: ["Agreement illegal in nature", "Agreement not enforceable by law", "Agreement violating public policy", "Agreement under coercion"],
            correct: 1,
            explanation: "According to Section 2(g), an agreement not enforceable by law is said to be void. It has no legal effect from the very beginning (void ab initio)."
        }
    ];

    const handleOptionClick = (idx: number) => {
        if (userAnswers.hasOwnProperty(currentQIndex)) return;
        setUserAnswers(prev => ({ ...prev, [currentQIndex]: idx }));
    };

    const q = questions[currentQIndex];
    const isAnswered = userAnswers.hasOwnProperty(currentQIndex);
    const selectedOpt = userAnswers[currentQIndex];

    return (
        <div className="min-h-screen bg-[#F7F9FC] dark:bg-background font-sans text-black dark:text-text">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 px-7 py-3 shadow-[0_1px_4px_rgba(16,24,40,0.06)] flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-bold">Proble</span>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 w-[260px]">
                        <span className="text-sm font-medium min-w-[40px] text-right">
                            {Math.round((Object.keys(userAnswers).length / questions.length) * 100)}%
                        </span>
                        <div className="flex-1 h-2.5 bg-[#DCEBFF] dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-[#0ebcdb] rounded-full transition-all duration-300"
                                style={{ width: `${(Object.keys(userAnswers).length / questions.length) * 100}%` }}
                            />
                        </div>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-700" />}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="p-10 max-w-[1400px] mx-auto">
                <h1 className="text-3xl font-semibold mb-6">NPTEL – Session 1 Practice</h1>

                <div className="flex gap-10 items-start">
                    {/* Left Side - Question */}
                    <div className="flex-1">
                        <div className="bg-[#F7F9FC] dark:bg-gray-900 p-10 rounded-[20px] dark:border dark:border-gray-800">
                            <div className="text-[15px] opacity-60 mb-2 uppercase tracking-wide">Question {currentQIndex + 1}</div>
                            <div className="text-xl font-semibold mb-6 leading-relaxed text-[#111827] dark:text-gray-100">
                                {q.question}
                            </div>

                            <div className="space-y-4">
                                {q.options.map((opt, idx) => {
                                    let classes = "bg-white dark:bg-gray-800 shadow-[0_2px_6px_rgba(16,24,40,0.04)] dark:shadow-none rounded-[16px] p-5 flex justify-between items-center cursor-pointer transition-all hover:bg-[#F9FAFB] dark:hover:bg-gray-700 hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)] border-2 border-transparent dark:border-gray-700/50 font-medium text-gray-900 dark:text-gray-100";
                                    let icon = null;

                                    if (isAnswered) {
                                        if (idx === q.correct) {
                                            classes += " border-green-500 bg-green-50 dark:bg-green-900/20";
                                            icon = <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white"><Check className="w-4 h-4" /></div>;
                                        } else if (idx === selectedOpt) {
                                            classes += " border-red-500 bg-red-50 dark:bg-red-900/20";
                                            icon = <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white"><X className="w-4 h-4" /></div>;
                                        }
                                    } else if (idx === selectedOpt) {
                                        classes += " bg-gray-100 dark:bg-gray-700";
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => handleOptionClick(idx)}
                                            className={classes}
                                        >
                                            {opt}
                                            <div className={cn("w-6 h-6 border-2 border-gray-400 rounded-full flex items-center justify-center transition-all", isAnswered && (idx === q.correct || idx === selectedOpt) ? "border-transparent" : "")}>
                                                {icon}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-10 flex gap-4 justify-start">
                            <button
                                className="px-8 py-3 rounded-full bg-white dark:bg-gray-800 shadow-sm dark:shadow-none border border-transparent dark:border-gray-700 font-semibold text-sm text-gray-900 dark:text-gray-100 hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                                disabled={currentQIndex === 0}
                            >
                                Previous
                            </button>
                            <button
                                className="px-8 py-3 rounded-full bg-white dark:bg-gray-800 shadow-sm dark:shadow-none border border-transparent dark:border-gray-700 font-semibold text-sm text-gray-900 dark:text-gray-100 hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                                disabled={currentQIndex === questions.length - 1}
                            >
                                Next
                            </button>
                            <button
                                className="px-8 py-3 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold ml-auto hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                                onClick={() => navigate('/student/practice')}
                            >
                                Finish
                            </button>
                        </div>
                    </div>

                    {/* Right Side - AI Box */}
                    <div className="w-[360px] sticky top-[100px]">
                        <div className="bg-white dark:bg-gray-900 rounded-[24px] p-8 shadow-[0_10px_40px_-10px_rgba(139,92,246,0.15)] dark:shadow-none border border-[rgba(139,92,246,0.1)] dark:border-violet-500/20 relative overflow-hidden min-h-[400px] flex flex-col">
                            {/* Background Glow */}
                            <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-[radial-gradient(circle,rgba(139,92,246,0.1)_0%,rgba(255,255,255,0)_70%)] pointer-events-none z-0" />

                            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-100 relative z-10">
                                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-[14px] flex items-center justify-center shadow-[0_4px_12px_rgba(139,92,246,0.3)]">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <div className="font-bold text-xl text-violet-500 tracking-tight">AI Explanation</div>
                            </div>

                            <div className="flex-1 relative z-10 text-gray-600 dark:text-gray-300 leading-relaxed">
                                {isAnswered ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" dangerouslySetInnerHTML={{ __html: q.explanation }} />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-4 mt-10">
                                        <Lightbulb className="w-16 h-16 text-gray-200" />
                                        <p className="text-[15px] max-w-[200px]">Tap an option to unlock the AI insight.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PracticeTest;
