import React, { useState } from 'react';
import { Search, Plus, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../shared/context/ThemeContext';
import UserProfileDropdown from '../../../shared/components/UserProfileDropdown';

interface TopbarProps {
    onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <header className="bg-surface shadow-[0_1px_4px_rgba(16,24,40,0.06)] px-4 md:px-7 py-3 flex items-center justify-between sticky top-0 z-50 transition-colors duration-200 border-b border-neutral-300 dark:border-neutral-600">
            {/* Mobile Search Overlay */}
            {isSearchOpen ? (
                <div className="absolute inset-0 bg-surface z-50 flex items-center px-4 gap-2">
                    <Search className="w-5 h-5 text-muted" />
                    <input
                        type="text"
                        placeholder="What you want to learn?"
                        className="flex-1 bg-transparent border-none outline-none text-tex text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <button onClick={() => setIsSearchOpen(false)} className="text-sm font-medium text-primary">
                        Cancel
                    </button>
                </div>
            ) : null}

            <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden text-text"
                >
                    <Menu className="h-6 w-6" />
                </button>

                {/* Logo Section */}
                <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
                    <img
                        src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                        alt="Proble Logo"
                        className="h-[32px] md:h-[38px] w-auto rounded-md"
                    />
                </div>
            </div>

            {/* Search Bar (Centered) - Hidden on mobile and main pages */}
            <div className="flex-1 flex justify-center px-4">
                {!['/faculty/dashboard', '/faculty/analytics', '/faculty/global', '/faculty/master', '/faculty/create'].includes(location.pathname) && (
                    <div className="hidden md:flex w-full max-w-[480px] bg-background rounded-[50px] px-3 py-1.5 items-center border border-neutral-300 dark:border-neutral-600">
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

            {/* Right Side Controls */}
            <div className="flex items-center gap-2 md:gap-5">
                {/* Mobile Search Toggle */}
                {!['/faculty/dashboard', '/faculty/analytics', '/faculty/global', '/faculty/master', '/faculty/create'].includes(location.pathname) && (
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 md:hidden text-text"
                    >
                        <Search className="h-5 w-5" />
                    </button>
                )}

                {location.pathname !== '/faculty/create' && (
                    <Button
                        size="sm"
                        className={`gap-2 rounded-full transition-colors hidden md:flex ${theme === 'dark'
                            ? 'bg-white text-black hover:bg-neutral-200'
                            : 'bg-black text-white hover:bg-neutral-800'
                            }`}
                        onClick={() => navigate('/faculty/create')}
                    >
                        <Plus className="h-4 w-4" /> Create
                    </Button>
                )}

                <UserProfileDropdown />
            </div>
        </header>
    );
}
