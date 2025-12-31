import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sun, Moon, LogOut, Home, Settings, LayoutDashboard, List, Link2, MessageCircle } from 'lucide-react';
import ReportProblemModal from './ReportProblemModal';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';


const UserProfileDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const isDarkMode = theme === 'dark';
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Derived state for display
    const displayName = user?.full_name || user?.username || user?.email?.split('@')[0] || 'User';
    const avatarSrc = user?.avatar_url || `https://ui-avatars.com/api/?name=${displayName}&background=0D8ABC&color=fff`;

    const toggleDropdown = () => setIsOpen(!isOpen);
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const handleLogout = async () => {
        await logout();
        navigate('/login');
        setIsOpen(false);
    };

    // Click outside logic
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={toggleDropdown}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-neutral-300 dark:border-neutral-600 hover:bg-background transition-colors duration-200 cursor-pointer bg-surface"
            >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-600">
                    <img
                        src={avatarSrc}
                        alt="User Avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-neutral-300 dark:border-neutral-600 overflow-hidden z-50 animate-fadeInScale origin-top-right">

                    {/* Header Section */}
                    <div className="px-4 py-3 border-b border-neutral-300 dark:border-neutral-600">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-600 shrink-0">
                                <img
                                    src={avatarSrc}
                                    alt="User Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold text-text truncate">{displayName}</span>
                                <span className="text-xs text-muted truncate">{user.email}</span>
                                <span className="text-[10px] uppercase tracking-wider text-muted font-semibold">{user.role}</span>
                            </div>
                        </div>
                    </div>

                    {/* Student Specific Links */}
                    {user.role === 'student' && (
                        <>
                            <div className="px-2 py-1 block md:hidden">
                                <button
                                    onClick={() => {
                                        navigate('/student/practice');
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors group text-text"
                                >
                                    <List className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                                    <span className="text-sm font-medium">My Practice</span>
                                </button>
                            </div>

                            <div className="px-2 py-1">
                                <button
                                    onClick={() => {
                                        navigate('/student/dashboard');
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors group text-text"
                                >
                                    <LayoutDashboard className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                                    <span className="text-sm font-medium">Analysis</span>
                                </button>
                            </div>

                            <div className="px-2 py-1">
                                <button
                                    onClick={() => {
                                        navigate('/student/join');
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors group text-text"
                                >
                                    <Link2 className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                                    <span className="text-sm font-medium">Join Master Test</span>
                                </button>
                            </div>

                            <div className="px-2 py-1">
                                <button
                                    onClick={() => {
                                        setIsReportModalOpen(true);
                                        setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors group text-text"
                                >
                                    <MessageCircle className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                                    <span className="text-sm font-medium">Problem Report</span>
                                </button>
                            </div>
                        </>
                    )}

                    {/* Theme Toggle Section */}
                    <div className="px-2 py-1">
                        <button
                            onClick={toggleTheme}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-background transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                {isDarkMode ? (
                                    <Moon className="w-4 h-4 text-muted group-hover:text-indigo-600 transition-colors" />
                                ) : (
                                    <Sun className="w-4 h-4 text-muted group-hover:text-amber-500 transition-colors" />
                                )}
                                <span className="text-sm font-medium text-text">
                                    {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                                </span>
                            </div>

                            {/* Custom Toggle Switch */}
                            <div
                                className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-gray-200'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${isDarkMode ? 'translate-x-4' : 'translate-x-0'
                                        }`}
                                />
                            </div>
                        </button>
                    </div>

                    {/* Dashboard Link */}
                    <div className="px-2 py-1">
                        <button
                            onClick={() => {
                                let role = user.role.toLowerCase();
                                if (role === 'teacher') role = 'faculty';
                                else if (role === 'admin') {
                                    navigate('/admin');
                                    setIsOpen(false);
                                    return;
                                }
                                navigate(`/${role}/dashboard`);
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors group text-text"
                        >
                            <LayoutDashboard className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                            <span className="text-sm font-medium">Dashboard</span>
                        </button>
                    </div>

                    {/* Profile Settings Link */}
                    <div className="px-2 py-1 border-b border-neutral-300 dark:border-neutral-600">
                        <button
                            onClick={() => {
                                let role = user.role.toLowerCase();
                                if (role === 'teacher') role = 'faculty'; // Map teacher to faculty routes
                                navigate(`/${role}/profile-settings`);
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors group text-text"
                        >
                            <Settings className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                            <span className="text-sm font-medium">Profile Settings</span>
                        </button>
                    </div>

                    {/* Homepage Link */}
                    {user.role?.toLowerCase() !== 'teacher' && (
                        <div className="px-2 py-1">
                            <button
                                onClick={() => {
                                    navigate('/');
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-background transition-colors group text-text"
                            >
                                <Home className="w-4 h-4 text-muted group-hover:text-primary transition-colors" />
                                <span className="text-sm font-medium">Homepage</span>
                            </button>
                        </div>
                    )}



                    {/* Logout Section */}
                    <div className="p-2 border-t border-neutral-300 dark:border-neutral-600">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>

                </div>
            )}

            <ReportProblemModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />
        </div>
    );
};

export default UserProfileDropdown;
