import React, { useState, useEffect } from 'react';
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
    const [questions, setQuestions] = useState<Question[]>([]);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Autosave Logic
    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 500));
            return { success: true };
        },
        onSuccess: () => {
            setLastSaved(new Date());
            setIsSaving(false);
        },
    });

    // Debounced save
    useEffect(() => {
        const timer = setTimeout(() => {
            if (quizData.title) {
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
                    <h1 className="text-2xl font-bold text-neutral-900">Create Quiz</h1>
                    <div className="flex items-center text-sm text-neutral-500 mt-1">
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
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/faculty/dashboard')}>Cancel</Button>
                    <Button onClick={() => saveMutation.mutate({ ...quizData, questions })}>
                        <Save className="mr-2 h-4 w-4" /> Save Draft
                    </Button>
                </div>
            </div>

            {/* Stepper */}
            <div className="relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-neutral-200 -z-10" />
                <div className="flex justify-between">
                    {STEPS.map((step, index) => (
                        <div
                            key={step.id}
                            className={cn(
                                "flex flex-col items-center gap-2 bg-white px-2 cursor-pointer z-10",
                                index <= currentStep ? "text-primary" : "text-neutral-400"
                            )}
                            onClick={() => setCurrentStep(index)}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                                index <= currentStep
                                    ? "border-primary bg-primary text-white"
                                    : "border-neutral-300 bg-white text-neutral-500"
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
