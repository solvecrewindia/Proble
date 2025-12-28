import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, MessageSquare, Settings } from 'lucide-react';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '.' },
        { name: 'Users', icon: Users, path: 'users' },
        { name: 'Quizzes', icon: BookOpen, path: 'quizzes' },
        { name: 'Problem Requests', icon: MessageSquare, path: 'problem-requests' },
        { name: 'Settings', icon: Settings, path: 'settings' },
    ];

    return (
        <aside
            className={`fixed left-0 top-16 z-20 h-[calc(100vh-4rem)] w-64 border-r bg-background/95 backdrop-blur-sm transition-transform duration-300 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
        >
            <div className="flex h-full flex-col pt-4">
                {/* Navigation */}
                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            end={item.path === '.'}
                            onClick={() => onClose?.()}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(0,199,230,0.1)]'
                                    : 'text-muted hover:bg-surface hover:text-text'
                                }`
                            }
                        >
                            <item.icon className="h-5 w-5 transition-transform group-hover:scale-110" />
                            {item.name}
                        </NavLink>
                    ))}
                </nav>
            </div>
        </aside>
    );
};

export default Sidebar;
