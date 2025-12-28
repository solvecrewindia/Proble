import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const ProblemRequests = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const { data, error } = await supabase
                    .from('problem_requests')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setRequests(data || []);
            } catch (err) {
                console.error('Error fetching requests:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRequests();
    }, []);

    const updateStatus = async (id: any, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('problem_requests')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;
            setRequests(requests.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (err) {
            console.error('Error updating status:', err);
            alert('Failed to update status');
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted">Loading requests...</div>;
    }

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-2xl font-bold text-text">Problem Requests</h1>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4 rounded-xl border border-surface bg-surface/50 p-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        placeholder="Search requests..."
                        className="h-10 w-full rounded-lg border border-surface bg-background pl-10 pr-4 text-sm text-text placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
                <button className="flex items-center gap-2 rounded-lg border border-surface bg-background px-3 py-2 text-sm font-medium text-muted hover:text-text transition-colors">
                    <Filter className="h-4 w-4" />
                    Filter
                </button>
            </div>

            {/* Requests List */}
            <div className="rounded-xl border border-surface bg-surface/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-surface/50 text-muted">
                            <tr>
                                <th className="px-6 py-4 font-medium">User Details</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted">No problem requests found.</td>
                                </tr>
                            ) : (
                                requests.map((request) => (
                                    <tr key={request.id} className="group hover:bg-surface/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary uppercase">
                                                    <span className="font-medium">{(request.user_name || 'U').charAt(0)}</span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-text">{request.user_name || 'Unknown User'}</div>
                                                    <div className="text-xs text-muted">{request.user_email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${(request.user_role || 'Student').toLowerCase() === 'teacher'
                                                    ? 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/20 dark:text-purple-400 dark:ring-purple-400/20'
                                                    : 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/20 dark:text-blue-400 dark:ring-blue-400/20'
                                                }`}>
                                                {request.user_role || 'Student'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-text">
                                                <MessageSquare className="h-4 w-4 text-muted" />
                                                {request.type}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="truncate max-w-xs text-muted" title={request.description}>
                                                {request.description}
                                            </p>
                                            {request.details && (
                                                <p className="text-xs text-muted mt-1 truncate max-w-xs opacity-70">
                                                    {request.details}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${request.status === 'Resolved' ? 'bg-green-500/10 text-green-500' :
                                                request.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500' :
                                                    'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                {request.status === 'Resolved' && <CheckCircle className="h-3 w-3" />}
                                                {request.status === 'In Progress' && <Clock className="h-3 w-3" />}
                                                {request.status === 'Pending' && <Clock className="h-3 w-3" />}
                                                {request.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted">
                                            {new Date(request.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => updateStatus(request.id, 'Resolved')}
                                                    className="p-1 text-green-500 hover:bg-green-500/10 rounded"
                                                    title="Mark as Resolved"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(request.id, 'In Progress')}
                                                    className="p-1 text-blue-500 hover:bg-blue-500/10 rounded"
                                                    title="Mark In Progress"
                                                >
                                                    <Clock className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(request.id, 'Pending')}
                                                    className="p-1 text-yellow-500 hover:bg-yellow-500/10 rounded"
                                                    title="Mark Pending"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProblemRequests;
