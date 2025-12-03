import React from 'react';
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
    // Mock Data
    const growthData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Total Students',
                data: [120, 190, 300, 500, 800, 1200],
                borderColor: 'rgb(0, 199, 230)',
                backgroundColor: 'rgba(0, 199, 230, 0.5)',
                tension: 0.4,
            },
        ],
    };

    const engagementData = {
        labels: ['Intro to CS', 'Adv Calculus', 'Modern Art', 'Physics'],
        datasets: [
            {
                label: 'Avg Completion Rate (%)',
                data: [85, 72, 90, 65],
                backgroundColor: 'rgba(0, 199, 230, 0.8)',
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-neutral-900">Teacher Analytics</h1>
                <p className="text-neutral-500">Overview of your performance and student engagement.</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500">Total Students</p>
                            <h3 className="text-2xl font-bold text-neutral-900">1,250</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-yellow-100 rounded-full text-yellow-600">
                            <Star className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500">Overall Rating</p>
                            <h3 className="text-2xl font-bold text-neutral-900">4.8/5.0</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 rounded-full text-green-600">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500">Completion Rate</p>
                            <h3 className="text-2xl font-bold text-neutral-900">85%</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                            <Award className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm text-neutral-500">Certificates Issued</p>
                            <h3 className="text-2xl font-bold text-neutral-900">450</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Student Growth</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Line data={growthData} options={options} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Course Engagement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Bar data={engagementData} options={options} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
