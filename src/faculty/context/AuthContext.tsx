import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Faculty } from '../types';

interface AuthContextType {
    user: Faculty | null;
    token: string | null;
    login: (token: string, user: Faculty) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Faculty | null>({
        id: 'mock-faculty-id',
        name: 'Faculty Member',
        email: 'faculty@example.com',
        department: 'Computer Science',
        role: 'faculty',
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const [token, setToken] = useState<string | null>('mock-token');

    const login = (newToken: string, newUser: Faculty) => {
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
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
