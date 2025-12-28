import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart2,
    Globe,
    Lock,
    User,
    LogOut,
    X
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/faculty/dashboard' },
        { icon: BarChart2, label: 'Analytics', to: '/faculty/analytics' },
        { icon: Globe, label: 'Global Tests', to: '/faculty/global' },
        { icon: Lock, label: 'Master Tests', to: '/faculty/master' },
    ];

    return (
        <aside
            className={cn(
                "fixed left-0 top-[63px] z-40 h-[calc(100vh-63px)] w-64 bg-surface shadow-sm transition-transform duration-300 border-r border-neutral-300 dark:border-neutral-600",
                "md:translate-x-0", // Always visible on desktop
                isOpen ? "translate-x-0" : "-translate-x-full" // Toggle on mobile
            )}
        >
            <div className="flex h-full flex-col">

                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/faculty/dashboard'}
                            onClick={() => onClose?.()} // Close sidebar on navigate (mobile)
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group',
                                    isActive
                                        ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(0,199,230,0.1)]'
                                        : 'text-muted hover:bg-surface hover:text-text'
                                )
                            }
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-3 mt-auto mb-4">
                    <button
                        onClick={async () => {
                            await logout();
                            navigate('/login');
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-red-500 hover:bg-red-50/10 hover:text-red-600"
                    >
                        <LogOut className="mr-3 h-5 w-5" />
                        Logout
                    </button>
                </div>
            </div>
        </aside>
    );
}
