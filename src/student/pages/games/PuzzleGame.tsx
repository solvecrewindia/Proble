import React, { useState, useEffect, useRef } from 'react';
import { dailyChallengeService } from '../../services/dailyChallengeService';
import { getDailyContent } from '../../utils/gameUtils';
import { puzzleData } from '../../data/gameData';
import { ArrowLeft, Clock, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/context/AuthContext';
import { savePuzzleScore } from '../../utils/gameState';

const PuzzleGame = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [terms, setTerms] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
    const [solvedPairs, setSolvedPairs] = useState<string[]>([]);
    const [completed, setCompleted] = useState(false);

    // Timer & Scoring
    const [timer, setTimer] = useState(60); // 1 minute
    const [timerActive, setTimerActive] = useState(false);
    const [score, setScore] = useState(0);
    const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);

    // Animation Refs
    const containerRef = useRef<HTMLDivElement>(null);
    const termRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const matchRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [lines, setLines] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

    const calculateLines = () => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newLines: any[] = [];

        solvedPairs.forEach((pairId) => {
            const termEl = termRefs.current.get(pairId);
            const matchEl = matchRefs.current.get(pairId);

            if (termEl && matchEl) {
                const termRect = termEl.getBoundingClientRect();
                const matchRect = matchEl.getBoundingClientRect();

                newLines.push({
                    id: pairId,
                    x1: termRect.right - containerRect.left,
                    y1: termRect.top + termRect.height / 2 - containerRect.top,
                    x2: matchRect.left - containerRect.left,
                    y2: matchRect.top + matchRect.height / 2 - containerRect.top,
                });
            }
        });
        setLines(newLines);
    };

    useEffect(() => {
        // Recalculate anytime solvedPairs changes, or content loads
        // Small delay to ensure DOM is updated
        const timer = setTimeout(calculateLines, 50);
        window.addEventListener('resize', calculateLines);
        return () => {
            window.removeEventListener('resize', calculateLines);
            clearTimeout(timer);
        };
    }, [solvedPairs, terms, matches]);

    useEffect(() => {
        const loadGame = async () => {
            const daily = await dailyChallengeService.getDailyChallenge();
            let sourceData = puzzleData;

            if (daily && daily.puzzle) {
                // Use daily data
                // Ensure formatting matches
                // Daily format might vary, but assuming keys "id", "term", "match" from prompt
                sourceData = daily.puzzle;
            } else {
                // Fallback
                const data = getDailyContent(puzzleData, 5);
                sourceData = data;
            }

            // Format if needed (if using static fallback)
            // But if using daily, prompt requested exact structure {id, term, match}
            // If static fallback, it might need mapping if getDailyContent returns raw or sliced.
            // Actually getDailyContent returns sliced array of original data.
            // Original data: { id, term, match }
            // So structure is compatible.

            // Limit to 5 pairs if daily returns many
            const gamePairs = sourceData.slice(0, 8); // Prompt asked for 8, let's use all 8 or 5. UI fits GRID depending on count.
            // Current UI is grid-cols-2 (Terms | Matches column). 8 pairs = 8 rows. might be long.
            // Let's stick to 5-6 pairs for mobile friendliness, or just use what is given.
            // Prompt said 8. Let's use 8.

            const formattedData = gamePairs.map((item: any) => ({
                id: item.id || Math.random().toString(), // Ensure ID
                term: item.term,
                match: item.match
            }));

            const shuffledTerms = [...formattedData].sort(() => Math.random() - 0.5);
            const shuffledMatches = [...formattedData].sort(() => Math.random() - 0.5);

            setTerms(shuffledTerms);
            setMatches(shuffledMatches);
            setTimerActive(true);
        };
        loadGame();
    }, []);

    // Timer Logic
    useEffect(() => {
        let interval: any = null;
        if (timerActive && timer > 0 && !completed) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (timer === 0 && !completed) {
            finishGame();
        }
        return () => clearInterval(interval);
    }, [timerActive, timer, completed]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleTermClick = (id: string) => {
        if (solvedPairs.includes(id) || completed || timer === 0) return;
        setSelectedTerm(id);
        setWrongAttempt(null);
    };

    const handleMatchClick = (id: string) => {
        if (!selectedTerm || solvedPairs.includes(id) || completed || timer === 0) return;

        if (selectedTerm === id) {
            // Correct
            const newSolved = [...solvedPairs, id];
            setSolvedPairs(newSolved);
            setSelectedTerm(null);
            setScore(prev => prev + 100); // 100 XP per match

            if (newSolved.length === terms.length) {
                finishGame(score + 100); // Pass current score + match points to include penalties
            }
        } else {
            // Wrong
            setScore(prev => Math.max(0, prev - 50)); // Penalty for wrong guess
            setWrongAttempt(id);
            setTimeout(() => {
                setWrongAttempt(null);
                setSelectedTerm(null);
            }, 500);
        }
    };

    const finishGame = (finalScore?: number) => {
        setTimerActive(false);
        setCompleted(true);
        // If finalScore passed (from last match), use it, otherwise use current state
        const s = finalScore !== undefined ? finalScore : score;
        savePuzzleScore(s, user?.id);
    };

    if (completed) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center animate-in zoom-in duration-500 min-h-screen flex flex-col justify-center">
                <div className="bg-surface p-12 rounded-2xl shadow-xl border border-neutral-200 dark:border-neutral-700">
                    <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <Trophy className="w-12 h-12" />
                        <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-bounce">
                            +{score} XP
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold mb-2">
                        {solvedPairs.length === terms.length ? "Puzzle Solved!" : "Time's Up!"}
                    </h2>
                    <p className="text-muted mb-8 text-lg">
                        You matched {solvedPairs.length} pairs.
                    </p>

                    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-6 mb-8">
                        <div className="text-sm font-bold text-muted uppercase mb-1">Total Score</div>
                        <div className="text-3xl font-black text-primary">{score}</div>
                    </div>

                    <button
                        onClick={() => navigate('/student/game')}
                        className="bg-primary text-white px-10 py-4 rounded-full font-bold hover:bg-primary/90 transition-colors w-full md:w-auto"
                    >
                        Back to Game Center
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 min-h-screen flex flex-col">
            <header className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/student/game')}
                    className="flex items-center gap-2 text-muted hover:text-text transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xl font-mono font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-4 py-2 rounded-lg border border-purple-200">
                        <Clock className="w-6 h-6" />
                        {formatTime(timer)}
                    </div>
                    <div className="text-sm font-bold text-muted bg-neutral-100 dark:bg-neutral-800 px-3 py-2 rounded-lg">
                        Score: {score}
                    </div>
                </div>
            </header>

            <div ref={containerRef} className="grid grid-cols-2 gap-8 md:gap-16 flex-1 relative">
                {/* SVG Overlay for Lines */}
                <svg className="absolute inset-0 pointer-events-none w-full h-full z-10 overflow-visible">
                    {lines.map((line) => (
                        <line
                            key={line.id}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="#22c55e"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className="animate-draw-line"
                            style={{ filter: 'drop-shadow(0px 0px 4px rgba(34, 197, 94, 0.5))' }}
                        />
                    ))}
                </svg>
                {/* Terms Column */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-center mb-4 text-muted uppercase tracking-wider">Terms</h3>
                    {terms.map((item) => (
                        <div
                            key={`term-${item.id}`}
                            ref={(el) => {
                                if (el) termRefs.current.set(item.id, el);
                                else termRefs.current.delete(item.id);
                            }}
                            onClick={() => handleTermClick(item.id)}
                            className={`
                                p-4 md:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 font-bold text-center shadow-sm
                                ${solvedPairs.includes(item.id)
                                    ? 'bg-green-50 border-green-500 text-green-700 opacity-50 scale-95'
                                    : selectedTerm === item.id
                                        ? 'bg-purple-50 border-purple-500 text-purple-700 scale-105 shadow-md ring-2 ring-purple-200'
                                        : 'bg-surface border-neutral-200 dark:border-neutral-700 hover:border-purple-300 hover:bg-purple-50/50'
                                }
                            `}
                        >
                            {item.term}
                        </div>
                    ))}
                </div>

                {/* Matches Column */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-center mb-4 text-muted uppercase tracking-wider">Definitions</h3>
                    {matches.map((item) => {
                        const isWrong = wrongAttempt === item.id;
                        return (
                            <div
                                key={`match-${item.id}`}
                                ref={(el) => {
                                    if (el) matchRefs.current.set(item.id, el);
                                    else matchRefs.current.delete(item.id);
                                }}
                                onClick={() => handleMatchClick(item.id)}
                                className={`
                                    p-4 md:p-6 rounded-xl border-2 cursor-pointer transition-all duration-200 text-sm md:text-base text-center flex items-center justify-center min-h-[80px] shadow-sm
                                    ${solvedPairs.includes(item.id)
                                        ? 'bg-green-50 border-green-500 text-green-700 opacity-50 scale-95'
                                        : isWrong
                                            ? 'bg-red-50 border-red-500 text-red-700 animate-shake'
                                            : 'bg-surface border-neutral-200 dark:border-neutral-700 hover:border-purple-300 hover:bg-purple-50/50'
                                    }
                                `}
                            >
                                {item.match}
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.3s ease-in-out;
                }
                @keyframes draw {
                    from { stroke-dasharray: 0, 2000; }
                    to { stroke-dasharray: 2000, 0; }
                }
                .animate-draw-line {
                    animation: draw 0.8s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default PuzzleGame;
