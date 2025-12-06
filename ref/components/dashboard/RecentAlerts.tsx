import { useQuery } from '@tanstack/react-query';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface Alert {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: string;
    status: string;
}

const fetchAlerts = async () => {
    const res = await fetch('/api/admin/alerts');
    if (!res.ok) throw new Error('Failed to fetch alerts');
    return res.json();
};

export default function RecentAlerts() {
    const { data: alerts, isLoading } = useQuery({
        queryKey: ['alerts'],
        queryFn: fetchAlerts,
    });

    if (isLoading) {
        return <div className="h-[400px] bg-white rounded-xl shadow-sm animate-pulse" />;
    }

    const recentAlerts = alerts?.slice(0, 5) || [];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px] overflow-hidden flex flex-col">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Alerts</h3>
            <div className="overflow-y-auto flex-1 pr-2 space-y-3">
                {recentAlerts.map((alert: Alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                        {alert.severity === 'high' || alert.severity === 'critical' ? (
                            <ExclamationCircleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                        ) : (
                            <ExclamationCircleIcon className="h-5 w-5 text-amber-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <p className="text-sm font-medium text-slate-800">{alert.type.toUpperCase()}</p>
                                <span className="text-xs text-slate-400">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{alert.description}</p>
                            <div className="mt-2 flex gap-2">
                                <button className="text-xs font-medium text-[#00C7E6] hover:text-[#00A4B8]">View Details</button>
                                {alert.status !== 'resolved' && (
                                    <button className="text-xs font-medium text-slate-500 hover:text-slate-700">Resolve</button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {recentAlerts.length === 0 && (
                    <div className="text-center text-slate-400 py-8">No recent alerts</div>
                )}
            </div>
        </div>
    );
}
