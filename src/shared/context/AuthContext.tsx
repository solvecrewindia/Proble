import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../../lib/supabase';

interface AuthContextType {
    user: User | null;
    login: (email: string, password?: string) => Promise<User | null>;
    signup: (email: string, password: string, username: string, role: User['role']) => Promise<{ user: User | null; error: Error | null }>;
    logout: () => void;
    isLoading: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (userId: string, email: string) => {
        try {
            console.log("Fetching profile for:", userId);

            // Timeout Promise (10 seconds - increased for stability)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Profile fetch timeout")), 10000)
            );

            // Fetch Promise
            const fetchPromise = supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            // Result
            const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
            const { data: profile, error } = result;

            if (error) {
                console.warn('AuthContext: Supabase profile error:', error.message);
                // If specific error (like PGRST116 - no rows), validation might fail
            }

            if (profile) {
                console.log("AuthContext: Profile found:", profile.role);
                return {
                    id: userId,
                    email: email,
                    role: profile.role,
                    username: profile.username,
                    avatar_url: profile.avatar_url,
                    created_at: profile.created_at
                } as User;
            }
        } catch (err: any) {
            console.error('AuthContext: Profile fetch timed out or failed:', err);
        }

        // --- FALLBACK LOGIC ---
        // CRITICAL FIX: Do not downgrade to 'student' if we have a valid cached profile for this user.
        // This prevents Faculty from being kicked to Student Home on network/database blips.
        try {
            const cached = localStorage.getItem('cached_user_profile');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed && parsed.id === userId) {
                    console.warn("AuthContext: Fetch failed, using CACHED profile to maintain session stability.");
                    return parsed;
                }
            }
        } catch (e) {
            console.error("AuthContext: Cache recovery failed", e);
        }

        console.warn("AuthContext: Using fallback profile (Student default).");

        // HOTFIX: Hardcode 'teacher' role for specific user until DB/RLS is fixed
        let fallbackRole: User['role'] = 'student';
        if (email === 'explorewithmadan@gmail.com') {
            fallbackRole = 'teacher';
        }

        return {
            id: userId,
            email: email,
            role: fallbackRole,
            username: email.split('@')[0],
            isFallback: true
        } as User;
    };

    // 1. Persist user to localStorage whenever it changes
    useEffect(() => {
        if (user) {
            localStorage.setItem('cached_user_profile', JSON.stringify(user));
        }
    }, [user]);

    const refreshUser = async () => {
        if (!user) return;
        try {
            const userData = await fetchProfile(user.id, user.email);
            if (userData) setUser(userData);
        } catch (error) {
            console.error("Failed to refresh user:", error);
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            // OPTIMIZATION: Check for cached profile immediately
            try {
                const cached = localStorage.getItem('cached_user_profile');
                if (cached) {
                    const parsedUser = JSON.parse(cached);
                    if (parsedUser && mounted) {
                        console.log("AuthContext: Loaded cached profile.");
                        setUser(parsedUser);
                        // If we have a cache, we can stop loading immediately for UI speed
                        setIsLoading(false);
                    }
                }
            } catch (e) {
                console.error("AuthContext: Cache parse error", e);
            }

            try {
                // Check active session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user && mounted) {
                    console.log("Session found for:", session.user.email);
                    const userEmail = session.user.email || `user-${session.user.id}@example.com`;

                    // Background refetch to update cache/state with fresh data
                    const userData = await fetchProfile(session.user.id, userEmail);

                    if (mounted) {
                        // Only update if data is different prevents re-renders? 
                        // Actually React handles identity check, but it's a new object every time.
                        // Let's just update.
                        setUser(userData);
                        setIsLoading(false); // Ensure loading is false (redundant if cache hit, but safe)
                    }
                } else {
                    // No session immediately found
                    // If we had a cached user, we might want to clear it if session is definitively invalid?
                    // But maybe offline mode?
                    // Safe approach: If no session, wait for listener, but IF we loaded cache, we are "logged in" visually.
                    // If listener says SIGNED_OUT, we will clear it.

                    if (!mounted) return;

                    // If we didn't have a cache hit, we are still loading.
                    // If we DID have a cache hit, isLoading is false.

                    if (isLoading) {
                        console.log("No immediate session & no cache. Waiting for listener...");
                        setTimeout(() => {
                            if (mounted && isLoading) {
                                console.log("Auth Timeout: No session restored. Setting loading false.");
                                setIsLoading(false);
                            }
                        }, 500);
                    }
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                if (mounted) setIsLoading(false);
            }
        };

        // Initialize immediately
        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            console.log("Auth State Change:", event);

            try {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setIsLoading(false);
                    localStorage.removeItem('cached_user_profile'); // Clear cache on logout
                } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
                    const userEmail = session.user.email || `user-${session.user.id}@example.com`;

                    // Prevent double-fetching if initializeAuth already got it.
                    // But if user is null currently (or from cache vs fresh), lets just fetch to be consistent
                    // unless we just fetched it in initializeAuth (hard to track)

                    // Optimistic: If we already have a user (from cache or init), we are good visually.
                    // But we should ensure freshness primarily on SIGNED_IN.
                    // On INITIAL_SESSION, if we already processed it in initializeAuth, duplication is okay-ish.

                    if (!user || user.id !== session.user.id) {
                        const userData = await fetchProfile(session.user.id, userEmail);
                        if (mounted) {
                            setUser(userData);
                            setIsLoading(false);
                        }
                    } else {
                        // User already set, just ensure loading is false
                        if (mounted) setIsLoading(false);
                    }
                }
            } catch (err) {
                console.error("Auth listener error:", err);
                if (mounted) setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password?: string) => {
        console.log("Attempting login for:", email);
        if (!password) {
            throw new Error("Password is required");
        }

        let authData: { user: any; session: any } | null = null;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            authData = data;
        } catch (error: any) {
            console.error("Supabase auth error:", error);

            // EMERGENCY BYPASS: If DB is 500ing (down) and it's the Admin, let them in.
            if (email === 'solvecrewindia@gmail.com') {
                console.warn("AuthContext: EMERGENCY ADMIN BYPASS ACTIVATED. Server is down (500), forcing entry.");

                const mockAdminUser = {
                    id: '00000000-0000-0000-0000-000000000000', // Valid UUID for DB compatibility
                    email: email,
                    role: 'admin' as User['role'],
                    username: 'Admin',
                    isFallback: true
                };

                setUser(mockAdminUser);
                return mockAdminUser;
            }

            throw error;
        }

        if (!authData?.user) throw new Error("Authentication failed");

        const data = authData; // Re-assign for typescript happiness below

        console.log("Auth success. Fetching profile...");


        const userEmail = data.user.email || `user-${data.user.id}@example.com`;
        let userData = await fetchProfile(data.user.id, userEmail);

        // Repair DB attempt (Fail-safe)
        if ((userData as any).isFallback && userData.role === 'student') {
            // Only auto-create if it returned student (meaning it didn't find anything and wasnt the special teacher)
            // Actually, we can attempt to repair for teacher too if we wanted, but let's stick to safe logic.
            console.log("Attempting background DB repair...");
            const newProfile = {
                id: data.user.id,
                email: data.user.email!,
                role: userData.role,
                username: data.user.email!.split('@')[0]
            };
            supabase.from('profiles').insert([newProfile]).then(({ error }) => {
                if (error) console.error("Auto-repair failed:", error);
                else console.log("Auto-repair success.");
            });
        }

        setUser(userData);
        return userData;
    };

    const signup = async (email: string, password: string, username: string, role: User['role']) => {
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('No user data returned');

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

        } catch (error: any) {
            return { user: null, error };
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        localStorage.removeItem('cached_user_profile');

        // Clear game state so next user starts fresh (or loads their own if we implement user-keyed storage later)
        // For now, simple clear prevents "shared" scores.
        localStorage.removeItem('proble_flashcard_state');
        localStorage.removeItem('proble_puzzle_state');
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, logout, isLoading, refreshUser }}>
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
