import React, { useEffect, useState } from 'react';
import { Trophy, Crown, Star } from 'lucide-react';
import { useAuth } from '../../shared/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { getPuzzleState, getFlashCardState, getWeekId } from '../utils/gameState';

const GameLeaderboard = () => {
    const { user } = useAuth();
    const [leaders, setLeaders] = useState<any[]>([]);
    const [totalXP, setTotalXP] = useState(0);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        // 1. Get Local XP for the badge
        const puzzleState = getPuzzleState(user?.id);
        const flashState = getFlashCardState(user?.id);
        const total = (puzzleState?.totalScore || 0) + (flashState?.totalScore || 0);
        setTotalXP(total);

        // 2. Fetch Global Leaderboard from DB
        const fetchLeaderboard = async () => {
            const currentWeek = getWeekId();

            const { data, error } = await supabase
                .from('leaderboard')
                .select(`
                    total_xp,
                    profiles:user_id (
                        username
                    )
                `)
                .eq('week_id', currentWeek) // Filter by current week
                .order('total_xp', { ascending: false })
                .limit(3);

            if (error) {
                console.error("Leaderboard fetch error:", error);
                setFetchError(error.message);
                return;
            }

            if (data) {
                const colors = [
                    { color: "from-yellow-400 to-yellow-600", shadow: "shadow-yellow-500/50", height: "h-40" },
                    { color: "from-gray-300 to-gray-500", shadow: "shadow-gray-400/50", height: "h-32" },
                    { color: "from-orange-400 to-orange-600", shadow: "shadow-orange-500/50", height: "h-24" }
                ];

                const formatted = data.map((entry: any, index: number) => {
                    const profile = entry.profiles;
                    const username = profile?.username || 'Unknown';
                    return {
                        id: `rank-${index}`,
                        name: username,
                        points: entry.total_xp,
                        avatar: (username[0] || '?').toUpperCase(),
                        rank: index + 1,
                        ...(colors[index] || colors[2])
                    };
                });
                setLeaders(formatted);
            }
        };

        fetchLeaderboard();

        // Subscribe to real-time changes
        const subscription = supabase
            .channel('leaderboard_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
                fetchLeaderboard();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    // Arrange for Podium: [Rank 2, Rank 1, Rank 3]
    const rank1 = leaders.find(p => p.rank === 1);
    const rank2 = leaders.find(p => p.rank === 2);
    const rank3 = leaders.find(p => p.rank === 3);

    const topLeaders = [rank2, rank1, rank3].filter(Boolean);

    return (
        <div className="mb-8 p-4">
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-primary" />
                    <h2 className="text-xl font-bold text-text">Global Champions</h2>
                </div>

                <div className="flex items-center gap-4">
                    {/* Total Score Badge */}
                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400/20 to-orange-500/20 px-4 py-2 rounded-full border border-yellow-400/30">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                            Total Earned: {totalXP} XP
                        </span>
                    </div>

                </div>
            </div>

            {leaders.length > 0 && (
                /* Podium Section */
                <div className="flex justify-center items-end gap-2 md:gap-6 mb-8 px-4">
                    {topLeaders.map((leader) => (
                        <div key={leader.rank} className="flex flex-col items-center group">
                            {/* Avatar/Trophy Visual */}
                            <div className="relative mb-3 transition-transform duration-300 group-hover:-translate-y-2">
                                {leader.rank === 1 && (
                                    <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-500 fill-yellow-500 animate-bounce" />
                                )}
                                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br ${leader.color} ${leader.shadow} shadow-lg flex items-center justify-center transform rotate-3 border-4 border-white dark:border-neutral-800`}>
                                    <span className="text-white font-bold text-xl md:text-2xl">{leader.avatar}</span>
                                </div>
                                <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 bg-surface border border-neutral-200 dark:border-neutral-600 px-2 py-0.5 rounded-full text-xs font-bold shadow-sm whitespace-nowrap z-10`}>
                                    Rank {leader.rank}
                                </div>
                            </div>

                            {/* Podium Step */}
                            <div className={`w-20 md:w-32 ${leader.height} bg-gradient-to-t ${leader.color} opacity-20 rounded-t-lg mx-auto relative`}>
                                {/* Reflection effect */}
                                <div className="absolute inset-x-2 top-0 h-[1px] bg-white/50" />
                            </div>

                            {/* Name & Score */}
                            <div className="text-center mt-2">
                                <p className="font-bold text-sm md:text-base text-text truncate max-w-[80px] md:max-w-[120px]">{leader.name}</p>
                                <p className="font-mono text-xs md:text-sm text-primary font-bold">{leader.points}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default GameLeaderboard;
