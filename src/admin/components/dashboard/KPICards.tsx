import { Users, ClipboardCheck, AlertTriangle, Activity } from 'lucide-react';
import clsx from 'clsx';

interface Metrics {
    activeUsers: number;
    concurrentQuizzes: number;
    totalQuizzes: number;
    flaggedIncidents24h: number;
    apiErrorRate: number;
}

export default function KPICards({ metrics, loading }: { metrics?: Metrics, loading: boolean }) {
    const cards = [
        { name: 'Active Users', value: metrics?.activeUsers, icon: Users, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
        { name: 'Concurrent Quizzes', value: metrics?.concurrentQuizzes, icon: ClipboardCheck, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
        { name: 'Flagged Incidents', value: metrics?.flaggedIncidents24h, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
        { name: 'API Error Rate', value: metrics ? `${(metrics.apiErrorRate * 100).toFixed(1)}%` : '-', icon: Activity, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse backdrop-blur-sm" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card) => (
                <div key={card.name} className="glass-panel p-6 rounded-2xl flex items-center gap-4 transition-transform hover:scale-[1.02]">
                    <div className={clsx('p-3.5 rounded-xl border backdrop-blur-md', card.bg)}>
                        <card.icon className={clsx('h-6 w-6', card.color)} />
                    </div>
                    <div>
                        <p className="text-sm text-text-secondary font-medium mb-1">{card.name}</p>
                        <p className="text-2xl font-bold text-text tracking-tight">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
