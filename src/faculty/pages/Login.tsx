import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useAuth } from '../context/AuthContext';

interface LoginForm {
    email: string;
}

export default function Login() {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>();
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [loginError, setLoginError] = useState<string | null>(null);

    const from = location.state?.from?.pathname || '/faculty';

    const loginMutation = useMutation({
        mutationFn: async (data: LoginForm) => {
            const response = await fetch('/api/faculty/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            return response.json();
        },
        onSuccess: (data) => {
            login(data.token, data.user);
            navigate(from, { replace: true });
        },
        onError: () => {
            setLoginError('Invalid credentials. Please try again.');
        },
    });

    const onSubmit = (data: LoginForm) => {
        setLoginError(null);
        loginMutation.mutate(data);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary">PROBLE</h1>
                    <p className="mt-2 text-neutral-600">Faculty Portal Access</p>
                </div>

                <Card className="border-t-4 border-t-primary shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-xl text-center">Secure Login</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {loginError && (
                                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                    <AlertCircle className="h-4 w-4" />
                                    {loginError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-5 w-5 text-neutral-400" />
                                    <Input
                                        {...register('email', {
                                            required: 'Email is required',
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "Invalid email address"
                                            }
                                        })}
                                        placeholder="Enter your faculty email"
                                        className="pl-10"
                                        error={errors.email?.message}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                isLoading={loginMutation.isPending}
                            >
                                Sign In <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>

                            <div className="text-center text-xs text-neutral-500">
                                <p>Protected by Proble Secure Access</p>
                                <p className="mt-1">Session expires in 8 hours</p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
