import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { Shield, Eye, Lock, Globe, AlertTriangle, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

const TestSetup = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedLevel, setSelectedLevel] = useState<string>('standard');

    useEffect(() => {
        const enterFullScreen = async () => {
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                console.error("Error attempting to enable full-screen mode:", err);
            }
        };
        enterFullScreen();
    }, []);

    const handleBack = () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.error("Error exiting full-screen:", err));
        }
        navigate(-1);
    };

    const levels = [
        {
            id: 'relaxed',
            title: 'Relaxed',
            description: 'Best for casual practice and learning.',
            icon: Globe,
            features: [
                'Tab switching allowed',
                'Copy/Paste allowed',
                'No full-screen enforcement'
            ],
            color: 'text-green-500',
            borderColor: 'border-green-200 dark:border-green-900',
            bg: 'bg-green-50 dark:bg-green-900/20'
        },
        {
            id: 'standard',
            title: 'Standard',
            description: 'Balanced security for serious preparation.',
            icon: Shield,
            features: [
                'Tab switching monitored',
                'Copy/Paste disabled',
                'Full-screen recommended'
            ],
            color: 'text-blue-500',
            borderColor: 'border-blue-200 dark:border-blue-900',
            bg: 'bg-blue-50 dark:bg-blue-900/20'
        },
        {
            id: 'strict',
            title: 'Strict',
            description: 'Simulates high-stakes exam environment.',
            icon: Lock,
            features: [
                'Full-screen enforced',
                'Tab switching terminates test',
                'Right-click disabled',
                'Activity log recorded'
            ],
            color: 'text-red-500',
            borderColor: 'border-red-200 dark:border-red-900',
            bg: 'bg-red-50 dark:bg-red-900/20'
        }
    ];

    const handleStart = () => {
        // In a real app, we'd pass the settings state
        navigate(`/student/practice/test/${id}`, { state: { antiCheatLevel: selectedLevel } });
    };

    return (
        <div className="min-h-screen bg-background w-full p-8 md:p-12">
            <div className="w-full h-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Back Button */}
                <div>
                    <Button
                        variant="ghost"
                        className="gap-2 pl-0 hover:bg-transparent hover:text-primary mb-4"
                        onClick={handleBack}
                    >
                        <ArrowLeft className="w-5 h-5" /> Back
                    </Button>
                </div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-bold text-text">Anti-Cheat Configuration</h1>
                    <p className="text-muted text-lg max-w-3xl">
                        Choose the security level for your practice session. Strict levels help you prepare for the pressure of actual exams.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {levels.map((level) => (
                        <div
                            key={level.id}
                            onClick={() => setSelectedLevel(level.id)}
                            className={cn(
                                "relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.01]",
                                level.bg,
                                selectedLevel === level.id
                                    ? `ring-2 ring-offset-2 ring-offset-bg ${level.borderColor.replace('border', 'ring')}`
                                    : "border-transparent opacity-80 hover:opacity-100"
                            )}
                        >
                            {selectedLevel === level.id && (
                                <div className="absolute top-6 right-6 text-primary">
                                    <CheckCircle2 className="w-8 h-8 fill-current" />
                                </div>
                            )}

                            <div className={`p-4 rounded-xl w-fit mb-6 ${level.id === selectedLevel ? 'bg-white/50 dark:bg-black/20' : ''}`}>
                                <level.icon className={cn("w-10 h-10", level.color)} />
                            </div>

                            <h3 className="text-2xl font-bold text-text mb-3">{level.title}</h3>
                            <p className="text-base text-text/80 mb-8 min-h-[48px]">{level.description}</p>

                            <ul className="space-y-4">
                                {level.features.map((feature, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-base text-text/90">
                                        <div className="mt-1.5 w-2 h-2 rounded-full bg-current shrink-0" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center pt-8 pb-12">
                    <Button
                        size="lg"
                        className="w-full md:w-80 h-16 text-xl shadow-xl shadow-primary/20"
                        onClick={handleStart}
                    >
                        Start Assessment <ArrowRight className="ml-3 w-6 h-6" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TestSetup;
