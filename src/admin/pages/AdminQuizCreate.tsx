import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Save, ChevronRight, ChevronLeft, Check, ArrowLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '../../faculty/components/ui/Button'; // Reusing components
import { Card, CardContent } from '../../faculty/components/ui/Card';
import { cn } from '../../faculty/lib/utils';
import { useAuth } from '../../shared/context/AuthContext';

// Reusing Steps from Faculty
import { AdminStepMetadata } from '../components/quiz/AdminStepMetadata';
import { AdminStepQuestions } from '../components/quiz/AdminStepQuestions';
import { StepPreview } from '../../faculty/components/quiz/StepPreview';
import { AdminStepSchedule } from '../components/quiz/AdminStepSchedule';
// Skipping StepType as we define type/category via URL

const STEPS = [
    { id: 'meta', label: 'Details', component: AdminStepMetadata },
    { id: 'questions', label: 'Questions', component: AdminStepQuestions },
    { id: 'preview', label: 'Preview', component: StepPreview },
    { id: 'schedule', label: 'Publish', component: AdminStepSchedule },
];

export default function AdminQuizCreate() {
    const navigate = useNavigate();
    const { category } = useParams();
    const { user: contextUser } = useAuth(); // Get user from context
    const [currentStep, setCurrentStep] = useState(0);
    const [quizData, setQuizData] = useState<any>({
        title: '',
        description: '',
        type: category ? category.toLowerCase() : 'global', // Set type from URL category
        settings: {
            duration: 60,
            passingScore: 40,
            antiCheatLevel: 'standard',
            allowRetake: false,
            modes: ['practice'], // Default modes
            category: category ? category.toUpperCase() : 'GLOBAL' // Injected category
        }
    });

    const [questions, setQuestions] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Initial Setup & ID Generation
    useEffect(() => {
        if (!quizData.id) {
            // Generate a stable ID for new quizzes to ensure image paths are valid before first save
            const newId = uuidv4();
            setQuizData((prev: any) => ({ ...prev, id: newId }));
        }

        if (category) {
            setQuizData((prev: any) => ({
                ...prev,
                settings: {
                    ...prev.settings,
                    category: category.toUpperCase()
                }
            }));
        }
    }, [category]);


    // Generating access code
    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    // Autosave & Final Save Logic
    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            console.log("AdminQuizCreate: saveMutation start", { data, contextUser });

            // Check for emergency bypass first
            let userId = contextUser?.id;

            if (contextUser?.isFallback) {
                console.log("AdminQuizCreate: Using fallback user", userId);
            } else {
                console.log("AdminQuizCreate: Verifying standard auth...");
                // Verify with server if not in bypass mode
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        userId = user.id;
                        console.log("AdminQuizCreate: Standard auth verified", userId);
                    } else {
                        console.warn("AdminQuizCreate: Standard auth getUser returned no user");
                        throw new Error("Not authenticated (getUser failed)");
                    }
                } catch (e) {
                    console.error("AdminQuizCreate: Standard auth check failed", e);
                    throw e;
                }
            }

            if (!userId) {
                console.error("AdminQuizCreate: No userId found");
                throw new Error("Not authenticated");
            }

            // USE CLIENT-SIDE ID to avoid RLS 'select' issues
            const quizId = (data as any).id;

            const quizPayload = {
                id: quizId,
                title: data.title,
                description: data.description,
                type: data.type,
                code: data.code || generateCode(),
                settings: data.settings,
                created_by: userId
                // updated_at removed as column does not exist
            };
            console.log("AdminQuizCreate: Upserting quiz", quizPayload);

            // 1. Upsert Quiz
            // NOTE: We don't use .select() here to avoid RLS '0 rows' error (PGRST116)
            const { error: upsertError } = await supabase
                .from('quizzes')
                .upsert(quizPayload);

            if (upsertError) {
                console.error("AdminQuizCreate: Quiz upsert error", upsertError);
                throw upsertError;
            }

            const savedQuiz = { ...quizPayload };
            console.log("AdminQuizCreate: Quiz saved (optimistic)", savedQuiz);

            // 2. Upsert Questions
            if (quizId) {
                await supabase.from('questions').delete().eq('quiz_id', quizId);
            }

            if (questions.length > 0) {
                const questionsPayload = questions.map(q => ({
                    quiz_id: quizId,
                    text: q.stem,
                    image_url: q.imageUrl || null,
                    choices: q.options?.map((opt: string, i: number) => ({
                        text: opt,
                        image: q.optionImages?.[i] || null
                    })) || [],
                    correct_answer: q.correct || '',
                    tags: q.tags || ['practice']
                }));
                const qResult = await supabase.from('questions').insert(questionsPayload);
                if (qResult.error) {
                    console.error("AdminQuizCreate: Questions insert error", qResult.error);
                    throw qResult.error;
                }
            }

            console.log("AdminQuizCreate: Save complete");
            return savedQuiz;
        },
        onSuccess: (data) => {
            console.log("AdminQuizCreate: onSuccess triggered");
            setLastSaved(new Date());
            setIsSaving(false);
            if (data.code) {
                setQuizData((prev: any) => ({ ...prev, code: data.code }));
            }
            setShowSuccessModal(true);
        },
        onError: (error) => {
            console.error("AdminQuizCreate: onError triggered", error);
            setIsSaving(false);
            alert(`Failed to save quiz: ${error.message || 'Unknown error'}`);
        }
    });

    // Debounced save
    useEffect(() => {
        const timer = setTimeout(() => {
            if (quizData.title && (quizData.title.length > 3)) {
                setIsSaving(true);
                saveMutation.mutate({ ...quizData, questions });
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [quizData, questions]);

    const CurrentComponent = STEPS[currentStep].component;

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-6 relative">
            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-surface border border-border-custom p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <Check className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-text">Quiz Published!</h2>
                        <p className="text-muted">Your quiz has been successfully created and is now live.</p>
                        <div className="flex flex-col gap-3">
                            <Button onClick={() => navigate(`/admin/quizzes/${category}`)} className="w-full">
                                Go to Quiz List
                            </Button>
                            <Button variant="outline" onClick={() => {
                                setShowSuccessModal(false);
                                // Optional: Reset form or keep explicitly
                                navigate(0); // Refresh to create new
                            }} className="w-full">
                                Create Another
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(`/admin/quizzes/${category}`)} className="p-2 hover:bg-surface rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-text" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-text">Create {category?.toUpperCase()} Quiz</h1>
                        <div className="flex items-center text-sm text-muted mt-1">
                            {isSaving ? (
                                <span className="flex items-center text-primary">
                                    <span className="animate-spin mr-2">⟳</span> Saving...
                                </span>
                            ) : lastSaved ? (
                                <span className="flex items-center text-primary">
                                    <Check className="h-4 w-4 mr-1" /> Saved {lastSaved.toLocaleTimeString()}
                                </span>
                            ) : (
                                <span>Draft mode</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate(`/admin/quizzes/${category}`)}>Cancel</Button>
                    <Button onClick={() => saveMutation.mutate({ ...quizData, questions })}>
                        <Save className="mr-2 h-4 w-4" /> Save Draft
                    </Button>
                </div>
            </div>

            {/* Stepper */}
            <div className="relative">
                <div className="absolute top-4 left-0 w-full h-0.5 bg-neutral-200 dark:bg-neutral-800 z-0" />
                <div
                    className="absolute top-4 left-0 h-0.5 bg-primary z-0 transition-all duration-500 ease-in-out"
                    style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />
                <div className="flex justify-between relative z-10">
                    {STEPS.map((step, index) => (
                        <div
                            key={step.id}
                            className={cn(
                                "flex flex-col items-center gap-2 bg-background px-2 cursor-pointer z-10",
                                index <= currentStep ? "text-primary" : "text-muted"
                            )}
                            onClick={() => setCurrentStep(index)}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                                index <= currentStep
                                    ? "border-primary bg-primary text-white"
                                    : "border-border-custom bg-background text-muted"
                            )}>
                                {index + 1}
                            </div>
                            <span className="text-xs font-medium">{step.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <Card className="min-h-[500px]">
                <CardContent className="p-6">
                    <CurrentComponent
                        data={quizData}
                        update={(updates: any) => setQuizData((prev: any) => ({ ...prev, ...updates }))}
                        questions={questions}
                        setQuestions={setQuestions}
                        quizId={quizData.id} // Pass generated ID
                    />
                </CardContent>
            </Card>

            <div className="flex justify-between">
                <Button
                    variant="outline"
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep(prev => prev - 1)}
                >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <Button
                    onClick={() => {
                        if (currentStep === STEPS.length - 1) {
                            // Publish Action
                            saveMutation.mutate({ ...quizData, questions });
                        } else {
                            setCurrentStep(prev => prev + 1);
                        }
                    }}
                >
                    {currentStep === STEPS.length - 1 ? 'Publish Quiz' : 'Next Step'}
                    {currentStep !== STEPS.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
