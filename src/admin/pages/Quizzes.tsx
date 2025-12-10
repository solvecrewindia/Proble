import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Server, Plus, X, Check } from 'lucide-react';

const Quizzes = () => {
    const navigate = useNavigate();
    const [modules, setModules] = useState([
        {
            id: 1,
            title: 'NPTEL',
            description: 'National Programme on Technology Enhanced Learning',
            count: '150+ Quizzes',
            icon: BookOpen,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            id: 2,
            title: 'GATE',
            description: 'Graduate Aptitude Test in Engineering',
            count: '500+ Quizzes',
            icon: GraduationCap,
            color: 'text-green-500',
            bg: 'bg-green-500/10',
        },
        {
            id: 3,
            title: 'SRMIST',
            description: 'SRM Institute of Science and Technology',
            count: '300+ Quizzes',
            icon: Server,
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
        },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [newModule, setNewModule] = useState({
        title: '',
        description: '',
        count: '',
    });

    const handleCreateModule = (e: React.FormEvent) => {
        e.preventDefault();
        const module = {
            id: modules.length + 1,
            title: newModule.title,
            description: newModule.description,
            count: newModule.count || '0 Quizzes',
            icon: BookOpen, // Default icon
            color: 'text-primary',
            bg: 'bg-primary/10',
        };
        setModules([...modules, module]);
        setIsModalOpen(false);
        setNewModule({ title: '', description: '', count: '' });

        // Show success toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    return (
        <div className="p-6 space-y-6 relative min-h-[calc(100vh-6rem)]">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-text">Quiz Modules</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {modules.map((module) => (
                    <div
                        key={module.id}
                        className="group relative overflow-hidden rounded-xl border border-surface bg-surface/50 p-6 transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer flex flex-col"
                    >
                        <div className={`mb-4 inline-flex rounded-lg ${module.bg} p-3 w-fit`}>
                            <module.icon className={`h-6 w-6 ${module.color}`} />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-text group-hover:text-primary transition-colors">
                            {module.title}
                        </h3>
                        <p className="mb-4 text-sm text-muted flex-1">
                            {module.description}
                        </p>
                        <div className="flex items-center justify-between border-t border-surface pt-4 mt-auto">
                            <span className="text-xs font-medium text-text">{module.count}</span>
                            <button
                                onClick={() => navigate(`/admin/quizzes/${module.title.toLowerCase()}`)}
                                className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                            >
                                View All &rarr;
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => setIsModalOpen(true)}
                className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95 z-40"
            >
                <Plus className="h-8 w-8" />
            </button>

            {/* Create Module Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-surface bg-background p-6 shadow-xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-text">Create New Module</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-full p-1 hover:bg-surface transition-colors"
                            >
                                <X className="h-5 w-5 text-muted" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateModule} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Module Title</label>
                                <input
                                    type="text"
                                    required
                                    value={newModule.title}
                                    onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                                    className="w-full rounded-lg border border-surface bg-surface/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    placeholder="e.g., Mathematics"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Description</label>
                                <textarea
                                    required
                                    value={newModule.description}
                                    onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                                    className="w-full rounded-lg border border-surface bg-surface/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    rows={3}
                                    placeholder="Brief description of the module..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text mb-1">Initial Quiz Count</label>
                                <input
                                    type="text"
                                    value={newModule.count}
                                    onChange={(e) => setNewModule({ ...newModule, count: e.target.value })}
                                    className="w-full rounded-lg border border-surface bg-surface/50 px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                                    placeholder="e.g., 10+ Quizzes"
                                />
                            </div>
                            <div className="pt-4 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-muted hover:text-text transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                                >
                                    Create Module
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-green-500 px-4 py-2 text-white shadow-lg animate-in slide-in-from-bottom-4 duration-300">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Module Added Successfully</span>
                </div>
            )}
        </div>
    );
};

export default Quizzes;
