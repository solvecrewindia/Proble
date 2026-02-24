import React, { createContext, useContext, useState } from 'react';
import type { Faculty } from '../types';
import { useAuth as useSharedAuth } from '../../shared/context/AuthContext';

interface AuthContextType {
    user: Faculty | null;
    token: string | null;
    login: (token: string, user: Faculty) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // 1. We proxy the actual session from the shared AuthContext
    const { user: sharedUser, logout: sharedLogout } = useSharedAuth();

    // 2. We keep local state for any faculty specific needs (tokens etc that might be added later)
    const [token, setToken] = useState<string | null>(null);

    // 3. We derive Faculty User object from the Shared User object
    const facultyUser: Faculty | null = sharedUser ? {
        id: sharedUser.id,
        name: sharedUser.username || sharedUser.email.split('@')[0], // Map username/email to name
        email: sharedUser.email,
        department: 'Faculty Department', // Placeholder as not all shared users have this
        role: 'faculty',
        createdAt: sharedUser.created_at ? new Date(sharedUser.created_at) : new Date(),
        updatedAt: new Date()
    } : null;

    const login = (newToken: string, _: Faculty) => {
        // Faculty local login (rarely used now since we are sharing contexts)
        setToken(newToken);
    };

    const logout = () => {
        setToken(null);
        sharedLogout();
    };

    // 4. Authentication logic depends strictly on the Shared User being present and being a 'teacher' or 'faculty'
    const normalizedRole = sharedUser?.role?.toLowerCase() || '';
    const isAuthenticated = !!sharedUser && ['faculty', 'teacher', 'admin'].includes(normalizedRole);

    return (
        <AuthContext.Provider value={{ user: facultyUser, token, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
