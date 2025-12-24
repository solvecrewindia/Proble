import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Server, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Quizzes = () => {
    const navigate = useNavigate();

    // Static definition of modules
    const [modules, setModules] = useState([
        { id: 'nptel', title: 'NPTEL', description: 'National Programme on Technology Enhanced Learning', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10', count: 0 },
        { id: 'gate', title: 'GATE', description: 'Graduate Aptitude Test in Engineering', icon: GraduationCap, color: 'text-green-500', bg: 'bg-green-500/10', count: 0 },
        { id: 'srmist', title: 'SRMIST', description: 'SRM Institute of Science and Technology', icon: Server, color: 'text-purple-500', bg: 'bg-purple-500/10', count: 0 },
        { id: 'global', title: 'Global', description: 'General Knowledge & Open Quizzes', icon: Globe, color: 'text-orange-500', bg: 'bg-orange-500/10', count: 0 },
    ]);

    useEffect(() => {
        fetchCounts();
    }, []);

    const fetchCounts = async () => {
        try {
            // NPTEL
            const { count: nptelCount } = await supabase
                .from('quizzes')
                .select('*', { count: 'exact', head: true })
                .contains('settings', { category: 'NPTEL' });

            // GATE
            const { count: gateCount } = await supabase
                .from('quizzes')
                .select('*', { count: 'exact', head: true })
                .contains('settings', { category: 'GATE' });

            // SRMIST
            const { count: srmistCount } = await supabase
                .from('quizzes')
                .select('*', { count: 'exact', head: true })
                .contains('settings', { category: 'SRMIST' });

            // GLOBAL - Assuming global type or settings category
            // Checks for type='global' OR category='Global'
            const { count: globalCount } = await supabase
                .from('quizzes')
                .select('*', { count: 'exact', head: true })
                .or(`type.eq.global,settings->>category.eq.Global`);

            setModules(prev => prev.map(m => {
                if (m.title === 'NPTEL') return { ...m, count: nptelCount || 0 };
                if (m.title === 'GATE') return { ...m, count: gateCount || 0 };
                if (m.title === 'SRMIST') return { ...m, count: srmistCount || 0 };
                if (m.title === 'Global') return { ...m, count: globalCount || 0 };
                return m;
            }));

        } catch (err) {
            console.error("Error fetching quiz counts:", err);
        }
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
                        onClick={() => navigate(`/admin/quizzes/${module.title.toLowerCase()}`)}
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
                            <span className="text-xs font-medium text-text">{module.count} Quizzes</span>
                            <span
                                className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                            >
                                View All &rarr;
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Quizzes;
