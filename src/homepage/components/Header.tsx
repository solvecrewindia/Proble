import React from 'react';
import { Search } from 'lucide-react';
import UserProfileDropdown from './UserProfileDropdown';

interface HeaderProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

import { useTheme } from '../context/ThemeContext';

const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery }) => {
    const { theme } = useTheme();

    return (
        <header className="bg-surface shadow-[0_1px_4px_rgba(16,24,40,0.06)] px-7 py-3 flex items-center justify-between sticky top-0 z-20 transition-colors duration-200 border-b border-border-custom">
            <div className="flex items-center gap-2.5">
                <img
                    src={theme === 'dark' ? "/logo-dark.png" : "/logo-light.png"}
                    alt="Proble Logo"
                    className="h-[38px] w-auto rounded-md"
                />
            </div>

            <div className="flex-1 flex justify-center">
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
            </div>

            <div className="flex items-center gap-5">
                <button className="bg-transparent border-none text-sm font-medium cursor-pointer px-2 py-1 rounded-md text-text hover:text-muted transition-colors">
                    MyPractice
                </button>
                <UserProfileDropdown />
            </div>
        </header>
    );
};

export default Header;
