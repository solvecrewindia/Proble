import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { TrendingUp, Users, Star, Award } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function Analytics() {
    const [metrics, setMetrics] = useState({
        totalStudents: 0,
        avgScore: 0,
        totalAttempts: 0,
    });
    const [loading, setLoading] = useState(true);
    const [graphData, setGraphData] = useState<any>({
        growth: { labels: [], datasets: [] },
        engagement: { labels: [], datasets: [] }
    });

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch all results for quizzes created by this faculty (RLS handles the filtering)
            const { data: results, error } = await supabase
                .from('quiz_results')
                .select(`
                    *,
                    quizzes ( title )
                `)
                .order('created_at', { ascending: true });

            if (error) {
                console.error("Error fetching analytics:", error);
                setLoading(false);
                return;
            }

            if (!results || results.length === 0) {
                setLoading(false);
                return;
            }

            // --- Calculate Metrics ---
            const uniqueStudents = new Set(results.map((r: any) => r.student_id));
            const totalScore = results.reduce((acc: number, r: any) => acc + r.percentage, 0);
            const avg = totalScore / results.length;

            setMetrics({
                totalStudents: uniqueStudents.size,
                avgScore: avg,
                totalAttempts: results.length
            });

            // --- Process Charts ---

            // 1. Student Growth (Attempts over time)
            // Group by Month (YYYY-MM)
            const growthMap: Record<string, number> = {};
            results.forEach((r: any) => {
                const date = new Date(r.created_at);
                const key = date.toLocaleString('default', { month: 'short' }); // e.g. "Dec"
                growthMap[key] = (growthMap[key] || 0) + 1;
            });

            const growthLabels = Object.keys(growthMap);
            const growthValues = Object.values(growthMap);

            // 2. Engagement (Avg Score by Quiz)
            const quizMap: Record<string, { total: number, count: number }> = {};
            results.forEach((r: any) => {
                const title = r.quizzes?.title || 'Unknown Quiz';
                if (!quizMap[title]) quizMap[title] = { total: 0, count: 0 };
                quizMap[title].total += r.percentage;
                quizMap[title].count += 1;
            });

            const quizLabels = Object.keys(quizMap).slice(0, 5); // Top 5
            const quizValues = quizLabels.map(k => quizMap[k].total / quizMap[k].count);

            setGraphData({
                growth: {
                    labels: growthLabels,
                    datasets: [{
                        label: 'Total Attempts',
                        data: growthValues,
                        borderColor: 'rgb(0, 199, 230)',
                        backgroundColor: 'rgba(0, 199, 230, 0.5)',
                        tension: 0.4,
                    }]
                },
                engagement: {
                    labels: quizLabels,
                    datasets: [{
                        label: 'Avg Score (%)',
                        data: quizValues,
                        backgroundColor: 'rgba(0, 199, 230, 0.8)',
                    }]
                }
            });

            setLoading(false);
        };

        fetchData();
    }, []);

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' as const },
        },
        scales: {
            y: { beginAtZero: true },
        },
    };

    if (loading) return <div>Loading analytics...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-text">Teacher Analytics</h1>
                <p className="text-muted">Overview of your performance and student engagement.</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="bg-surface border-neutral-300 dark:border-neutral-600">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted">Total Students</p>
                            <h3 className="text-2xl font-bold text-text">{metrics.totalStudents}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-surface border-neutral-300 dark:border-neutral-600">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 rounded-full text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <Star className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted">Average Score</p>
                            <h3 className="text-2xl font-bold text-text">{metrics.avgScore.toFixed(1)}%</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-surface border-neutral-300 dark:border-neutral-600">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted">Total Attempts</p>
                            <h3 className="text-2xl font-bold text-text">{metrics.totalAttempts}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-surface border-neutral-300 dark:border-neutral-600">
                    <CardHeader>
                        <CardTitle className="text-text">Assessment Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Line data={graphData.growth} options={options} />
                    </CardContent>
                </Card>

                <Card className="bg-surface border-neutral-300 dark:border-neutral-600">
                    <CardHeader>
                        <CardTitle className="text-text">Quiz Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Bar data={graphData.engagement} options={options} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
