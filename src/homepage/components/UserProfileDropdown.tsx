import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sun, Moon, LogOut } from 'lucide-react';

import { useTheme } from '../context/ThemeContext';

const UserProfileDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { theme, setTheme } = useTheme();
    const isDarkMode = theme === 'dark';
    const dropdownRef = useRef<HTMLDivElement>(null);

    const toggleDropdown = () => setIsOpen(!isOpen);
    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={toggleDropdown}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full border border-border-custom hover:bg-background transition-colors duration-200 cursor-pointer bg-surface"
            >
                <div className="w-8 h-8 rounded-full overflow-hidden border border-border-custom">
                    <img
                        src="https://i.pravatar.cc/150?img=32"
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
                <div className="absolute right-0 mt-2 w-64 bg-surface rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-border-custom overflow-hidden z-50 animate-fadeInScale origin-top-right">

                    {/* Header Section */}
                    <div className="px-4 py-3 border-b border-border-custom">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-border-custom shrink-0">
                                <img
                                    src="https://i.pravatar.cc/150?img=32"
                                    alt="User Avatar"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold text-text truncate">Tharun</span>
                                <span className="text-xs text-muted truncate">tharun@example.com</span>
                            </div>
                        </div>
                    </div>

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

                    {/* Logout Section */}
                    <div className="p-2 border-t border-border-custom">
                        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <LogOut className="w-4 h-4" />
                            <span className="text-sm font-medium">Logout</span>
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

export default UserProfileDropdown;
