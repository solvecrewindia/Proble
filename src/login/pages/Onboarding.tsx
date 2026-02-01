import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, School, Check, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Onboarding() {
    const { user, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Role Selection, 2: Details Confirmation
    const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Form states
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [regNo, setRegNo] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        // AUTO-DETECT STUDENT INTENT (from SharedQuizHandler)
        const quizIntent = localStorage.getItem('quiz_join_intent');
        if (quizIntent) {
            console.log("Onboarding: Auto-selecting Student role due to Quiz Intent:", quizIntent);
            setSelectedRole('student');
            setStep(2);
            // Optionally clear it here, or wait until success. 
            // Clearing it now prevents stuck state if they reload.
            // But we might want to keep it if they refresh on step 2. 
            // Let's keep it until success.
        }

        // Try to pre-fill data from Google metadata if available
        const fetchMetadata = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.user_metadata) {
                const meta = session.user.user_metadata;
                const rawName = meta.full_name || meta.name || '';

                // Default username from email
                if (!username) {
                    setUsername(user.email.split('@')[0]);
                }

                // SRM Extraction Logic
                const parts = rawName.trim().split(/\s+/);
                if (parts.length > 0) {
                    const lastPart = parts[parts.length - 1];
                    // Regex: Starts with RA followed by digits, assuming that's the whole last part
                    if (/^RA\d+$/.test(lastPart)) {
                        setRegNo(lastPart);
                        // Join everything EXCEPT the last part
                        setFullName(parts.slice(0, parts.length - 1).join(' '));
                    } else {
                        setFullName(rawName);
                        setRegNo('');
                    }
                } else {
                    setFullName(rawName);
                }
            }
        };

        fetchMetadata();
    }, [user, navigate]);

    const handleRoleSelect = (role: 'student' | 'teacher') => {
        setSelectedRole(role);
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedRole) return;

        // Simple Validation
        if (!username || !fullName) {
            alert("Please fill in all required fields.");
            return;
        }
        if (selectedRole === 'student' && user.email?.endsWith('@srmist.edu.in') && !regNo) {
            alert("Please enter your Registration Number.");
            return;
        }

        try {
            setIsLoading(true);

            // 1. Insert into profiles
            const { error } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: user.id,
                        username: username,
                        full_name: fullName,
                        role: selectedRole,
                        email: user.email,
                        registration_number: selectedRole === 'student' ? regNo : null,
                        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null // Carry over Google Image
                    }
                ]);

            if (error) throw error;

            // 2. Refresh Auth Context to pick up the new role
            await refreshUser();

            // 3. Redirect

            // Check for quiz intent redirect first
            const quizIntent = localStorage.getItem('quiz_join_intent');
            if (quizIntent && selectedRole === 'student') {
                localStorage.removeItem('quiz_join_intent'); // Consume it
                navigate(`/student/join?code=${quizIntent}`);
            } else {
                if (selectedRole === 'admin') navigate('/admin');
                else if (selectedRole === 'faculty' || selectedRole === 'teacher') navigate('/faculty');
                else navigate('/');
            }

        } catch (error: any) {
            console.error("Onboarding failed:", error);
            alert("Failed to create profile: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    // Clean up intent on unmount or success
    useEffect(() => {
        return () => {
            // We don't strictly clear it on unmount because they might refresh. 
            // Ideally we clear it on successful profile creation or explicit cancel.
        };
    }, []);

    if (!user) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-900 p-6">
            <div className="w-full max-w-2xl">

                {/* Header */}
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600 mb-2">
                        Welcome to Proble!
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400">
                        Let's set up your profile to get you started.
                    </p>
                </div>

                {/* Step 1: Role Selection */}
                {step === 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                        {/* Student Option */}
                        <button
                            onClick={() => handleRoleSelect('student')}
                            className="group relative p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 text-left"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <GraduationCap className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Student</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                Access quizzes, track progress, and climb the leaderboard.
                            </p>
                        </button>

                        {/* Teacher Option */}
                        <button
                            onClick={() => handleRoleSelect('teacher')}
                            className="group relative p-8 rounded-3xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 text-left"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <School className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Teacher</h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                Create assessments, manage students, and view analytics.
                            </p>
                        </button>
                    </div>
                )}

                {/* Step 2: Details Confirmation */}
                {step === 2 && (
                    <div className="bg-white dark:bg-neutral-800 rounded-3xl p-8 shadow-sm border border-neutral-200 dark:border-neutral-700 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-neutral-200 dark:border-neutral-700">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <UserIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Confirm Details</h2>
                                <p className="text-sm text-neutral-500">You are joining as a <span className="font-semibold text-primary capitalize">{selectedRole}</span></p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">
                                        Username
                                    </label>
                                    <Input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Choose a username"
                                        required
                                        className="h-12 bg-gray-50 dark:bg-neutral-900"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">
                                        Full Name
                                    </label>
                                    <Input
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your full name"
                                        required
                                        className="h-12 bg-gray-50 dark:bg-neutral-900"
                                    />
                                </div>
                            </div>

                            {selectedRole === 'student' && user.email?.endsWith('@srmist.edu.in') && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">
                                        Registration Number <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        value={regNo}
                                        onChange={(e) => setRegNo(e.target.value)}
                                        placeholder="RA..."
                                        required
                                        className="h-12 bg-gray-50 dark:bg-neutral-900"
                                    />
                                    <p className="text-xs text-neutral-400 ml-1">
                                        Required for SRMIST students.
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setStep(1)}
                                    className="flex-1 h-12 rounded-xl"
                                >
                                    Back
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-[2] h-12 rounded-xl text-lg font-bold bg-primary hover:bg-primary/90"
                                >
                                    {isLoading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Creating Profile...</>
                                    ) : (
                                        'Complete Setup'
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
