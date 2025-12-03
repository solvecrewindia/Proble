import { useState } from 'react';
import { Search, Filter, MoreVertical, MessageSquare, CheckCircle, XCircle, Clock } from 'lucide-react';

const ProblemRequests = () => {
    const [requests] = useState([
        {
            id: 1,
            user: 'John Doe',
            email: 'john.doe@example.com',
            type: 'Quiz Error',
            description: 'Question 5 in React Basics has incorrect options.',
            status: 'Pending',
            date: '2024-03-15',
        },
        {
            id: 2,
            user: 'Jane Smith',
            email: 'jane.smith@example.com',
            type: 'Feature Request',
            description: 'Please add dark mode support for mobile view.',
            status: 'In Progress',
            date: '2024-03-14',
        },
        {
            id: 3,
            user: 'Mike Johnson',
            email: 'mike.j@example.com',
            type: 'Bug Report',
            description: 'Submit button not working on Safari browser.',
            status: 'Resolved',
            date: '2024-03-13',
        },
    ]);

    return (
        <div className="p-6 space-y-6">
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
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface">
                            {requests.map((request) => (
                                <tr key={request.id} className="group hover:bg-surface/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <span className="font-medium">{request.user.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <div className="font-medium text-text">{request.user}</div>
                                                <div className="text-xs text-muted">{request.email}</div>
                                            </div>
                                        </div>
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
                                        {request.date}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                                                <CheckCircle className="h-4 w-4" />
                                            </button>
                                            <button className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                            <button className="p-1 text-muted hover:text-text">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProblemRequests;
