import { useState } from 'react';
import { users } from '../data';
import { MoreVertical, Search, Check, X } from 'lucide-react';

const Users = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = users.filter(user =>
        (activeTab === 'all' ||
            (activeTab === 'teachers' && user.role === 'Teacher') ||
            (activeTab === 'students' && user.role === 'Student') ||
            (activeTab === 'pending' && user.status === 'Pending')) &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-text">User Management</h1>
                <div className="flex gap-2">
                    <button className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90 transition-colors">
                        Add User
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col gap-4 rounded-2xl border border-surface bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {['all', 'students', 'teachers', 'pending'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === tab
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted hover:bg-background hover:text-text'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 w-full rounded-lg border border-surface bg-background pl-9 pr-4 text-sm text-text placeholder-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="overflow-hidden rounded-2xl border border-surface bg-surface">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-surface bg-surface/50 text-muted">
                                <th className="px-6 py-4 font-medium">User</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Last Active</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-surface">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="group hover:bg-background/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={user.avatar}
                                                alt={user.name}
                                                className="h-10 w-10 rounded-full border border-surface"
                                            />
                                            <div>
                                                <p className="font-medium text-text">{user.name}</p>
                                                <p className="text-xs text-muted">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user.role === 'Admin' ? 'bg-purple-500/10 text-purple-500' :
                                            user.role === 'Teacher' ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-green-500/10 text-green-500'
                                            }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${user.status === 'Active' ? 'bg-green-500/10 text-green-500' :
                                            user.status === 'Suspended' ? 'bg-red-500/10 text-red-500' :
                                                'bg-yellow-500/10 text-yellow-500'
                                            }`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${user.status === 'Active' ? 'bg-green-500' :
                                                user.status === 'Suspended' ? 'bg-red-500' :
                                                    'bg-yellow-500'
                                                }`}></span>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-muted">2 mins ago</td>
                                    <td className="px-6 py-4 text-right">
                                        {user.status === 'Pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <button className="rounded-lg bg-green-500/10 p-1.5 text-green-500 hover:bg-green-500/20 transition-colors">
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button className="rounded-lg bg-red-500/10 p-1.5 text-red-500 hover:bg-red-500/20 transition-colors">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-text transition-colors">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        )}
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

export default Users;
