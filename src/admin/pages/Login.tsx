import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/context/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const targetEmails = ['solvecrewindia@gmail.com', 'solvecrew@gmail.com'];

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Strict Target Email Check Before Database call
        if (!targetEmails.includes(normalizedEmail)) {
            setError('Unauthorized Email. Only SolveCrew admins allowed.');
            setLoading(false);
            return;
        }

        // 2. Validate Master Password for Admin bypass
        if (password === 'solvecrew_admin') {
            const mockAdminUser = {
                id: '00000000-0000-0000-0000-000000000000',
                email: normalizedEmail,
                role: 'admin' as const,
                username: 'Admin',
                full_name: 'Administrator',
            };

            // Set localStorage mock cache manually since we bypass AuthContext login
            localStorage.setItem('cached_user_profile', JSON.stringify(mockAdminUser));
            navigate('/admin');
            setLoading(false);
            return;
        }

        // 3. Fallback Authenticate via AuthContext
        try {
            const user = await login(normalizedEmail, password);
            if (user && user.role === 'admin') {
                navigate('/admin');
            } else if (user) {
                // Should never happen due to email lock, but just in case
                setError('Unauthorized Role. You are not an admin.');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 border border-neutral-800">
            <div className="bg-slate-800 p-8 rounded-xl shadow-2xl shadow-blue-500/10 w-full max-w-md border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold font-space text-[#00C7E6] mb-2 tracking-wider">PROBLE.</h1>
                    <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">Admin Terminal</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Secure Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-[#00C7E6] focus:border-[#00C7E6] outline-none text-white transition-all"
                            placeholder="admin@solvecrew.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Access Node (Password)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-[#00C7E6] focus:border-[#00C7E6] outline-none text-white transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 bg-[#00C7E6] hover:bg-[#00A4B8] text-slate-900 font-bold py-3 rounded-lg transition-colors disabled:opacity-50 tracking-wide uppercase text-sm"
                    >
                        {loading ? 'Authenticating...' : 'Override Protocol'}
                    </button>
                </form>
            </div>
        </div>
    );
}
