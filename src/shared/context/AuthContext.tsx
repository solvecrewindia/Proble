import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { mockLogin } from '../api/mockAuth';

interface AuthContextType {
    user: User | null;
    login: (email: string) => Promise<User | null>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for persisted session (mock)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string) => {
        const loggedInUser = await mockLogin(email);
        if (loggedInUser) {
            setUser(loggedInUser);
            localStorage.setItem('user', JSON.stringify(loggedInUser));
            return loggedInUser;
        }
        return null;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
