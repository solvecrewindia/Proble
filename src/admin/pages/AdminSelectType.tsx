import React from 'react';
import { BookOpen, GraduationCap, Server, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminSelectType() {
    const navigate = useNavigate();

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

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-12 min-h-[calc(100vh-6rem)] flex flex-col justify-center animate-in fade-in duration-700">
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
                        onClick={() => navigate(`/admin/quizzes/${option.id}/create`)}
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
        </div>
    );
}
