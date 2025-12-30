import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Puzzle, Lock, Clock } from 'lucide-react';
import GameLeaderboard from '../components/GameLeaderboard';
import { isPuzzleLocked, syncScoreToSupabase, getPuzzleState, getFlashCardState } from '../utils/gameState';
import { useAuth } from '../../shared/context/AuthContext';

const StudentGame = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [puzzleLocked, setPuzzleLocked] = useState(false); // New lock state
    const [timeRemaining, setTimeRemaining] = useState('');
    const [flashCardScore, setFlashCardScore] = useState(0);
    const [puzzleScore, setPuzzleScore] = useState(0);

    useEffect(() => {
        // Initial Score Load
        // We defer this slightly or re-run when user changes to ensure we get the right key
        if (user) {
            const flashState = getFlashCardState(user.id);
            setFlashCardScore(flashState.totalScore);
            const puzzleState = getPuzzleState(user.id);
            setPuzzleScore(puzzleState.totalScore);
        } else {
            const flashState = getFlashCardState();
            setFlashCardScore(flashState.totalScore);
            const puzzleState = getPuzzleState();
            setPuzzleScore(puzzleState.totalScore);
        }

        if (user) {
            // Sync Score
            syncScoreToSupabase(user.id);

            // Check Daily Lock
            const isPuzLocked = isPuzzleLocked(user.id);
            setPuzzleLocked(isPuzLocked);

            if (isPuzLocked) {
                startTimer();
            }
        }
    }, [user]);

    const startTimer = () => {
        const updateTimer = () => {
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const diff = tomorrow.getTime() - now.getTime();
            if (diff <= 0) {
                setPuzzleLocked(false);
                return;
            }

            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeRemaining(`${h}h ${m}m ${s}s`);
        };

        updateTimer();
        setInterval(updateTimer, 1000);
    };

    const games = [

        {
            id: 'puzzle',
            title: 'Concept Matching Puzzle',
            description: 'Match related concepts and definitions.',
            icon: Puzzle,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
            path: '/student/game/puzzle',
            score: puzzleScore,
            locked: puzzleLocked // Use new lock state
        },


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
                                </div>
                                <p className="text-muted text-sm">{game.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div >
    );
};

export default StudentGame;
