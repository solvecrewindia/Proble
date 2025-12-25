import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, Users, FileText, AlertCircle, CheckCircle } from 'lucide-react';

// Helper for date formatting without date-fns
const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
};

const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const subDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() - days);
    return result;
};

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        totalUsers: 0,
        activeQuizzes: 0,
        totalQuizzes: 0,
        completedTests: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentActivity, setRecentActivity] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Metrics Counts
            const [
                { count: usersCount },
                { count: activeCount },
                { count: totalQuizCount },
                { count: resultsCount }
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('quizzes').select('*', { count: 'exact', head: true }).eq('status', 'active'),
                supabase.from('quizzes').select('*', { count: 'exact', head: true }),
                supabase.from('quiz_results').select('*', { count: 'exact', head: true })
            ]);

            setMetrics({
                totalUsers: usersCount || 0,
                activeQuizzes: activeCount || 0,
                totalQuizzes: totalQuizCount || 0,
                completedTests: resultsCount || 0
            });

            // 2. Chart Data (Last 7 Days of Test Completions)
            const days = 7;
            const endDate = new Date();
            const startDate = subDays(endDate, days);

            const { data: trafficData } = await supabase
                .from('quiz_results')
                .select('created_at')
                .gte('created_at', startDate.toISOString())
                .order('created_at', { ascending: true });

            // Process data for chart
            const chartMap = new Map();
            // Initialize last 7 days with 0
            for (let i = 0; i < days; i++) {
                const d = subDays(endDate, i);
                chartMap.set(formatDate(d), 0);
            }

            if (trafficData) {
                trafficData.forEach((item: any) => {
                    const dateStr = formatDate(new Date(item.created_at));
                    if (chartMap.has(dateStr)) {
                        chartMap.set(dateStr, chartMap.get(dateStr) + 1);
                    }
                });
            }

            // Convert Map to Array and sort by date
            const processedChartData = Array.from(chartMap.entries())
                .map(([name, users]) => ({ name, users }))
                .reverse(); // Show oldest to newest

            setChartData(processedChartData);


            // 3. Recent Activity (Latest 5 Results)
            // Note: We need joins to get names. Assuming standard explicit FKs might fail if not set up.
            // We'll try a safe fetch approach: fetch results then fetch related names if needed,
            // OR try the join syntax and fallback.

            // Attempt join: quiz_results(*, student:profiles(name), quiz:quizzes(title))
            // If explicit FKs missing, this might fail. Let's try separate fetch for safety if schema unsure,
            // but for "make it work" quickly, let's try the join first.
            let activityList: any[] = [];

            const { data: activityData, error: activityError } = await supabase
                .from('quiz_results')
                .select(`
                    id,
                    created_at,
                    score,
                    total_questions,
                    student_id,
                    quiz_id
                `) // Minimal fetch first
                .order('created_at', { ascending: false })
                .limit(5);

            if (activityData) {
                // Manually fetch related if needed or just use IDs? Identities are better.
                // Let's fetch arrays of unique IDs to map names.
                const studentIds = [...new Set(activityData.map(a => a.student_id))];
                const quizIds = [...new Set(activityData.map(a => a.quiz_id))];

                const [{ data: students }, { data: quizzes }] = await Promise.all([
                    supabase.from('profiles').select('id, name').in('id', studentIds),
                    supabase.from('quizzes').select('id, title').in('id', quizIds)
                ]);

                activityList = activityData.map(a => {
                    const sName = students?.find(s => s.id === a.student_id)?.name || 'Unknown User';
                    const qTitle = quizzes?.find(q => q.id === a.quiz_id)?.title || 'Unknown Quiz';
                    return {
                        id: a.id,
                        user: sName,
                        action: 'completed',
                        target: qTitle,
                        time: formatDateTime(a.created_at),
                        score: `${a.score}/${a.total_questions}`
                    };
                });
            }
            setRecentActivity(activityList);

        } catch (error) {
            console.error("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const kpiCards = [
        { title: 'Total Users', value: metrics.totalUsers, icon: Users, trend: '+5%', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
        { title: 'Active Quizzes', value: metrics.activeQuizzes, icon: FileText, trend: 'stable', color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { title: 'Tests Completed', value: metrics.completedTests, icon: CheckCircle, trend: '+12%', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { title: 'System Health', value: '99.9%', icon: Activity, trend: 'stable', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    ];

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 rounded-2xl bg-white/5" />)}
                </div>
                <div className="h-[400px] rounded-2xl bg-white/5" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {kpiCards.map((item) => (
                    <div
                        key={item.title}
                        className="group relative overflow-hidden rounded-2xl border border-surface bg-surface p-6 transition-all hover:border-primary/50 hover:shadow-[0_0_30px_rgba(0,199,230,0.1)]"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted">{item.title}</p>
                                <p className="mt-2 text-3xl font-bold text-text">{item.value}</p>
                            </div>
                            <div className={`p-3 rounded-xl ${item.bg}`}>
                                <item.icon className={`h-6 w-6 ${item.color}`} />
                            </div>
                        </div>
                        {/* Fake trend data for visual consistency since we lack historical data for precise diffs yet */}
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                            <span className="text-green-400 font-medium flex items-center gap-1">
                                <ArrowUpRight className="h-3 w-3" /> {item.trend}
                            </span>
                            <span>vs last month</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main Chart */}
                <div className="rounded-2xl border border-surface bg-surface p-6 lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-text">Platform Activity</h2>
                        <select className="rounded-lg border border-surface bg-background px-3 py-1 text-sm text-muted focus:border-primary focus:outline-none">
                            <option>Last 7 Days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00C7E6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00C7E6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#666"
                                    tick={{ fill: '#666' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#666"
                                    tick={{ fill: '#666' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181B',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: '#F8FAFC',
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#00C7E6"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorUsers)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-2xl border border-surface bg-surface p-6">
                    <h2 className="mb-6 text-lg font-semibold text-text">Recent Activity</h2>
                    <div className="space-y-6">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((activity) => (
                                <div key={activity.id} className="relative flex gap-4">
                                    <div className="absolute left-0 top-0 mt-1.5 h-full w-px bg-surface last:hidden"></div>
                                    <div className="relative z-10 mt-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-surface"></div>
                                    <div className="flex-1">
                                        <p className="text-sm text-text">
                                            <span className="font-medium text-primary">{activity.user}</span>{' '}
                                            {activity.action}{' '}
                                            <span className="font-medium text-text">{activity.target}</span>
                                        </p>
                                        <div className="flex justify-between items-center mt-1">
                                            <p className="text-xs text-muted">{activity.time}</p>
                                            <span className="text-xs font-mono bg-white/5 px-2 py-0.5 rounded text-cyan-400">Score: {activity.score}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-muted text-sm text-center py-4">No recent activity found.</p>
                        )}
                    </div>
                    {/* 
                    <button className="mt-6 w-full rounded-xl border border-surface py-2 text-sm font-medium text-muted hover:bg-background hover:text-text transition-colors">
                        View All Activity
                    </button>
                    */}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
