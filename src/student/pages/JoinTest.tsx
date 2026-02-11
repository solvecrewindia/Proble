import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { Key, Clock, FileText, AlertCircle, Play, QrCode, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../shared/components/Card';
import { Html5QrcodeScanner } from 'html5-qrcode';

const JoinTest = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const urlCode = searchParams.get('code');

    const [code, setCode] = useState(urlCode || '');

    const [verifying, setVerifying] = useState(!!urlCode);
    const [quiz, setQuiz] = useState<any>(null);
    const [error, setError] = useState('');

    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (urlCode) {
            handleVerifyCode(urlCode);
        }

        // Auto-start scanner if requested
        if (searchParams.get('scan') === 'true') {
            setScanning(true);
        }
    }, [urlCode, searchParams]);

    useEffect(() => {
        if (scanning) {
            // Include a small delay to ensure the element exists
            const timer = setTimeout(() => {
                if (!scannerRef.current) {
                    const scanner = new Html5QrcodeScanner(
                        "reader",
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                            aspectRatio: 1.0
                        },
                        /* verbose= */ false
                    );
                    scannerRef.current = scanner;
                    scanner.render(onScanSuccess, onScanFailure);
                }
            }, 100);

            return () => {
                clearTimeout(timer);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
                    scannerRef.current = null;
                }
            };
        }
    }, [scanning]);

    const onScanSuccess = (decodedText: string, decodedResult: any) => {
        console.log(`Scan result: ${decodedText}`, decodedResult);
        if (scannerRef.current) {
            scannerRef.current.clear().catch(err => console.error("Failed to clear scanner on success", err));
            scannerRef.current = null;
        }
        setScanning(false);
        setCode(decodedText);
        handleVerifyCode(decodedText);
    };

    const onScanFailure = (error: any) => {
        // console.warn(`Code scan error = ${error}`);
    };

    const handleVerifyCode = async (codeToVerify: string) => {
        setVerifying(true);
        setError('');

        try {
            // 1. Get User
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Please login to continue");

            // 2. Fetch Quiz
            const { data: quizDataList, error: quizError } = await supabase
                .from('quizzes')
                .select('*')
                .eq('code', codeToVerify)
                .limit(1);

            if (quizError) throw quizError;
            const quizData = quizDataList?.[0];
            if (!quizData) throw new Error('Quiz not found');

            // 3. Fetch Question Count
            const { count } = await supabase
                .from('questions')
                .select('*', { count: 'exact', head: true })
                .eq('quiz_id', quizData.id);

            quizData.question_count = count || 0;

            // 4. Check for existing attempts - ONLY for Master Tests
            if (quizData.type === 'master') {
                const { data: existingAttempts, error: attemptError } = await supabase
                    .from('quiz_results')
                    .select('id')
                    .eq('quiz_id', quizData.id)
                    .eq('student_id', user.id)
                    .limit(1);

                if (attemptError) {
                    console.error("Error checking attempts:", attemptError);
                    throw new Error("Failed to verify attempt status");
                }

                if (existingAttempts && existingAttempts.length > 0) {
                    throw new Error("You have already attempted this assessment. Retakes are not allowed.");
                }
            }

            // 5. Check for Domain Restriction
            if (quizData.settings?.allowedDomain) {
                const userEmail = user.email || '';
                if (!userEmail.endsWith(quizData.settings.allowedDomain)) {
                    throw new Error(`This quiz is restricted to users from ${quizData.settings.allowedDomain} only.`);
                }
            }

            setQuiz(quizData);
        } catch (err: any) {
            console.error('Error fetching quiz:', err);
            setError(err.message || 'Invalid access code. Please check and try again.');
            setQuiz(null);
        } finally {
            setVerifying(false);
        }
    };

    const handleManualJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (code) handleVerifyCode(code);
    };

    const handleStartTest = () => {
        if (quiz) {
            if (quiz.type === 'live') {
                navigate(`/student/live/${quiz.id}`);
            } else {
                navigate(`/student/test/${quiz.id}`);
            }
        }
    };

    if (verifying) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p className="text-muted">Verifying access code...</p>
            </div>
        );
    }

    if (quiz) {
        return (
            <div className="max-w-2xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Card className="p-8 border-neutral-300 dark:border-neutral-600 bg-surface">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary mb-4">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-text mb-2">{quiz.title}</h1>
                        <p className="text-muted text-lg">{quiz.description || 'No description provided.'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {quiz.type !== 'live' && (
                            <div className="p-4 rounded-xl bg-background border border-neutral-300 dark:border-neutral-600 flex items-center justify-center flex-col gap-2">
                                <Clock className="w-6 h-6 text-primary" />
                                <span className="font-medium text-text">{quiz.settings?.duration || 60} mins</span>
                                <span className="text-xs text-muted">Duration</span>
                            </div>
                        )}
                        <div className={`p-4 rounded-xl bg-background border border-neutral-300 dark:border-neutral-600 flex items-center justify-center flex-col gap-2 ${quiz.type === 'live' ? 'col-span-2' : ''}`}>
                            <AlertCircle className="w-6 h-6 text-primary" />
                            <span className="font-medium text-text">{quiz.question_count !== undefined ? quiz.question_count : 'N/A'}</span>
                            <span className="text-xs text-muted">Questions</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <Button
                            className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
                            onClick={handleStartTest}
                        >
                            <Play className="w-5 h-5 mr-2" /> Start Test
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                                setQuiz(null);
                                setCode('');
                                navigate('/student/join');
                            }}
                        >
                            Cancel
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto mt-20 relative">
            {/* Scanner Overlay */}
            {scanning && (
                <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center p-4">
                    <div className="bg-surface p-4 rounded-2xl w-full max-w-sm relative">
                        <button
                            onClick={() => {
                                setScanning(false);
                                if (scannerRef.current) {
                                    scannerRef.current.clear().catch(console.error);
                                    scannerRef.current = null;
                                }
                            }}
                            className="absolute top-2 right-2 p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors z-10"
                        >
                            <X className="w-6 h-6 text-text" />
                        </button>
                        <h2 className="text-xl font-bold text-center mb-4 text-text">Scan QR Code</h2>
                        <div id="reader" className="w-full rounded-xl overflow-hidden"></div>
                        <p className="text-center text-sm text-muted mt-4">Point your camera at a Master Test QR Code</p>
                    </div>
                </div>
            )}

            <div className="bg-surface p-8 rounded-2xl border border-neutral-300 dark:border-neutral-600 shadow-sm text-center space-y-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
                    <Key className="w-8 h-8" />
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-text">Join Quiz</h1>
                    <p className="text-muted mt-2">Enter the access code provided by your instructor to join the test.</p>
                </div>

                <div className="space-y-4">
                    {/* Mobile Camera Button - Visible mainly on mobile but useful generally */}
                    <Button
                        type="button"
                        onClick={() => setScanning(true)}
                        className="w-full h-12 text-lg bg-neutral-100 dark:bg-neutral-800 text-text hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600"
                    >
                        <QrCode className="w-5 h-5 mr-2" /> Scan QR Code
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-neutral-300 dark:border-neutral-700" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-surface px-2 text-muted-foreground">Or enter code</span>
                        </div>
                    </div>

                    <form onSubmit={handleManualJoin} className="space-y-4">
                        <input
                            type="text"
                            placeholder="ENTER CODE"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="w-full h-12 text-center text-xl font-mono tracking-widest uppercase rounded-xl border border-neutral-300 dark:border-neutral-600 bg-background text-text focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                            maxLength={8}
                        />
                        {error && (
                            <p className="text-sm text-red-500 flex items-center justify-center gap-1">
                                <AlertCircle className="w-4 h-4" /> {error}
                            </p>
                        )}
                        <Button type="submit" className="w-full h-12 text-lg" disabled={!code}>
                            Verify & Join
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default JoinTest;
