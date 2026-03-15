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
    loadSessionUser: () => Promise<User | null>;
    signInWithGoogle: () => Promise<void>;
    signInWithOtp: (email: string) => Promise<{ error: Error | null }>;
    verifyOtp: (email: string, token: string) => Promise<{ user: any; error: Error | null }>;
    checkProfileExists: (userId: string) => Promise<{ exists: boolean; hasRegNo: boolean }>;
    finalizeSignup: (userId: string, email: string, password: string, username: string, role: User['role'], registrationNumber?: string) => Promise<{ user: User | null; error: Error | null }>;
    updateRegistrationNumber: (userId: string, registrationNumber: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const cached = localStorage.getItem('cached_user_profile');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error("AuthContext: Failed to parse cached user", error);
            return null;
        }
    });

    // Initialize loading state based on cache presence needed for instant reload
    const [isLoading, setIsLoading] = useState(() => {
        const cached = localStorage.getItem('cached_user_profile');
        return !cached; // If cached user exists, we are NOT loading visually
    });



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
                if (error.code === 'PGRST116') {
                    // Code for "no rows found". This is a NEW USER from Google Sign In.
                    // Return a partial user object so we can redirect to Onboarding.
                    console.log("AuthContext: Profile not found (New User). Returning partial user for onboarding.");
                    return {
                        id: userId,
                        email: email,
                        role: null, // No role yet
                        isNewUser: true, // Flag to trigger onboarding
                        // We can't get metadata here easily unless we pass it in, 
                        // but session usually has it. We'll handle metadata extraction in Onboarding.tsx
                        // using the current session.
                    } as unknown as User;
                }
            }

            if (profile) {
                console.log("AuthContext: Profile found:", profile.role);
                return {
                    id: userId,
                    email: email,
                    role: profile.role,
                    username: profile.username,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                    created_at: profile.created_at,
                    registration_number: profile.registration_number
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

    // Loads profile from the current active Supabase session.
    // Use this after OTP login to sync auth state before navigating.
    const loadSessionUser = async (): Promise<User | null> => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return null;
            const userEmail = session.user.email || `user-${session.user.id}@example.com`;
            const userData = await fetchProfile(session.user.id, userEmail);
            if (userData) {
                setUser(userData);
                return userData;
            }
            return null;
        } catch (error) {
            console.error('loadSessionUser error:', error);
            return null;
        }
    };

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            // OPTIMIZATION: State is now initialized from localStorage in useState (above)
            // for instant First Input Delay (FID) reduction. No need to check here.

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
                        // PROTECTION: If userData is a fallback (fetch failed), but we have a valid cached user (with same email/id),
                        // DO NOT OVERWRITE with the fallback. Keep the cached version as it's likely better.
                        const currentIsGood = user && !user.isFallback;
                        const newIsFallback = (userData as any).isFallback;

                        if (currentIsGood && newIsFallback) {
                            console.warn("AuthContext: Preserving existing valid user over fallback.");
                        } else {
                            setUser(userData);
                        }
                        setIsLoading(false); // Ensure loading is false (redundant if cache hit, but safe)
                    }
                } else {
                    // No session immediately found
                    // Clear the cache to prevent unauthorized access based on old cached mock tokens.
                    if (mounted) {
                        setUser(null);
                        localStorage.removeItem('cached_user_profile');
                        setIsLoading(false);
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

                    // For SIGNED_IN: ALWAYS refetch from DB to ensure fresh state.
                    // Old Google users going through OTP will have same user.id in cache,
                    // so the skip-on-same-ID check would wrongly skip the refresh.
                    // For TOKEN_REFRESHED / INITIAL_SESSION: skip if we already have the user loaded.
                    const shouldRefetch = event === 'SIGNED_IN' || !user || user.id !== session.user.id;

                    if (shouldRefetch) {
                        const userData = await fetchProfile(session.user.id, userEmail);
                        if (mounted) {
                            const currentIsGood = user && !user.isFallback;
                            const newIsFallback = (userData as any).isFallback;

                            if (currentIsGood && newIsFallback) {
                                console.warn("AuthContext (Listener): Preserving existing valid user over fallback.");
                            } else {
                                setUser(userData);
                            }
                            setIsLoading(false);
                        }
                    } else {
                        // User already set and same ID on non-SIGNED_IN event — just clear loading
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

    const login = async (rawEmail: string, password?: string) => {
        const email = rawEmail.trim().toLowerCase();
        console.log("Attempting login for:", email);
        if (!password) {
            throw new Error("Password is required");
        }

        let authData: { user: any; session: any } | null = null;

        // EMERGENCY BYPASS & PRIMARY MASTER LOGIN: Check master credentials directly
        const targetAdminEmails = ['solvecrewindia@gmail.com', 'solvecrew@gmail.com'];
        if (targetAdminEmails.includes(email) && password === 'solvecrew_admin') {
            console.warn("AuthContext: MASTER BYPASS ACTIVATED. Bypassing Supabase for admin access.");

            const mockAdminUser = {
                id: '00000000-0000-0000-0000-000000000000', // Valid UUID for DB compatibility
                email: email,
                role: 'admin' as User['role'],
                username: 'Admin',
                full_name: 'Administrator',
            };

            setUser(mockAdminUser);
            return mockAdminUser;
        }

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            authData = data;
        } catch (error: any) {
            console.error("Supabase auth error:", error);
            throw error;
        }

        if (!authData?.user) throw new Error("Authentication failed");

        const data = authData; // Re-assign for typescript happiness below

        console.log("Auth success. Fetching profile...");


        const userEmail = data.user.email || `user-${data.user.id}@example.com`;
        let userData = await fetchProfile(data.user.id, userEmail);

        // Repair DB attempt (Fail-safe) - REMOVED to prevent "Zombie Accounts" after deletion.
        // If a profile is missing, it implies the account was deleted or not fully created.
        // We should NOT auto-create it here.

        if ((userData as any).isFallback) {
            console.warn("AuthContext: Login successful but profile missing (isFallback). Assuming account deleted/invalid.");
            // Force logout because the user "doesn't exist" in our functional system (profiles table)
            await supabase.auth.signOut();
            throw new Error("Account data not found. Access denied.");
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
        // Optimistic: Clear local state immediately for instant UI feedback
        setUser(null);
        localStorage.removeItem('cached_user_profile');
        localStorage.removeItem('proble_flashcard_state');
        localStorage.removeItem('proble_puzzle_state');

        // Background: Tell server to invalidate session
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.warn("Background logout error (ignorable):", err);
        }
    };

    const checkProfileExists = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, registration_number')
                .eq('id', userId)
                .single();
            if (error) return { exists: false, hasRegNo: false };
            return { exists: !!data, hasRegNo: !!data?.registration_number };
        } catch (err) {
            return { exists: false, hasRegNo: false };
        }
    };

    const updateRegistrationNumber = async (userId: string, registrationNumber: string) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ registration_number: registrationNumber })
                .eq('id', userId);
            
            if (error) return { error };
            
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) throw error;
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            throw error;
        }
    };

    const signInWithOtp = async (email: string) => {
        try {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    shouldCreateUser: true,
                    // NOTE: Do NOT set emailRedirectTo here — that switches Supabase
                    // into "magic link" mode instead of sending a 6-digit OTP code.
                }
            });
            return { error };
        } catch (error: any) {
            return { error };
        }
    };

    const verifyOtp = async (email: string, token: string) => {
        try {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token,
                type: 'signup' // or 'magiclink'? Supabase docs say 'signup' for OTP
            });

            // If signup fails, try magiclink/signin
            if (error) {
                const { data: data2, error: error2 } = await supabase.auth.verifyOtp({
                    email,
                    token,
                    type: 'magiclink'
                });
                return { user: data2?.user, error: error2 };
            }

            return { user: data?.user, error: null };
        } catch (error: any) {
            return { user: null, error };
        }
    };


    const finalizeSignup = async (userId: string, email: string, password: string, username: string, role: User['role'], registrationNumber?: string) => {
        try {
            // 1. Update password
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;

            // 2. Create profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: userId,
                        username,
                        role,
                        email,
                        registration_number: registrationNumber || null
                    }
                ]);

            if (profileError) {
                console.error("Profile creation error in finalizeSignup:", profileError.message);
                return { user: null, error: profileError };
            }

            const newUser: User = {
                id: userId,
                email,
                role,
                username
            };

            setUser(newUser);
            return { user: newUser, error: null };
        } catch (error: any) {
            console.error("finalizeSignup error:", error);
            return { user: null, error };
        }
    };


    return (
        <AuthContext.Provider value={{ user, login, signup, logout, isLoading, refreshUser, loadSessionUser, signInWithGoogle, signInWithOtp, verifyOtp, checkProfileExists, finalizeSignup, updateRegistrationNumber }}>
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
