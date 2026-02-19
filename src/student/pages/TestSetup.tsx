import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../shared/components/Button';
import { Shield, Globe, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';

const TestSetup = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const levels = [
        {
            id: 'normal',
            title: 'Normal Mode',
            description: 'Standard practice environment. Best for casual learning and review.',
            icon: Globe,
            features: [
                'Windowed mode',
                'Tab switching allowed',
                'Relaxed environment'
            ],
            color: 'text-primary'
        },
        {
            id: 'focused',
            title: 'Focused Mode',
            description: 'Distraction-free environment. Automatically enters full-screen on start.',
            icon: Shield,
            features: [
                'Full-screen enforced',
                'Minimized distractions',
                'Exam simulation'
            ],
            color: 'text-purple-500'
        }
    ];

    const handleSelect = async (levelId: string) => {
        if (levelId === 'focused') {
            try {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch (err) {
                console.error("Error attempting to enable full-screen mode:", err);
            }
        }
        const backendLevel = levelId === 'focused' ? 'strict' : 'relaxed';
        navigate(`/student/practice/test/${id}`, { state: { antiCheatLevel: backendLevel } });
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Section */}
                <div>
                    <Button
                        variant="ghost"
                        className="gap-2 pl-0 hover:bg-transparent hover:text-primary mb-4"
                        onClick={() => navigate(-1)}
                    >
                        <ArrowLeft className="w-5 h-5" /> Back
                    </Button>
                    <header>
                        <h1 className="text-3xl font-bold text-text">Practice Configuration</h1>
                        <p className="text-muted mt-2">One-click start. Choose your preferred environment.</p>
                    </header>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {levels.map((level) => {
                        return (
                            <div
                                key={level.id}
                                onClick={() => handleSelect(level.id)}
                                className={cn(
                                    "relative p-8 rounded-xl border-2 cursor-pointer transition-all duration-200 bg-surface shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 group",
                                    "border-neutral-200 dark:border-neutral-800"
                                )}
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn("p-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 group-hover:scale-110 transition-transform", level.color)}>
                                        <level.icon className="w-8 h-8" />
                                    </div>
                                    <ArrowRight className="w-6 h-6 text-neutral-300 group-hover:text-primary -translate-x-2 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>

                                <h3 className="text-2xl font-bold text-text mb-3 group-hover:text-primary transition-colors">{level.title}</h3>
                                <p className="text-muted mb-8 text-lg">{level.description}</p>

                                <ul className="space-y-4">
                                    {level.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-text/90">
                                            <div className="w-2 h-2 rounded-full bg-neutral-300 group-hover:bg-primary transition-colors" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default TestSetup;
