import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../../lib/supabase';

interface AuthContextType {
    user: User | null;
    login: (email: string, password?: string) => Promise<User | null>;
    signup: (email: string, password: string, username: string, role: User['role']) => Promise<{ user: User | null; error: Error | null }>;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check active session
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Fetch profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email!,
                        role: profile.role,
                        username: profile.username,
                        created_at: profile.created_at
                    });
                }
            }
            setIsLoading(false);
        };

        getSession();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();

                if (profile) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email!,
                        role: profile.role,
                        username: profile.username,
                        created_at: profile.created_at
                    });
                } else {
                    // Fallback if profile doesn't exist yet (e.g. immediately after signup before insert)
                    setUser({
                        id: session.user.id,
                        email: session.user.email!,
                        role: 'student', // Default or unknown
                        username: session.user.user_metadata?.username
                    });
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password?: string) => {
        if (!password) {
            console.error("Password is required for Supabase login");
            return null;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            console.error("Login error:", error.message);
            throw error;
        }

        if (data.user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profile) {
                const userData: User = {
                    id: data.user.id,
                    email: data.user.email!,
                    role: profile.role,
                    username: profile.username
                };
                setUser(userData);
                return userData;
            } else {
                // Profile missing (likely due to previous creation error). Auto-recover.
                const fallbackUsername = data.user.email!.split('@')[0];
                const newProfile = {
                    id: data.user.id,
                    email: data.user.email!,
                    role: 'student' as User['role'], // Default role
                    username: fallbackUsername
                };

                // Try to insert
                await supabase.from('profiles').insert([newProfile]);

                // Set user state
                setUser(newProfile);
                return newProfile;
            }
        }
        return null;
    };

    const signup = async (email: string, password: string, username: string, role: User['role']) => {
        try {
            // 1. Sign up with Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                console.error("Signup error:", authError.message);
                return { user: null, error: authError };
            }

            if (authData.user) {
                // 2. Create Profile entry
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: authData.user.id,
                            username,
                            role,
                            email
                        }
                    ]);

                if (profileError) {
                    console.error("Profile creation error:", profileError.message);
                    // Optional: Delete user if profile creation fails to maintain consistency
                    return { user: null, error: profileError };
                }

                const newUser: User = {
                    id: authData.user.id,
                    email: authData.user.email!,
                    role,
                    username
                };

                setUser(newUser);
                return { user: newUser, error: null };
            }
            return { user: null, error: new Error('No user data returned') };

        } catch (error: any) {
            return { user: null, error };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
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
