import React from 'react';
import { Card } from '../../shared/components/Card';
import { Trophy, CheckCircle, Clock, Flame } from 'lucide-react';

const StudentDashboard = () => {
    const stats = [
        { label: 'Quizzes Completed', value: '12', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: 'Badges Earned', value: '5', icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
        { label: 'Study Hours', value: '24h', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'Current Streak', value: '3 Days', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold text-text">Dashboard</h1>
                <p className="text-muted mt-2">Track your progress and achievements.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-surface p-6 rounded-xl border border-border-custom shadow-sm flex items-center gap-4">
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

            {/* Placeholder for charts or recent activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface p-6 rounded-xl border border-border-custom shadow-sm h-64 flex items-center justify-center text-muted">
                    Activity Chart Placeholder
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border-custom shadow-sm h-64 flex items-center justify-center text-muted">
                    Recent Badges Placeholder
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
