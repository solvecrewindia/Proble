import { useState, useEffect } from 'react';
import { MoreVertical, Search, Check, X, Shield, Trash2, Ban } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    lastActive: string;
    avatar: string;
}

const Users = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Student' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Actions State
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;

            if (data) {
                const mappedUsers = data.map((profile: any) => ({
                    id: profile.id,
                    name: profile.username || 'Unknown',
                    email: profile.email || 'No Email',
                    role: profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : 'Student',
                    status: 'Active', // Default as field is missing in DB
                    lastActive: 'Recently', // Default as field is missing in DB
                    avatar: `https://ui-avatars.com/api/?name=${profile.username || 'User'}&background=random`
                }));
                setUsers(mappedUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Note: In a real Supabase Auth setup, you'd create the user via Admin API.
            // Here we are inserting into profiles to mimic the action as requested.
            // Ensure RLS policies allow this or you are using an admin client.
            const fakeId = uuidv4();
            const { error } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: fakeId,
                        username: newUser.name,
                        email: newUser.email,
                        role: newUser.role.toLowerCase(),
                    }
                ]);

            if (error) throw error;

            setIsAddUserOpen(false);
            setNewUser({ name: '', email: '', role: 'Student' });
            fetchUsers(); // Refresh list
        } catch (error) {
            console.error('Error adding user:', error);
            alert('Failed to add user. Check console for details.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Are you sure you want to remove this user?')) return;
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user.');
        }
    };

    const filteredUsers = users.filter((user) =>
        (activeTab === 'all' ||
            (activeTab === 'teachers' && user.role === 'Teacher') ||
            (activeTab === 'students' && user.role === 'Student')) &&
        (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return <div className="p-6 text-center text-text">Loading users...</div>;
    }

    return (
        <div className="space-y-6" onClick={() => activeActionMenu && setActiveActionMenu(null)}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-2xl font-bold text-text">User Management</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddUserOpen(true)}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90 transition-colors"
                    >
                        Add User
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col gap-4 rounded-2xl border border-surface bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    {['all', 'students', 'teachers'].map((tab) => (
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
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
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
                                        <td className="px-6 py-4 text-muted">{user.lastActive}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveActionMenu(activeActionMenu === user.id ? null : user.id);
                                                    }}
                                                    className="rounded-lg p-1.5 text-muted hover:bg-background hover:text-text transition-colors"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>

                                                {activeActionMenu === user.id && (
                                                    <div className="absolute right-0 top-full z-10 mt-1 w-32 rounded-lg border border-surface bg-background shadow-lg overflow-hidden">
                                                        <button
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text hover:bg-surface transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); alert('Block functionality pending UI support'); setActiveActionMenu(null); }}
                                                        >
                                                            <Ban className="h-3.5 w-3.5 text-yellow-500" />
                                                            Block User
                                                        </button>
                                                        <button
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 transition-colors"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); setActiveActionMenu(null); }}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted">
                                        No users found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            {isAddUserOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-text">Add New User</h2>
                            <button
                                onClick={() => setIsAddUserOpen(false)}
                                className="rounded-lg p-1 text-muted hover:bg-background hover:text-text"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-text">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full rounded-lg border border-surface bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-text">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full rounded-lg border border-surface bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-text">Role</label>
                                <select
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                    className="w-full rounded-lg border border-surface bg-background px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                >
                                    <option value="Student">Student</option>
                                    <option value="Teacher">Teacher</option>
                                    <option value="Admin">Admin</option>
                                </select>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsAddUserOpen(false)}
                                    className="rounded-xl px-4 py-2 text-sm font-medium text-muted hover:text-text"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Adding...' : 'Add User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
