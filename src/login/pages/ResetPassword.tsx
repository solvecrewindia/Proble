import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTheme } from '../../shared/context/ThemeContext';

export default function ResetPassword() {
    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { theme } = useTheme();
    const navigate = useNavigate();

    const password = watch('password');

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        setStatus('idle');
        setErrorMessage('');

        try {
            const { error } = await supabase.auth.updateUser({
                password: data.password
            });

            if (error) throw error;

            setStatus('success');
            // Redirect to login after a short delay
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (error: any) {
            console.error('Update password error:', error);
            setStatus('error');
            setErrorMessage(error.message || 'Failed to update password. Your reset link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center p-6 relative bg-background overflow-hidden">
                <div className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ${theme === 'dark' ? 'opacity-20' : 'opacity-100'}`}>
                    <div className="absolute top-[-10%] left-[-10%] w-[50vh] h-[50vh] bg-green-500/20 rounded-full blur-[100px]" />
                </div>
                
                <div className="w-full max-w-md bg-surface/50 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 text-center space-y-6 relative z-10 animate-in zoom-in-95 duration-500">
                    <div className="mx-auto w-20 h-20 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-2">
                        <CheckCircle2 className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Password Updated!</h2>
                    <p className="text-neutral-500 dark:text-neutral-400">
                        Your password has been successfully reset. <br />
                        Redirecting you to login...
                    </p>
                    <Button 
                        onClick={() => navigate('/login')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 rounded-xl"
                    >
                        Go to Login Now
                    </Button>
                </div>
            </div>
        );
    }

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
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Secure Reset</h2>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-2">
                        Please enter your new secure password below.
                    </p>
                </div>

                {status === 'error' && (
                    <div className="mb-6 p-4 rounded-xl text-sm font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 animate-in slide-in-from-top-2">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">New Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                            </div>
                            <Input
                                type={showPassword ? "text" : "password"}
                                {...register('password', {
                                    required: 'Password is required',
                                    minLength: { value: 6, message: 'Minimum 6 characters' }
                                })}
                                placeholder="Min. 6 characters"
                                className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl transition-all"
                                error={errors.password?.message as string}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-3.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 focus:outline-none"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ml-1">Confirm Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-neutral-400 dark:text-neutral-500 group-focus-within:text-primary transition-colors" />
                            </div>
                            <Input
                                type={showPassword ? "text" : "password"}
                                {...register('confirmPassword', {
                                    required: 'Please confirm your password',
                                    validate: value => value === password || 'Passwords do not match'
                                })}
                                placeholder="Re-type password"
                                className="h-12 pl-12 bg-background border-transparent ring-1 ring-neutral-200 dark:ring-neutral-700 focus:ring-2 focus:ring-primary/50 focus:border-primary rounded-xl transition-all"
                                error={errors.confirmPassword?.message as string}
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 font-bold rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600 text-white shadow-lg shadow-blue-500/20 disabled:opacity-70 transition-all font-black text-lg tracking-wide"
                    >
                        {isLoading ? 'Updating...' : 'Update Password'}
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <Link to="/login" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors inline-flex items-center">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Cancel & Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
