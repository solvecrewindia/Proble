import React, { useEffect, useState } from 'react';
import { Card } from '../../shared/components/Card';
import { Trophy, CheckCircle, Clock, Flame, Activity as ActivityIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../shared/context/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StudentDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        completed: 0,
        badges: 0,
        hours: 0,
        streak: 0
    });
    const [activityData, setActivityData] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;

            try {
                // 1. Fetch Quiz Results
                const { data: results, error } = await supabase
                    .from('quiz_results')
                    .select('*, quizzes(title, settings)')
                    .eq('student_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (results) {
                    // --- Stats Calculation ---

                    // 1. Completed
                    const completed = results.length;

                    // 2. Badges (Mock: Score > 80% = Badge)
                    const badges = results.filter(r => r.percentage >= 80).length;

                    // 3. Study Hours (Estimate: Quiz Duration or 15mins default * count)
                    // Note: 'settings' is jsonb, typically has 'duration' in minutes
                    const totalMinutes = results.reduce((acc, curr) => {
                        const duration = curr.quizzes?.settings?.duration || 15; // default 15 mins if null
                        return acc + parseInt(duration);
                    }, 0);
                    const hours = Math.round(totalMinutes / 60 * 10) / 10; // 1 decimal place

                    // 4. Streak
                    // Get unique dates
                    const dates = [...new Set(results.map(r => new Date(r.created_at).toISOString().split('T')[0]))].sort().reverse();
                    let streak = 0;
                    if (dates.length > 0) {
                        const today = new Date().toISOString().split('T')[0];
                        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

                        // Check if active today or yesterday to start streak
                        if (dates[0] === today || dates[0] === yesterday) {
                            streak = 1;
                            let currentDate = new Date(dates[0]);

                            for (let i = 1; i < dates.length; i++) {
                                const prevDate = new Date(currentDate);
                                prevDate.setDate(prevDate.getDate() - 1);
                                const prevDateString = prevDate.toISOString().split('T')[0];

                                if (dates[i] === prevDateString) {
                                    streak++;
                                    currentDate = prevDate;
                                } else {
                                    break;
                                }
                            }
                        }
                    }

                    setStats({ completed, badges, hours, streak });

                    // --- Chart Data (Last 7 Days) ---
                    const chartMap = new Map();
                    // Initialize last 7 days
                    for (let i = 6; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(d.getDate() - i);
                        const dateStr = d.toISOString().split('T')[0];
                        chartMap.set(dateStr, { date: d.toLocaleDateString('en-US', { weekday: 'short' }), score: 0, count: 0 });
                    }

                    results.forEach(r => {
                        const dateStr = new Date(r.created_at).toISOString().split('T')[0];
                        if (chartMap.has(dateStr)) {
                            const entry = chartMap.get(dateStr);
                            entry.score += r.percentage;
                            entry.count += 1;
                        }
                    });

                    const chartData = Array.from(chartMap.values()).map(item => ({
                        name: item.date,
                        score: item.count > 0 ? Math.round(item.score / item.count) : 0
                    }));
                    setActivityData(chartData);

                    // --- Recent Activity ---
                    setRecentActivity(results.slice(0, 5).map(r => ({
                        id: r.id,
                        quiz: r.quizzes?.title || 'Unknown Quiz',
                        score: r.score,
                        total: r.total_questions,
                        percentage: Math.round(r.percentage),
                        date: new Date(r.created_at).toLocaleDateString()
                    })));
                }
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const statCards = [
        { label: 'Quizzes Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Badges Earned', value: stats.badges, icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        { label: 'Study Hours', value: `${stats.hours}h`, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Current Streak', value: `${stats.streak} Days`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ];

    if (loading) return <div className="p-8 text-center text-muted">Loading metrics...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-text">Dashboard</h1>
                <p className="text-muted mt-2">Track your progress and achievements.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-surface p-6 rounded-xl border border-neutral-300 dark:border-neutral-600 shadow-sm flex items-center gap-4 hover:border-primary/20 transition-colors">
                        <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-text">{stat.value}</p>
                            <p className="text-sm text-muted">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Chart */}
                <div className="bg-surface p-6 rounded-xl border border-neutral-300 dark:border-neutral-600 shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-text mb-6">Average Performance (Last 7 Days)</h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={activityData}>
                                <defs>
                                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#888', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis
                                    tick={{ fill: '#888', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={[0, 100]}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorScore)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity List */}
                <div className="bg-surface p-6 rounded-xl border border-neutral-300 dark:border-neutral-600 shadow-sm flex flex-col">
                    <h3 className="text-lg font-semibold text-text mb-6">Recent Activity</h3>
                    <div className="space-y-4 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-neutral-300 dark:border-neutral-600/50 hover:bg-background transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${activity.percentage >= 80 ? 'bg-green-500/10 text-green-500' : activity.percentage >= 50 ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'}`}>
                                            <ActivityIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-text text-sm">{activity.quiz}</p>
                                            <p className="text-xs text-muted">{activity.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${activity.percentage >= 80 ? 'text-green-500' : 'text-text'}`}>
                                            {activity.percentage}%
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted py-10">No recent activity found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
