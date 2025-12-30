import React from 'react';
import { Search, Sun, Moon, Gamepad2 } from 'lucide-react';
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

    const [isSearchOpen, setIsSearchOpen] = React.useState(false);

    return (
        <header className="bg-surface shadow-[0_1px_4px_rgba(16,24,40,0.06)] px-4 md:px-7 py-3 flex items-center justify-between sticky top-0 z-50 transition-colors duration-200 border-b border-neutral-300 dark:border-neutral-600">
            {/* Mobile Search Overlay */}
            {isSearchOpen ? (
                <div className="absolute inset-0 bg-surface z-50 flex items-center px-4 gap-2">
                    <Search className="w-5 h-5 text-muted" />
                    <input
                        type="text"
                        placeholder="What you want to learn?"
                        className="flex-1 bg-transparent border-none outline-none text-text text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <button onClick={() => setIsSearchOpen(false)} className="text-sm font-medium text-primary">
                        Cancel
                    </button>
                </div>
            ) : null}

            <div className="flex justify-start items-center gap-2.5 cursor-pointer shrink-0" onClick={() => navigate('/')}>
                {/* Desktop Logo */}
                <img
                    src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                    alt="Proble Logo"
                    className="hidden md:block h-[38px] w-auto rounded-md"
                />
                {/* Mobile Logo */}
                <img
                    src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                    alt="Proble Logo"
                    className="block md:hidden h-[24px] w-auto rounded-md"
                />
            </div>

            <div className="flex justify-center px-2 w-full max-w-[480px]">
                {!location.pathname.startsWith('/student') && !location.pathname.includes('/game') && (
                    <div className="hidden md:flex w-full bg-background rounded-[50px] px-3 py-1.5 items-center border border-neutral-300 dark:border-neutral-600">
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

            <div className="flex justify-end items-center gap-2 md:gap-5">
                {/* Mobile Search Toggle */}
                {!location.pathname.includes('/game') && (
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden text-text"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                )}

                {user ? (
                    <>
                        {user?.role === 'student' && (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => navigate('/student/game')}
                                    className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-text transition-colors"
                                    title="Game Mode"
                                >
                                    <Gamepad2 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => navigate('/student/practice')}
                                    className="hidden md:block bg-transparent border-none text-xs md:text-sm font-medium cursor-pointer px-2 py-1 rounded-md text-text hover:text-muted transition-colors whitespace-nowrap"
                                >
                                    My Practice
                                </button>
                            </div>
                        )}
                        {!location.pathname.startsWith('/student') && user?.role !== 'student' && (
                            <button
                                onClick={handlePracticeClick}
                                className="bg-transparent border-none text-xs md:text-sm font-medium cursor-pointer px-2 py-1 rounded-md text-text hover:text-muted transition-colors"
                            >
                                Dashboard
                            </button>
                        )}
                        <UserProfileDropdown />
                    </>
                ) : (
                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-text"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className={`text-xs md:text-sm font-medium cursor-pointer px-4 md:px-6 py-2 rounded-full transition-colors ${theme === 'dark'
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
