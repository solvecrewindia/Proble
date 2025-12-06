
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    UsersIcon,
    AcademicCapIcon,
    ClipboardDocumentCheckIcon,
    ExclamationTriangleIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    ServerIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Users', href: '/users', icon: UsersIcon },
    { name: 'Teachers', href: '/teachers', icon: AcademicCapIcon },
    { name: 'Quizzes', href: '/quizzes', icon: ClipboardDocumentCheckIcon },
    { name: 'Alerts', href: '/alerts', icon: ExclamationTriangleIcon },
    { name: 'System Health', href: '/health', icon: ServerIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Audit Logs', href: '/logs', icon: DocumentTextIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Layout() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar */}
            <div className="fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out">
                <div className="flex h-16 items-center px-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-[#00C7E6]">Proble Admin</h1>
                </div>
                <nav className="flex flex-col gap-1 p-4">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-[#00C7E6]/10 text-[#00C7E6]'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content */}
            <div className="pl-64">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
                    <h2 className="text-lg font-semibold text-slate-800">
                        {navigation.find(n => n.href === location.pathname)?.name || 'Admin'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-[#00C7E6] flex items-center justify-center text-white font-bold">
                            A
                        </div>
                    </div>
                </header>
                <main className="p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
