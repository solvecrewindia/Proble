import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Puzzle, Bug, Search, Lock, Clock } from 'lucide-react';
import GameLeaderboard from '../components/GameLeaderboard';
import { getFlashCardState, isFlashCardLocked, getNextUnlockTime, getPuzzleState } from '../utils/gameState';

const StudentGame = () => {
    const navigate = useNavigate();
    const [flashCardLocked, setFlashCardLocked] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState('');
    const [flashCardScore, setFlashCardScore] = useState(0);
    const [puzzleScore, setPuzzleScore] = useState(0);

    // Initial State Check
    useEffect(() => {
        const flashState = getFlashCardState();
        setFlashCardScore(flashState.totalScore);

        const puzzleState = getPuzzleState();
        setPuzzleScore(puzzleState.totalScore);
    }, []);

    const games = [
        {
            id: 'flashcards',
            title: 'Flash Cards',
            description: flashCardLocked
                ? `Next challenge available in: ${timeRemaining}`
                : 'Test your knowledge with quick-fire flash cards.',
            icon: BookOpen,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            path: '/student/game/flashcards',
            locked: flashCardLocked,
            score: flashCardScore
        },
        {
            id: 'puzzle',
            title: 'Concept Matching Puzzle',
            description: 'Match related concepts and definitions.',
            icon: Puzzle,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            path: '/student/game/puzzle',
            score: puzzleScore
        },
        {
            id: 'debugger',
            title: 'Debugger',
            description: 'Find and fix bugs in code snippets.',
            icon: Bug,
            color: 'text-red-500',
            bg: 'bg-red-500/10',
            path: '/student/game/debugger'
        },
        {
            id: 'mistake-finder',
            title: 'Mistake Finder',
            description: 'Identify logical or syntax errors in logic.',
            icon: Search,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            path: '/student/game/mistake-finder'
        }
    ];

    const handleGameClick = (game: any) => {
        if (game.locked) return;
        navigate(game.path);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-text">Game Mode</h1>
            </header>

            <GameLeaderboard />

            <div className="grid grid-cols-1 gap-6">
                {games.map((game) => (
                    <div
                        key={game.id}
                        onClick={() => handleGameClick(game)}
                        className={`
                            relative bg-surface p-6 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-sm transition-all group
                            ${game.locked
                                ? 'opacity-80 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800'
                                : 'hover:border-primary/50 hover:shadow-md cursor-pointer'
                            }
                        `}
                    >
                        {game.locked && (
                            <div className="absolute top-4 right-4 text-muted flex items-center gap-2 text-sm bg-neutral-200 dark:bg-neutral-700 px-3 py-1 rounded-full">
                                <Clock className="w-4 h-4" />
                                {timeRemaining}
                            </div>
                        )}

                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${game.bg} ${game.color} ${!game.locked && 'group-hover:scale-110'} transition-transform duration-300 relative`}>
                                <game.icon className="w-8 h-8" />
                                {game.locked && (
                                    <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center backdrop-blur-[1px]">
                                        <Lock className="w-5 h-5 text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-xl font-bold text-text mb-2">{game.title}</h3>
                                    {game.score !== undefined && (
                                        <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                                            {game.score} XP
                                        </span>
                                    )}
                                </div>
                                <p className="text-muted text-sm">{game.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default StudentGame;
