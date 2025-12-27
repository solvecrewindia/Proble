import React from 'react';
import { Search, Sun, Moon } from 'lucide-react';
import UserProfileDropdown from './UserProfileDropdown';

interface HeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery }) => {
    const { theme, setTheme } = useTheme();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handlePracticeClick = () => {
        if (user?.role === 'student') {
            navigate('/student/dashboard');
        } else if (user?.role === 'faculty') {
            navigate('/faculty/dashboard');
        } else if (user?.role === 'admin') {
            navigate('/admin');
        }
    };

    return (
        <header className="bg-surface shadow-[0_1px_4px_rgba(16,24,40,0.06)] px-7 py-3 flex items-center justify-between sticky top-0 z-50 transition-colors duration-200 border-b border-neutral-300 dark:border-neutral-600">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
                <img
                    src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                    alt="Proble Logo"
                    className="h-[38px] w-auto rounded-md"
                />
            </div>

            <div className="flex-1 flex justify-center">
                {!location.pathname.startsWith('/student') && (
                    <div className="w-[60%] max-w-[480px] bg-background rounded-[50px] px-3 py-1.5 flex items-center border border-neutral-300 dark:border-neutral-600">
                        <input
                            type="text"
                            placeholder="What you want to learn?"
                            className="border-none outline-none flex-1 p-2 bg-transparent text-sm text-text placeholder:text-muted"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <span className="p-2">
                            <Search className="w-5 h-5 text-muted" />
                        </span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-5">
                {user ? (
                    <>
                        {user?.role === 'student' && (
                            <button
                                onClick={() => navigate('/student/practice')}
                                className="bg-transparent border-none text-sm font-medium cursor-pointer px-2 py-1 rounded-md text-text hover:text-muted transition-colors"
                            >
                                My Practice
                            </button>
                        )}
                        {!location.pathname.startsWith('/student') && user?.role !== 'student' && (
                            <button
                                onClick={handlePracticeClick}
                                className="bg-transparent border-none text-sm font-medium cursor-pointer px-2 py-1 rounded-md text-text hover:text-muted transition-colors"
                            >
                                Dashboard
                            </button>
                        )}
                        <UserProfileDropdown />
                    </>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className={`text-sm font-medium cursor-pointer px-6 py-2 rounded-full transition-colors ${theme === 'dark'
                                ? 'bg-white text-black hover:bg-neutral-200'
                                : 'bg-black text-white hover:bg-neutral-800'
                                }`}
                        >
                            Login
                        </button>
                    </div>
                )}
            </div>
        </header >
    );
};

export default Header;
