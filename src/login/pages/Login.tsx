import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Lock, Mail, User as UserIcon, ArrowRight, Eye, EyeOff, Home, GraduationCap, School } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../../shared/context/AuthContext';
import { useTheme } from '../../shared/context/ThemeContext';

type Tab = 'signin' | 'signup';
type Role = 'student' | 'teacher' | null;

export default function Login() {
    const [activeTab, setActiveTab] = useState<Tab>('signin');
    const [signupStep, setSignupStep] = useState(1);
    const [selectedRole, setSelectedRole] = useState<Role>(null);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const { login, signup } = useAuth();
    const { theme } = useTheme();

    // Form hooks for Sign In
    const {
        register: registerSignIn,
        handleSubmit: handleSubmitSignIn,
        setValue: setSignInValue,
        formState: { errors: errorsSignIn }
    } = useForm();

    const [rememberMe, setRememberMe] = useState(false);

    React.useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setSignInValue('email', savedEmail);
            setRememberMe(true);
        }
    }, [setSignInValue]);




    const [showPassword, setShowPassword] = useState(false);

    // Form hooks for Sign Up
    const {
        register: registerSignUp,
        handleSubmit: handleSubmitSignUp,
        trigger: triggerSignUp,
        setValue: setSignUpValue,
        formState: { errors: errorsSignUp }
    } = useForm();

    const onSignUpStep1 = async () => {
        // Just validate generic fields if needed, role is selected manually
        if (!selectedRole) {
            alert("Please select a role to continue.");
            return;
        }
        setSignUpValue('role', selectedRole); // Manually set role in form
        setSignupStep(2);
    };

    const onSignUpStep2 = async () => {
        const result = await triggerSignUp(['username', 'email']);
        if (result) {
            setSignupStep(3);
        }
    };


    const onSignUpSubmit = async (data: any) => {
        console.log('Sign Up Data:', { ...data, role: selectedRole });
        try {
            const { user, error } = await signup(data.email, data.password, data.username, selectedRole!);
            if (error) {
                alert(`Registration failed: ${error.message}`);
                console.error(error);
                return;
            }
            if (user) {
                alert('Registration successful! Please check your email for confirmation if enabled, or sign in.');
                setActiveTab('signin');
                setSignupStep(1);
                setSelectedRole(null);
            }
        } catch (err) {
            console.error('Unexpected error during signup:', err);
            alert('An unexpected error occurred.');
        }

    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    const handleRoleSelect = (role: Role) => {
        setSelectedRole(role);
    };

    const onSignIn = async (data: any) => {
        try {
            setIsLoading(true);
            const user = await login(data.email, data.password);

            if (user) {
                if (rememberMe) {
                    localStorage.setItem('rememberedEmail', data.email);
                } else {
                    localStorage.removeItem('rememberedEmail');
                }

                // Check if there's a return path in state OR query params
                const state = (location as any).state;
                const searchParams = new URLSearchParams(location.search);
                const returnTo = searchParams.get('returnTo');

                if (returnTo) {
                    const target = decodeURIComponent(returnTo);
                    navigate(target, { replace: true });
                    return;
                }

                if (state?.from?.pathname) {
                    const from = state.from.pathname + (state.from.search || '');
                    navigate(from, { replace: true });
                    return;
                }

                // Determine path based on role
                let path = '/';
                if (user.role === 'admin') path = '/admin';
                else if (user.role === 'faculty' || user.role === 'teacher') path = '/faculty';

                navigate(path);
            } else {
                console.error("Login: User object is null/undefined after successful login call.");
                alert("Login succeeded, but user profile could not be loaded. Please contact support.");
            }
        } catch (error: any) {
            console.error('Login: failed with error:', error);
            alert('Login failed: ' + (error.message || 'Invalid credentials'));
        } finally {
            setIsLoading(false);
        }
    };

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

                    {/* Tab Switcher */}
                    <div className="flex p-1 bg-gray-100 dark:bg-neutral-800 rounded-2xl mb-8 relative">
                        {/* Sliding Indicator */}
                        <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-neutral-700 rounded-xl shadow-sm transition-all duration-300 ease-spring ${activeTab === 'signin' ? 'left-1' : 'left-[calc(50%+4px)]'}`} />

                        <button
                            onClick={() => { setActiveTab('signin'); setSignupStep(1); }}
                            className={`flex-1 relative z-10 py-3 text-sm font-semibold rounded-xl transition-colors duration-200 ${activeTab === 'signin' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => setActiveTab('signup')}
                            className={`flex-1 relative z-10 py-3 text-sm font-semibold rounded-xl transition-colors duration-200 ${activeTab === 'signup' ? 'text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                        >
                            Create Account
                        </button>
                    </div>

                    {/* Sign In View */}
                    {activeTab === 'signin' && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Welcome Back!</h2>
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">Enter your credentials to access your dashboard.</p>
                            </div>

                            <form onSubmit={handleSubmitSignIn(onSignIn)} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Email</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <Input
                                            type="email"
                                            {...registerSignIn('email', { required: 'Email is required' })}
                                            placeholder="Enter your email"
                                            className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                            error={errorsSignIn.email?.message as string}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                                        </div>
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            {...registerSignIn('password', { required: 'Password is required' })}
                                            placeholder="Enter your password"
                                            className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl pr-10 transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                            error={errorsSignIn.password?.message as string}
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

                                <div className="flex items-center justify-between pt-2">
                                    <label className="flex items-center space-x-2 cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                className="peer sr-only"
                                                checked={rememberMe}
                                                onChange={(e) => setRememberMe(e.target.checked)}
                                            />
                                            <div className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-300 dark:border-neutral-600 rounded bg-background peer-checked:bg-primary peer-checked:border-primary transition-all"></div>
                                            <svg className="w-3.5 h-3.5 absolute top-1 left-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <span className="text-sm text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 transition-colors">Remember Me</span>
                                    </label>
                                    <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:text-blue-600 transition-colors">Forgot Password?</Link>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-14 text-lg font-bold rounded-2xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all duration-200 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? 'Logging in...' : 'Login'}
                                </Button>
                            </form>
                        </div>
                    )}

                    {/* Sign Up View */}
                    {activeTab === 'signup' && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500">

                            {/* Step 1: Role Selection */}
                            {signupStep === 1 && (
                                <div className="space-y-6">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Choose your Role</h2>
                                        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">To get started, tell us who you are.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Student Option */}
                                        <div
                                            onClick={() => handleRoleSelect('student')}
                                            className={`cursor-pointer group relative p-6 rounded-2xl border-2 transition-all duration-200 ${selectedRole === 'student' ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10' : 'border-neutral-200 dark:border-neutral-700 bg-background hover:border-primary/50'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedRole === 'student' ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                <GraduationCap className="h-6 w-6" />
                                            </div>
                                            <h3 className={`font-bold text-lg ${selectedRole === 'student' ? 'text-primary' : 'text-neutral-900 dark:text-white'}`}>Student</h3>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">I am here to learn and take tests.</p>
                                            {selectedRole === 'student' && <div className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full animate-pulse" />}
                                        </div>

                                        {/* Teacher Option */}
                                        <div
                                            onClick={() => handleRoleSelect('teacher')}
                                            className={`cursor-pointer group relative p-6 rounded-2xl border-2 transition-all duration-200 ${selectedRole === 'teacher' ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10' : 'border-neutral-200 dark:border-neutral-700 bg-background hover:border-primary/50'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedRole === 'teacher' ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 group-hover:bg-primary/10 group-hover:text-primary'}`}>
                                                <School className="h-6 w-6" />
                                            </div>
                                            <h3 className={`font-bold text-lg ${selectedRole === 'teacher' ? 'text-primary' : 'text-neutral-900 dark:text-white'}`}>Teacher</h3>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">I am here to manage courses and quizzes.</p>
                                            {selectedRole === 'teacher' && <div className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full animate-pulse" />}
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={onSignUpStep1}
                                        disabled={!selectedRole}
                                        className={`w-full h-14 text-lg font-bold rounded-2xl transition-all duration-200 ${selectedRole ? 'bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5' : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'}`}
                                    >
                                        Continue <ArrowRight className="ml-2 h-5 w-5" />
                                    </Button>
                                </div>
                            )}

                            {/* Step 2: User Info */}
                            {signupStep === 2 && (
                                <div className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-300">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Create Account</h2>
                                        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">Enter your details for your <span className="font-semibold text-primary capitalize">{selectedRole}</span> account.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Username</label>
                                            <Input
                                                {...registerSignUp('username', { required: 'Username is required' })}
                                                placeholder="Choose a username"
                                                className="h-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                                error={errorsSignUp.username?.message as string}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Email</label>
                                            <Input
                                                type="email"
                                                {...registerSignUp('email', { required: 'Email is required', pattern: { value: /^[a-zA-Z0-9._%+-]+@(gmail\.com|srmist\.edu\.in)$/, message: "Please enter a valid Gmail or SRMIST email address" } })}
                                                placeholder="yourname@gmail.com"
                                                className="h-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                                error={errorsSignUp.email?.message as string}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setSignupStep(1)}
                                            className="w-1/3 h-12 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            type="button"
                                            onClick={onSignUpStep2}
                                            className="flex-1 h-12 font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                                        >
                                            Next <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Password & Confirm */}
                            {signupStep === 3 && (
                                <form onSubmit={handleSubmitSignUp(onSignUpSubmit)} className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-300">
                                    <div className="text-center mb-6">
                                        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Secure your Account</h2>
                                        <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">Almost there! Create a strong password.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Password</label>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    {...registerSignUp('password', { required: 'Password is required' })}
                                                    placeholder="Create a password"
                                                    className="h-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl pr-10 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                                    error={errorsSignUp.password?.message as string}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={togglePasswordVisibility}
                                                    className="absolute right-3 top-3.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 focus:outline-none"
                                                >
                                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 mt-6">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setSignupStep(2)}
                                            className="w-1/3 h-12 rounded-xl text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="flex-1 h-12 font-bold rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20"
                                        >
                                            Create Account
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center text-sm text-muted">
                    &copy; {new Date().getFullYear()} Proble. All rights reserved.
                </div>
            </div>
        </div >
    );
}
