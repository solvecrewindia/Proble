import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    BarChart2,
    Globe,
    Lock,
    User,
    LogOut
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export function Sidebar() {
    const { logout } = useAuth();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/faculty/dashboard' },
        { icon: BarChart2, label: 'Analytics', to: '/faculty/analytics' },
        { icon: Globe, label: 'Global Tests', to: '/faculty/global' },
        { icon: Lock, label: 'Master Tests', to: '/faculty/master' },
    ];

    return (
        <aside className="fixed left-0 top-15 z-40 h-[calc(100vh-5rem)] w-64 bg-white shadow-sm transition-transform">
            <div className="flex h-full flex-col">

                <nav className="flex-1 space-y-1 px-3 py-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/faculty/dashboard'}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-neutral-700 hover:bg-neutral-100'
                                )
                            }
                        >
                            <item.icon className="mr-3 h-5 w-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>


            </div>
        </aside>
    );
}
