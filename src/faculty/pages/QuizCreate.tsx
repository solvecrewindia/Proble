import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Save, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { cn } from '../lib/utils';
import type { QuizMeta, Question } from '../types';

import { StepMetadata } from '../components/quiz/StepMetadata';
import { StepQuestions } from '../components/quiz/StepQuestions';
import { StepPreview } from '../components/quiz/StepPreview';
import { StepSchedule } from '../components/quiz/StepSchedule';
import { StepType } from '../components/quiz/StepType';

const STEPS = [
    { id: 'type', label: 'Type', component: StepType },
    { id: 'meta', label: 'Details', component: StepMetadata },
    { id: 'questions', label: 'Questions', component: StepQuestions },
    { id: 'preview', label: 'Preview', component: StepPreview },
    { id: 'schedule', label: 'Publish', component: StepSchedule },
];

export default function QuizCreate() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [quizData, setQuizData] = useState<Partial<QuizMeta>>({
        title: '',
        description: '',
        type: 'global',
        settings: {
            duration: 60,
            passingScore: 40,
            antiCheatLevel: 'standard',
            allowRetake: false
        }
    });
    const [questions, setQuestions] = useState<any[]>([]); // Using any[] temporarily to avoid type import issues if not present, but likely Question[]
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const { user } = useAuth();

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
            // Ensure user is authenticated
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            const userId = currentUser?.id || user?.id;

            if (!userId) throw new Error("Not authenticated");

            const isMaster = data.type === 'master';
            const quizPayload = {
                title: data.title,
                description: data.description,
                type: data.type,
                code: isMaster ? (data.code || generateCode()) : null,
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
                }));
                const qResult = await supabase.from('questions').insert(questionsPayload);
                if (qResult.error) throw qResult.error;
            }

            return savedQuiz;
        },
        onSuccess: (data) => {
            setLastSaved(new Date());
            setIsSaving(false);
            setQuizData(prev => ({ ...prev, id: data.id, code: data.code }));
        },
        onError: (error) => {
            console.error("Save failed:", error);
            setIsSaving(false);
        }
    });

    // Debounced save
    useEffect(() => {
        const timer = setTimeout(() => {
            // Only autosave if title exists and we have some valid state
            if (quizData.title && (quizData.title.length > 3)) {
                setIsSaving(true);
                saveMutation.mutate({ ...quizData, questions });
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [quizData, questions]);

    const CurrentComponent = STEPS[currentStep].component;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Create Quiz</h1>
                    <div className="flex items-center text-sm text-muted mt-1">
                        {isSaving ? (
                            <span className="flex items-center text-primary">
                                <span className="animate-spin mr-2">âŸ³</span> Saving...
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
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/faculty/dashboard')}>Cancel</Button>
                    <Button onClick={() => saveMutation.mutate({ ...quizData, questions })}>
                        <Save className="mr-2 h-4 w-4" /> Save Draft
                    </Button>
                </div>
            </div>

            {/* Stepper */}
            <div className="relative">
                {/* Background Line */}
                <div className="absolute top-4 left-0 w-full h-0.5 bg-neutral-200 dark:bg-neutral-800 z-0" />
                {/* Active Progress Line */}
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
                                    : "border-neutral-300 dark:border-neutral-600 bg-background text-muted"
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
                        update={(updates: any) => setQuizData(prev => ({ ...prev, ...updates }))}
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
                            navigate('/faculty/global'); // Or master, depending on type
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
