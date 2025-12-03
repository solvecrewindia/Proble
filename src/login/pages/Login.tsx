import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { LoginTopbar } from '../components/layout/LoginTopbar';

type Tab = 'signin' | 'signup';

export default function Login() {
    const [activeTab, setActiveTab] = useState<Tab>('signin');
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // Form hooks for Sign In
    const {
        register: registerSignIn,
        handleSubmit: handleSubmitSignIn,
        formState: { errors: errorsSignIn }
    } = useForm();

    // Form hooks for Sign Up
    const {
        register: registerSignUp,
        handleSubmit: handleSubmitSignUp,
        trigger: triggerSignUp,
        formState: { errors: errorsSignUp }
    } = useForm();

    const [signupStep, setSignupStep] = useState(1);

    const from = location.state?.from?.pathname || '/faculty';

    const onSignIn = (data: any) => {
        console.log('Sign In Data:', data);
        login('mock-token', { name: data.username, email: 'test@example.com' });
        navigate(from, { replace: true });
    };

    const onSignUpStep1 = async () => {
        const result = await triggerSignUp(['username', 'email']);
        if (result) {
            setSignupStep(2);
        }
    };

    const onSignUpSubmit = (data: any) => {
        console.log('Sign Up Data:', data);
        alert('Registration successful! Please sign in.');
        setActiveTab('signin');
        setSignupStep(1);
    };

    const togglePasswordVisibility = () => setShowPassword(!showPassword);

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-white">
            {/* Left Side - Cyan Gradient & Branding */}
            <div className="hidden md:flex md:w-1/2 bg-cyan-500 relative overflow-hidden items-center justify-center p-12">
                {/* Geometric Shapes */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Large Ring */}
                    <div className="absolute -top-24 -left-24 w-96 h-96 border-[40px] border-white/10 rounded-full blur-sm"></div>
                    {/* Small Ring */}
                    <div className="absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2 w-64 h-64 border-[20px] border-white/10 rounded-full"></div>
                    {/* Dots */}
                    <div className="absolute top-1/4 right-1/4 w-4 h-4 bg-white/30 rounded-full"></div>
                    <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white/40 rounded-full"></div>
                    <div className="absolute top-10 right-10 w-6 h-6 border-2 border-white/20 rounded-full"></div>
                </div>

                <div className="relative z-10 text-white max-w-lg">
                    <div className="mb-8">
                        <span className="text-4xl font-bold text-white tracking-tight">Pro<span className="text-cyan-100">ble</span></span>
                    </div>
                    <h1 className="text-5xl font-bold mb-6 leading-tight">
                        Welcome!
                    </h1>
                    <p className="text-cyan-50 text-lg font-medium leading-relaxed">
                        Empowering educators, elevating learners By Proble.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 md:p-12 bg-white relative">
                {/* Mobile Topbar (only visible on small screens if needed, or just absolute logo) */}
                <div className="md:hidden absolute top-6 left-6">
                    <span className="text-2xl font-bold text-neutral-900 tracking-tight">Pro<span className="text-primary">ble</span></span>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div className="text-center md:text-left">
                        <h2 className="text-3xl font-bold text-neutral-900">
                            {activeTab === 'signin' ? 'Login' : 'Create Account'}
                        </h2>
                        <p className="mt-2 text-neutral-500">
                            {activeTab === 'signin'
                                ? 'Welcome back! Please login to your account.'
                                : 'Fill in the details below to create a new account.'}
                        </p>
                    </div>

                    {/* Tab Switcher (Subtle) */}
                    <div className="flex space-x-6 border-b border-neutral-100 mb-8">
                        <button
                            onClick={() => setActiveTab('signin')}
                            className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'signin'
                                ? 'text-cyan-600'
                                : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                        >
                            Login
                            {activeTab === 'signin' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 rounded-t-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('signup')}
                            className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'signup'
                                ? 'text-cyan-600'
                                : 'text-neutral-400 hover:text-neutral-600'
                                }`}
                        >
                            Sign Up
                            {activeTab === 'signup' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 rounded-t-full" />
                            )}
                        </button>
                    </div>

                    {/* Sign In Form */}
                    {activeTab === 'signin' && (
                        <form onSubmit={handleSubmitSignIn(onSignIn)} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-neutral-700">User Name</label>
                                    <Input
                                        {...registerSignIn('username', { required: 'Username is required' })}
                                        placeholder="Enter your username"
                                        className="h-12 bg-neutral-50 border-neutral-200 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl"
                                        error={errorsSignIn.username?.message as string}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-neutral-700">Password</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            {...registerSignIn('password', { required: 'Password is required' })}
                                            placeholder="Enter your password"
                                            className="h-12 bg-neutral-50 border-neutral-200 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl pr-10"
                                            error={errorsSignIn.password?.message as string}
                                        />
                                        <button
                                            type="button"
                                            onClick={togglePasswordVisibility}
                                            className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-neutral-300 text-cyan-600 focus:ring-cyan-500" />
                                    <span className="text-sm text-neutral-500">Remember Me</span>
                                </label>
                                <a href="#" className="text-sm font-medium text-cyan-600 hover:text-cyan-700">Forgot Password?</a>
                            </div>

                            <Button type="submit" className="w-full h-12 text-base font-semibold bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 rounded-xl transition-all">
                                Login
                            </Button>
                        </form>
                    )}

                    {/* Sign Up Form */}
                    {activeTab === 'signup' && (
                        <form onSubmit={handleSubmitSignUp(onSignUpSubmit)} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                {signupStep === 1 && (
                                    <>
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <label className="text-sm font-medium text-neutral-700">User Name</label>
                                            <Input
                                                {...registerSignUp('username', { required: 'Username is required' })}
                                                placeholder="Choose a username"
                                                className="h-12 bg-neutral-50 border-neutral-200 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl"
                                                error={errorsSignUp.username?.message as string}
                                            />
                                        </div>

                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300 delay-75">
                                            <label className="text-sm font-medium text-neutral-700">Gmail</label>
                                            <Input
                                                type="email"
                                                {...registerSignUp('email', {
                                                    required: 'Gmail is required',
                                                    pattern: {
                                                        value: /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
                                                        message: "Please enter a valid Gmail address"
                                                    }
                                                })}
                                                placeholder="username@gmail.com"
                                                className="h-12 bg-neutral-50 border-neutral-200 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl"
                                                error={errorsSignUp.email?.message as string}
                                            />
                                        </div>
                                    </>
                                )}

                                {signupStep === 2 && (
                                    <>
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                                            <label className="text-sm font-medium text-neutral-700">Role</label>
                                            <select
                                                {...registerSignUp('role', { required: 'Role is required' })}
                                                className="w-full h-12 px-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all text-sm text-neutral-700"
                                            >
                                                <option value="">Select Role</option>
                                                <option value="student">Student</option>
                                                <option value="teacher">Teacher</option>
                                            </select>
                                            {errorsSignUp.role && <p className="text-xs text-red-500 mt-1">{errorsSignUp.role.message as string}</p>}
                                        </div>

                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-right-2 duration-300 delay-75">
                                            <label className="text-sm font-medium text-neutral-700">Password</label>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    {...registerSignUp('password', { required: 'Password is required' })}
                                                    placeholder="Create a password"
                                                    className="h-12 bg-neutral-50 border-neutral-200 focus:border-cyan-500 focus:ring-cyan-500/20 rounded-xl pr-10"
                                                    error={errorsSignUp.password?.message as string}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={togglePasswordVisibility}
                                                    className="absolute right-3 top-3.5 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                                                >
                                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {signupStep === 1 ? (
                                <Button
                                    type="button"
                                    onClick={onSignUpStep1}
                                    className="w-full h-12 text-base font-semibold bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 rounded-xl transition-all mt-2"
                                >
                                    Continue <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            ) : (
                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        onClick={() => setSignupStep(1)}
                                        className="w-1/3 h-12 text-base font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded-xl transition-all mt-2"
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 h-12 text-base font-semibold bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/30 rounded-xl transition-all mt-2"
                                    >
                                        Create Account
                                    </Button>
                                </div>
                            )}
                        </form>
                    )}

                    <div className="text-center mt-8">
                        <p className="text-sm text-neutral-500">
                            {activeTab === 'signin' ? "New User? " : "Already have an account? "}
                            <button
                                onClick={() => setActiveTab(activeTab === 'signin' ? 'signup' : 'signin')}
                                className="font-semibold text-cyan-600 hover:text-cyan-700 transition-colors"
                            >
                                {activeTab === 'signin' ? "Signup" : "Login"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
