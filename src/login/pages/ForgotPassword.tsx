
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTheme } from '../../shared/context/ThemeContext';

export default function ForgotPassword() {
    const { register, handleSubmit, formState: { errors } } = useForm<{ email: string }>();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { theme } = useTheme();
    const navigate = useNavigate();

    const onSubmit = async ({ email }: { email: string }) => {
        setIsLoading(true);
        setMessage(null);

        try {
            // Note: Since you are in development with email confirmation likely disabled or unable to actually send emails without SMTP setup,
            // Supabase will still return a success response but the email might not arrive unless SMTP is configured.
            // However, this is the correct code implementation.

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                // Rate limit or other error
                throw error;
            }

            setMessage({
                type: 'success',
                text: 'Check your email for the password reset link.'
            });
        } catch (error: any) {
            console.error('Reset password error:', error);
            setMessage({
                type: 'error',
                text: error.message || 'Failed to send reset email. Please try again.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-6 sm:p-12 relative bg-background transition-colors duration-500 overflow-hidden">

            {/* Background Decorations */}
            <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-700 ${theme === 'dark' ? 'opacity-20' : 'opacity-100'}`}>
                <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-blue-500/20 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md bg-surface/50 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 dark:ring-white/10 transition-all relative z-10">
                <div className="text-center mb-8">
                    <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                        <Mail className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Forgot Password?</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">
                        No worries, we'll send you reset instructions.
                    </p>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Email Address</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                            </div>
                            <Input
                                type="email"
                                {...register('email', {
                                    required: 'Email is required',
                                    pattern: {
                                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                        message: "Invalid email address"
                                    }
                                })}
                                placeholder="Enter your email"
                                className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl transition-all text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
                                error={errors.email?.message}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 font-bold rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? 'Sending...' : (
                            <span className="flex items-center justify-center">
                                Send Reset Link <Send className="ml-2 h-4 w-4" />
                            </span>
                        )}
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <Link to="/login" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors inline-flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
