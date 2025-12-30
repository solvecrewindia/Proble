import React, { useState, useEffect } from 'react';
import { dailyChallengeService } from '../../services/dailyChallengeService';

import { getDailyContent } from '../../utils/gameUtils';
import { mistakeFinderData } from '../../data/gameData';
import { ArrowLeft, Search, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MistakeFinderGame = () => {
    const navigate = useNavigate();
    const [scenarios, setScenarios] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [reveal, setReveal] = useState(false);
    const [completed, setCompleted] = useState(false);

    useEffect(() => {
        const loadGame = async () => {
            const daily = await dailyChallengeService.getDailyChallenge();
            if (daily && daily.mistakeFinder) {
                setScenarios(daily.mistakeFinder);
            } else {
                const gameData = getDailyContent(mistakeFinderData, 3);
                setScenarios(gameData);
            }
        };
        loadGame();
    }, []);

    const handleReveal = () => {
        setReveal(true);
    };

    const handleNext = () => {
        if (currentIndex < scenarios.length - 1) {
            setReveal(false);
            setCurrentIndex(prev => prev + 1);
        } else {
            setCompleted(true);
        }
    };

    if (scenarios.length === 0) return <div className="p-8 text-center">Loading Daily Logic...</div>;

    if (completed) {
        return (
            <div className="max-w-2xl mx-auto p-8 text-center animate-in zoom-in duration-500">
                <div className="bg-surface p-12 rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-700">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4">You Spotted Them All!</h2>
                    <p className="text-muted mb-8">Excellent critical thinking. You're getting better at catching logic errors.</p>
                    <button
                        onClick={() => navigate('/student/game')}
                        className="bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
                    >
                        Back to Games
                    </button>
                </div>
            </div>
        );
    }

    const currentItem = scenarios[currentIndex];

    return (
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/student/game')}
                    className="flex items-center gap-2 text-muted hover:text-text transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    Back
                </button>
                <div className="text-sm font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-full border border-amber-200">
                    Scenario {currentIndex + 1} / {scenarios.length}
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-surface p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-2">The Goal</h3>
                        <p className="text-lg text-text font-medium">{currentItem.scenario}</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-muted uppercase tracking-wider mb-2">The Code / Logic</h3>
                        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg font-mono text-sm md:text-base border-l-4 border-amber-500">
                            {currentItem.code}
                        </div>
                    </div>
                </div>

                {!reveal ? (
                    <div className="flex justify-center">
                        <button
                            onClick={handleReveal}
                            className="bg-amber-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-amber-600 transition-colors shadow-lg hover:shadow-amber-500/20 flex items-center gap-2"
                        >
                            <Search className="w-5 h-5" />
                            Reveal Mistake
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 p-6 rounded-xl mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="font-bold text-red-800 dark:text-red-300 mb-1">The Mistake:</h4>
                                    <p className="text-red-700 dark:text-red-200 text-lg">{currentItem.error}</p>
                                    <p className="text-sm text-red-600/70 mt-2 font-medium bg-red-100/50 inline-block px-2 py-1 rounded">Type: {currentItem.type}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <button
                                onClick={handleNext}
                                className="bg-primary text-white px-12 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
                            >
                                Next Scenario
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MistakeFinderGame;
