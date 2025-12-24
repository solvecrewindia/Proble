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
        },
        {
            id: 'GATE',
            title: 'GATE',
            description: 'Graduate Aptitude Test in Engineering preparation tests.',
            icon: GraduationCap,
        },
        {
            id: 'SRMIST',
            title: 'SRMIST',
            description: 'SRM Institute of Science and Technology internal assessments.',
            icon: Server,
        },
        {
            id: 'PLACEMENT',
            title: 'PLACEMENT',
            description: 'Placement and interview preparation assessments.',
            icon: Briefcase,
        },
    ];

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-8 min-h-[calc(100vh-6rem)] flex flex-col justify-center">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-text">Create New Assessment</h1>
                <p className="text-muted text-lg">Select the category to begin creation.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4">
                {options.map((option) => (
                    <button
                        key={option.id}
                        onClick={() => navigate(`/admin/quizzes/${option.id}/create`)}
                        className="relative p-8 rounded-2xl border-2 border-surface bg-surface hover:border-primary/50 text-left transition-all hover:shadow-lg group"
                    >
                        <div className="h-14 w-14 rounded-full flex items-center justify-center mb-6 transition-colors bg-surface border border-border-custom group-hover:bg-primary group-hover:text-white text-muted">
                            <option.icon className="h-7 w-7" />
                        </div>
                        <h3 className="text-xl font-bold text-text mb-2 group-hover:text-primary transition-colors">{option.title}</h3>
                        <p className="text-sm text-muted leading-relaxed">
                            {option.description}
                        </p>
                    </button>
                ))}
            </div>
        </div>
    );
}
