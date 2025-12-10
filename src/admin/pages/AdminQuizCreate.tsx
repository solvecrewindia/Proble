import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Save, ChevronRight, ChevronLeft, Check, ArrowLeft } from 'lucide-react';
import { Button } from '../../faculty/components/ui/Button'; // Reusing components
import { Card, CardContent } from '../../faculty/components/ui/Card';
import { cn } from '../../faculty/lib/utils';

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
    const [currentStep, setCurrentStep] = useState(0);
    const [quizData, setQuizData] = useState<any>({
        title: '',
        description: '',
        type: 'global', // Default to global, but we append category to settings
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

    // Initial Setup
    useEffect(() => {
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
            // For Admin, we might get the user ID, or use a system ID.
            // Assuming Admin is authenticated via Supabase Auth.
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            if (!userId) throw new Error("Not authenticated");

            const quizPayload = {
                title: data.title,
                description: data.description,
                type: 'global', // Always global for public quizzes, or 'master' if we want code access. Sticking to global for dashboard list.
                code: data.code || generateCode(),
                settings: data.settings,
                created_by: userId
            };

            // 1. Upsert Quiz
            let quizId = (data as any).id;
            let result;

            if (quizId) {
                result = await supabase.from('quizzes').update(quizPayload).eq('id', quizId).select().single();
            } else {
                result = await supabase.from('quizzes').insert(quizPayload).select().single();
            }

            if (result.error) throw result.error;
            const savedQuiz = result.data;

            // 2. Upsert Questions
            if (quizId) {
                await supabase.from('questions').delete().eq('quiz_id', quizId);
            }

            if (questions.length > 0) {
                const questionsPayload = questions.map(q => ({
                    quiz_id: savedQuiz.id,
                    text: q.stem,
                    choices: q.options || [],
                    correct_answer: q.correct || '',
                    tags: q.tags || ['practice'] // Default if missing
                }));
                const qResult = await supabase.from('questions').insert(questionsPayload);
                if (qResult.error) throw qResult.error;
            }

            return savedQuiz;
        },
        onSuccess: (data) => {
            setLastSaved(new Date());
            setIsSaving(false);
            setQuizData((prev: any) => ({ ...prev, id: data.id, code: data.code }));
        },
        onError: (error) => {
            console.error("Save failed:", error);
            setIsSaving(false);
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
        <div className="space-y-6 max-w-5xl mx-auto p-6">
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
                        <Save className="mr-2 h-4 w-4" /> Save
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
                            navigate(`/admin/quizzes/${category}`);
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
