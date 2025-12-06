import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useTheme } from '../../shared/context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

const MCQTest = () => {
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
    const [currentQuestion, setCurrentQuestion] = useState(1);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes in seconds

    // Mock Questions
    const questions = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        question: i === 0 ? "The Indian Contract Act 1872 came into force on..." : `Question ${i + 1} text placeholder...`,
        options: ["Option A", "Option B", "Option C", "Option D"]
    }));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}.${secs.toString().padStart(2, '0')} Min`;
    };

    return (
        <div className="min-h-screen bg-[#F7F9FC] dark:bg-background font-sans text-black dark:text-text">
            {/* Header */}
            <header className="bg-white dark:bg-gray-900 px-7 py-3 shadow-[0_1px_4px_rgba(16,24,40,0.06)] flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-bold">Proble</span>
                </div>

                <div className="flex items-center gap-3 w-[260px]">
                    <span className="text-sm font-medium min-w-[40px] text-right">
                        {Math.round((currentQuestion / questions.length) * 100)}%
                    </span>
                    <div className="flex-1 h-2.5 bg-[#DCEBFF] dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#0ebcdb] rounded-full transition-all duration-300"
                            style={{ width: `${(currentQuestion / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-[#F2F2F2] dark:bg-gray-800 rounded-full flex items-center justify-center text-base">
                            ⏱
                        </div>
                        <div>
                            <div className="text-sm font-medium">{formatTime(timeLeft)}</div>
                            <div className="text-xs text-gray-500">Time Left</div>
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
                <h1 className="text-3xl font-semibold mb-6">NPTEL – Session 1 MCQ Test</h1>

                <div className="flex gap-10 items-start">
                    {/* Left Side - Question */}
                    <div className="flex-1">
                        <div className="bg-[#F7F9FC] dark:bg-gray-900 p-10 rounded-none dark:border dark:border-gray-800">
                            <div className="text-[15px] opacity-60 mb-2">Question {currentQuestion}</div>
                            <div className="text-lg font-semibold mb-6 text-black dark:text-gray-100">
                                {questions[currentQuestion - 1].question}
                            </div>

                            <div className="space-y-4">
                                {questions[currentQuestion - 1].options.map((opt, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedOption(idx)}
                                        className={cn(
                                            "bg-[#eeeeee] dark:bg-gray-800 rounded-[14px] p-4 shadow-[0_1px_4px_rgba(16,24,40,0.06)] dark:shadow-none cursor-pointer flex justify-between items-center transition-colors hover:bg-[#e4e4e4] dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100",
                                            selectedOption === idx && "bg-white dark:bg-gray-800 border-2 border-[#0ebcdb] font-semibold"
                                        )}
                                    >
                                        {opt}
                                        <div className={cn(
                                            "w-[18px] h-[18px] border-2 border-[#666] dark:border-gray-400 rounded-full",
                                            selectedOption === idx && "bg-[#0ebcdb] border-white dark:border-gray-800"
                                        )} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 flex gap-4 justify-center">
                            <button
                                className="px-7 py-3 rounded-full bg-[#EAEEF5] dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100 hover:bg-[#dfe4ef] dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                onClick={() => setCurrentQuestion(prev => Math.max(1, prev - 1))}
                                disabled={currentQuestion === 1}
                            >
                                Previous
                            </button>
                            <button
                                className="px-7 py-3 rounded-full bg-[#EAEEF5] dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100 hover:bg-[#dfe4ef] dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                onClick={() => {
                                    setCurrentQuestion(prev => Math.min(questions.length, prev + 1));
                                    setSelectedOption(null);
                                }}
                                disabled={currentQuestion === questions.length}
                            >
                                Next
                            </button>
                            <button
                                className="px-7 py-3 rounded-full bg-black dark:bg-white text-white dark:text-black font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
                                onClick={() => navigate('/student/practice')}
                            >
                                Finish
                            </button>
                        </div>
                    </div>

                    {/* Right Side - Question Grid */}
                    <div className="w-[240px] flex flex-col gap-3">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Questions</h3>
                        <div className="grid grid-cols-5 gap-1.5">
                            {questions.map((q) => (
                                <button
                                    key={q.id}
                                    onClick={() => setCurrentQuestion(q.id)}
                                    className={cn(
                                        "aspect-square rounded-md text-xs font-semibold flex items-center justify-center transition-colors",
                                        currentQuestion === q.id
                                            ? "bg-[#dcdcdc] dark:bg-gray-700 text-black dark:text-gray-100"
                                            : "bg-[#0ebcdb] text-white"
                                    )}
                                >
                                    {q.id}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MCQTest;
