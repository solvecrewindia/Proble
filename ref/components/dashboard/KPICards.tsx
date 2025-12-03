import { UsersIcon, ClipboardDocumentCheckIcon, ExclamationTriangleIcon, ServerIcon } from '@heroicons/react/24/outline';
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
        { name: 'Active Users', value: metrics?.activeUsers, icon: UsersIcon, color: 'text-blue-500', bg: 'bg-blue-50' },
        { name: 'Concurrent Quizzes', value: metrics?.concurrentQuizzes, icon: ClipboardDocumentCheckIcon, color: 'text-purple-500', bg: 'bg-purple-50' },
        { name: 'Flagged Incidents (24h)', value: metrics?.flaggedIncidents24h, icon: ExclamationTriangleIcon, color: 'text-amber-500', bg: 'bg-amber-50' },
        { name: 'API Error Rate', value: metrics ? `${(metrics.apiErrorRate * 100).toFixed(1)}%` : '-', icon: ServerIcon, color: 'text-red-500', bg: 'bg-red-50' },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white rounded-xl shadow-sm animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {cards.map((card) => (
                <div key={card.name} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                    <div className={clsx('p-3 rounded-lg', card.bg)}>
                        <card.icon className={clsx('h-6 w-6', card.color)} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">{card.name}</p>
                        <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
