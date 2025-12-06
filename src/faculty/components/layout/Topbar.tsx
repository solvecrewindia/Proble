import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../../../shared/context/ThemeContext';
import UserProfileDropdown from '../../../shared/components/UserProfileDropdown';

export function Topbar() {
    const { user } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <header className="bg-surface shadow-[0_1px_4px_rgba(16,24,40,0.06)] px-7 py-3 flex items-center justify-between sticky top-0 z-50 transition-colors duration-200 border-b border-border-custom">
            {/* Logo Section */}
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
                <img
                    src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                    alt="Proble Logo"
                    className="h-[38px] w-auto rounded-md"
                />
            </div>

            {/* Search Bar (Centered) - Hidden on main pages */}
            <div className="flex-1 flex justify-center">
                {!['/faculty/dashboard', '/faculty/analytics', '/faculty/global', '/faculty/master', '/faculty/create'].includes(location.pathname) && (
                    <div className="w-[60%] max-w-[480px] bg-background rounded-[50px] px-3 py-1.5 flex items-center border border-border-custom">
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
            <div className="flex items-center gap-5">
                {location.pathname !== '/faculty/create' && (
                    <Button
                        size="sm"
                        className={`gap-2 rounded-full transition-colors ${theme === 'dark'
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
