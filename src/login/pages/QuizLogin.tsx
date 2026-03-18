import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, School, AlertCircle, Home, User, Flag } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../../shared/context/AuthContext';
import { useTheme } from '../../shared/context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function QuizLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isLoading, login, signup, updateRegistrationNumber, loadSessionUser } = useAuth();
    const { theme } = useTheme();

    // Auto-Redirect for Already Authenticated Users
    useEffect(() => {
        if (!isLoading && user) {
            const searchParams = new URLSearchParams(location.search);
            const returnTo = searchParams.get('returnTo');
            if (returnTo) {
                navigate(decodeURIComponent(returnTo), { replace: true });
            } else {
                navigate('/');
            }
        }
    }, [user, isLoading, location.search, navigate]);

    // Quiz Flow State
    const [quizStage, setQuizStage] = useState<'email' | 'login' | 'signup'>('email');
    const [quizEmail, setQuizEmail] = useState('');
    const [quizLoading, setQuizLoading] = useState(false);
    const [quizError, setQuizError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [allowedDomain, setAllowedDomain] = useState<string | null>(null);

    // Fetch the quiz allowedDomain on mount to update the placeholder
    useEffect(() => {
        const fetchDomain = async () => {
            const quizIntent = localStorage.getItem('quiz_join_intent');
            if (quizIntent) {
                try {
                    const { data, error } = await supabase
                        .from('quizzes')
                        .select('settings')
                        .eq('code', quizIntent)
                        .maybeSingle();

                    if (!error && data?.settings?.allowedDomain) {
                        setAllowedDomain(data.settings.allowedDomain);
                    }
                } catch (err) {
                    console.error("Error fetching allowed domain:", err);
                }
            }
        };
        fetchDomain();
    }, []);

    const {
        register: registerQuizLogin,
        handleSubmit: handleSubmitQuizLogin,
        formState: { errors: errorsQuizLogin }
    } = useForm();

    const {
        register: registerQuizSignup,
        handleSubmit: handleSubmitQuizSignup,
        formState: { errors: errorsQuizSignup }
    } = useForm();

    const handleEmailSubmit = async () => {
        if (!quizEmail || !quizEmail.includes('@')) {
            setQuizError('Please enter a valid email');
            return;
        }

        const quizIntent = localStorage.getItem('quiz_join_intent');
        if (quizIntent) {
            try {
                const { data: quizDataList, error: quizDataError } = await supabase
                    .from('quizzes')
                    .select('settings')
                    .eq('code', quizIntent)
                    .limit(1);

                if (!quizDataError && quizDataList?.[0]) {
                    const quizData = quizDataList[0];
                    if (quizData.settings?.allowedDomain) {
                        if (!quizEmail.toLowerCase().endsWith(quizData.settings.allowedDomain.toLowerCase())) {
                            setQuizError(`This quiz is restricted to users from ${quizData.settings.allowedDomain} only.`);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error("Error checking quiz domain:", err);
            }
        }

        setQuizLoading(true);
        setQuizError('');
        try {
            // Check if user exists directly in profiles table
            const { data } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', quizEmail.toLowerCase())
                .maybeSingle();

            if (data && data.id) {
                // User exists, ask for their password
                setQuizStage('login');
            } else {
                // New user, ask for registration number and create password
                setQuizStage('signup');
            }
        } catch (err: any) {
            setQuizError(err.message || 'Error checking account');
        } finally {
            setQuizLoading(false);
        }
    };

    const onQuizLoginSubmit = async (data: any) => {
        try {
            setQuizLoading(true);
            setQuizError('');
            await login(quizEmail, data.password);
            await finishQuizLogin();
        } catch (error: any) {
            setQuizError(error.message || 'Invalid credentials');
        } finally {
            setQuizLoading(false);
        }
    };

    const onQuizSignupSubmit = async (data: any) => {
        try {
            setQuizLoading(true);
            setQuizError('');
            
            const { user, error } = await signup(
                quizEmail,
                data.password,
                data.userName,
                'student'
            );

            if (error) throw error;
            
            if (user && data.registrationNumber) {
                await updateRegistrationNumber(user.id, data.registrationNumber);
                await finishQuizLogin();
            }
        } catch (error: any) {
            if (error.message?.toLowerCase().includes('already registered')) {
                setQuizError('This email is already registered. Please login with your existing password.');
                setQuizStage('login');
            } else {
                setQuizError(error.message || 'Account setup failed');
            }
        } finally {
            setQuizLoading(false);
        }
    };

    const finishQuizLogin = async () => {
        // Sync the fresh session into AuthContext state before navigating.
        await loadSessionUser();

        const searchParams = new URLSearchParams(location.search);
        const returnTo = searchParams.get('returnTo');
        if (returnTo) {
            navigate(decodeURIComponent(returnTo), { replace: true });
        } else {
            navigate('/');
        }
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    return (
        <div className="min-h-screen flex flex-col lg:flex-row bg-background transition-colors duration-500 overflow-hidden relative">
            {/* Background Decorations (Global) */}
            <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-700 ${theme === 'dark' ? 'opacity-20' : 'opacity-100'}`}>
                <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-blue-500/20 rounded-full blur-[100px]" />
            </div>

            {/* Back to Home Button */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-text dark:text-white backdrop-blur-md border border-white/20 shadow-lg transition-all group"
                title="Back to Home"
            >
                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

            {/* Report Problem Button */}
            <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSf5J-sAjj4-yM6Dmbf9duPZI5H0hvWahH5osQZPVLcnUVHWjA/viewform?pli=1"
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 text-text dark:text-white backdrop-blur-md border border-white/20 shadow-lg transition-all group flex items-center gap-2"
                title="Report a Problem"
            >
                <Flag className="w-5 h-5 group-hover:scale-110 transition-transform text-red-500" />
                <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Report Problem</span>
            </a>

            {/* Left Side: Visuals & Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative z-10">
                <div className="relative w-full max-w-2xl aspect-square flex items-center justify-center">
                    {/* Abstract Decorative Rings */}
                    <div className="absolute inset-0 border-[1px] border-text/10 dark:border-white/10 rounded-full animate-[spin_60s_linear_infinite]" />
                    <div className="absolute inset-12 border-[1px] border-text/5 dark:border-white/5 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                    <div className="absolute inset-24 border-[1px] border-text/10 dark:border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />

                    {/* Central Content */}
                    <div className="text-center z-10 backdrop-blur-xl bg-surface/30 p-12 rounded-[3rem] border border-white/20 shadow-2xl flex flex-col items-center">
                        <img
                            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
                            alt="Proble Logo"
                            className="w-64 h-auto mb-8 hover:scale-105 transition-transform duration-300 drop-shadow-2xl"
                        />
                        <p className="text-xl font-medium text-muted dark:text-neutral-300 max-w-md mx-auto leading-relaxed">
                            The ultimate platform for modern education. <br />
                            <span className="text-primary">Empowering</span> teachers, <span className="text-blue-500">Elevating</span> students.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Auth Forms */}
            <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative z-20">
                <div className="w-full max-w-md bg-surface/50 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 transition-all">
                    
                    <div className="animate-in fade-in zoom-in-95 duration-500">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                            </div>
                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Join Assessment</h2>
                            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">Enter your email to continue to your test.</p>
                        </div>

                        {quizError && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> {quizError}
                            </div>
                        )}

                        {/* Stage 1: Email Input */}
                        {quizStage === 'email' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Email</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <Input
                                            type="email"
                                            value={quizEmail}
                                            onChange={(e) => setQuizEmail(e.target.value)}
                                            placeholder={allowedDomain 
                                                ? `Enter your ${allowedDomain.replace(/^@/, '').split('.')[0].toUpperCase()} email` 
                                                : "Enter your email"}
                                            className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl transition-all"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleEmailSubmit();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                                <Button
                                    onClick={handleEmailSubmit}
                                    disabled={quizLoading}
                                    className="w-full h-12 font-bold rounded-xl bg-primary text-white disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {quizLoading ? 'Checking...' : 'Continue'}
                                </Button>

                            </div>
                        )}

                        {/* Stage 2: Login for Existing User */}
                        {quizStage === 'login' && (
                            <form onSubmit={handleSubmitQuizLogin(onQuizLoginSubmit)} className="space-y-4">
                                <div className="text-center mb-4">
                                    <p className="text-sm font-medium text-primary">Welcome back!</p>
                                    <p className="text-xs text-neutral-500">{quizEmail}</p>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            {...registerQuizLogin('password', { required: 'Password is required' })}
                                            placeholder="Enter your password"
                                            className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl pr-10"
                                            error={errorsQuizLogin.password?.message as string}
                                        />
                                        <button
                                            type="button"
                                            onClick={togglePasswordVisibility}
                                            className="absolute right-4 top-3.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 focus:outline-none transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <div className="flex justify-end pr-1">
                                        <Link 
                                            to="/forgot-password" 
                                            className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={quizLoading}
                                    className="w-full h-12 font-bold rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg disabled:opacity-60"
                                >
                                    {quizLoading ? 'Logging in...' : 'Login & Join Assessment'}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setQuizStage('email')}
                                    className="w-full text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors mt-2"
                                >
                                    Change email address
                                </button>
                            </form>
                        )}

                        {/* Stage 2: Signup for New User */}
                        {quizStage === 'signup' && (
                            <form onSubmit={handleSubmitQuizSignup(onQuizSignupSubmit)} className="space-y-4">
                                <div className="text-center mb-4">
                                    <p className="text-sm font-medium text-primary">Creating new account</p>
                                    <p className="text-xs text-neutral-500">for {quizEmail}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Your Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <User className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <Input
                                            {...registerQuizSignup('userName', { required: 'Name is required' })}
                                            placeholder="e.g. John Doe"
                                            autoComplete="new-password"
                                            defaultValue=""
                                            className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl"
                                            error={errorsQuizSignup.userName?.message as string}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Registration Number</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <School className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <Input
                                            {...registerQuizSignup('registrationNumber', { required: 'Registration number is required' })}
                                            placeholder="e.g. RA2111026010001"
                                            className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl"
                                            error={errorsQuizSignup.registrationNumber?.message as string}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Create Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            {...registerQuizSignup('password', {
                                                required: 'Password is required',
                                                minLength: { value: 6, message: 'Minimum 6 characters' }
                                            })}
                                            placeholder="••••••••"
                                            className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl pr-10"
                                            error={errorsQuizSignup.password?.message as string}
                                        />
                                        <button
                                            type="button"
                                            onClick={togglePasswordVisibility}
                                            className="absolute right-4 top-3.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 focus:outline-none transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={quizLoading}
                                    className="w-full h-12 font-bold rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white shadow-lg disabled:opacity-60"
                                >
                                    {quizLoading ? 'Creating...' : 'Create & Join'}
                                </Button>
                                <button
                                    type="button"
                                    onClick={() => setQuizStage('email')}
                                    className="w-full text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors mt-2"
                                >
                                    Change email address
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="mt-8 text-center text-sm text-muted">
                    &copy; {new Date().getFullYear()} Proble. All rights reserved.
                </div>
            </div>
        </div>
    );
}
