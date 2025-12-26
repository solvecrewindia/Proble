import React, { useState } from 'react';
import { BookOpen, GraduationCap, Server, Briefcase, FileText, FolderPlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminSelectType() {
    const navigate = useNavigate();
    const [selectedType, setSelectedType] = useState<string | null>(null);

    const options = [
        {
            id: 'NPTEL',
            title: 'NPTEL',
            description: 'National Programme on Technology Enhanced Learning assessments.',
            icon: BookOpen,
            color: 'text-blue-400',
            gradient: 'from-blue-500/20 to-blue-600/5',
        },
        {
            id: 'GATE',
            title: 'GATE',
            description: 'Graduate Aptitude Test in Engineering preparation tests.',
            icon: GraduationCap,
            color: 'text-emerald-400',
            gradient: 'from-emerald-500/20 to-emerald-600/5',
        },
        {
            id: 'SRMIST',
            title: 'SRMIST',
            description: 'SRM Institute of Science and Technology internal assessments.',
            icon: Server,
            color: 'text-purple-400',
            gradient: 'from-purple-500/20 to-purple-600/5',
        },
        {
            id: 'PLACEMENT',
            title: 'PLACEMENT',
            description: 'Placement and interview preparation assessments.',
            icon: Briefcase,
            color: 'text-rose-400',
            gradient: 'from-rose-500/20 to-rose-600/5',
        },
    ];

    const handleSelect = (id: string) => {
        // Categories that support modules
        const moduleSupported = ['NPTEL', 'GATE', 'SRMIST', 'PLACEMENT'];

        if (moduleSupported.includes(id)) {
            setSelectedType(id);
        } else {
            // Fallback for others if any
            navigate(`/admin/quizzes/${id}/create`);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-12 min-h-[calc(100vh-6rem)] flex flex-col justify-center animate-in fade-in duration-700 relative">
            <div className="text-center space-y-4">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-glow to-secondary-foreground drop-shadow-sm">
                    Select Assessment Type
                </h1>
                <p className="text-text-secondary text-lg max-w-2xl mx-auto">
                    Choose the category for which you want to create or manage assessments.
                    Each module is tailored for specific learning outcomes.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 pt-4">
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => handleSelect(option.id)}
                        className="group relative p-1 rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/10"
                    >
                        {/* Gradient Border Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl opacity-50 group-hover:opacity-100 transition-opacity" />

                        <div className="relative h-full bg-surface/50 backdrop-blur-xl border border-white/5 rounded-[22px] p-8 text-left transition-colors group-hover:bg-surface/70">
                            {/* Icon Container */}
                            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br ${option.gradient} border border-white/5 shadow-inner`}>
                                <option.icon className={`h-8 w-8 ${option.color}`} />
                            </div>

                            <h3 className="text-2xl font-bold text-text mb-3 group-hover:text-primary-foreground transition-colors">
                                {option.title}
                            </h3>
                            <p className="text-text-secondary leading-relaxed text-base group-hover:text-text transition-colors">
                                {option.description}
                            </p>

                            <div className="absolute bottom-8 right-8 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                <span className="text-primary-foreground text-sm font-semibold tracking-wide">SELECT &rarr;</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Selection Modal */}
            {selectedType && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-surface border border-white/10 rounded-3xl p-8 max-w-lg w-full relative shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setSelectedType(null)}
                            className="absolute top-4 right-4 p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-text mb-2">Create {selectedType} Content</h2>
                            <p className="text-text-secondary">Choose how you want to organize this content.</p>
                        </div>

                        <div className="grid gap-4">
                            <button
                                onClick={() => navigate(`/admin/quizzes/${selectedType}/create`)}
                                className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group text-left"
                            >
                                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text group-hover:text-primary transition-colors">Single Module</h3>
                                    <p className="text-sm text-text-secondary">Create a standalone quiz directly.</p>
                                </div>
                            </button>

                            <button
                                onClick={() => navigate(`/admin/modules/${selectedType}/create`)}
                                className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group text-left"
                            >
                                <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <FolderPlus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-text group-hover:text-primary transition-colors">Multiple Modules</h3>
                                    <p className="text-sm text-text-secondary">Create a folder to group multiple quizzes.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
