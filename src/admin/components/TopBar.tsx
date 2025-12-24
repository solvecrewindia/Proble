import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Sun, Moon, LogOut, User, Settings, Plus } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const TopBar = () => {
    const { theme, setTheme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-6 backdrop-blur-sm">
            {/* Logo */}
            <div className="flex items-center">
                <img
                    src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
                    alt="Proble Logo"
                    className="h-8 w-auto"
                />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/admin/create')}
                    className={`inline-flex items-center justify-center h-8 px-3 text-sm gap-2 rounded-full transition-colors font-medium ${theme === 'dark'
                        ? 'bg-white text-black hover:bg-neutral-200'
                        : 'bg-black text-white hover:bg-neutral-800'
                        }`}
                >
                    <Plus className="h-4 w-4" /> Create
                </button>

                {/* Profile Dropdown */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 rounded-full bg-surface p-1 pr-3 hover:bg-surface/80 transition-colors"
                    >
                        <img
                            src="https://i.pravatar.cc/150?u=admin"
                            alt="Admin"
                            className="h-8 w-8 rounded-full border border-surface"
                        />
                        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border bg-background shadow-lg p-2 animate-in fade-in zoom-in-95 duration-200">
                            {/* Row 1: User Details */}
                            <div className="flex items-center gap-3 p-3 border-b border-surface mb-2">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-text">Admin User</span>
                                    <span className="text-xs text-muted">admin@proble.com</span>
                                </div>
                            </div>

                            {/* Row 1.5: Profile Settings */}
                            <button
                                onClick={() => {
                                    window.location.href = '/admin/profile-settings';
                                    setIsDropdownOpen(false);
                                }}
                                className="flex w-full items-center gap-3 p-3 text-sm text-text rounded-lg hover:bg-surface transition-colors"
                            >
                                <Settings className="h-4 w-4 text-muted" />
                                <span>Profile Settings</span>
                            </button>

                            {/* Row 2: Theme Toggle */}
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className="flex w-full items-center justify-between p-3 text-sm text-text rounded-lg hover:bg-surface transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                                    <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
                                </div>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-muted'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${theme === 'dark' ? 'left-4.5' : 'left-0.5'}`} style={{ left: theme === 'dark' ? '18px' : '2px' }}></div>
                                </div>
                            </button>

                            {/* Row 3: Logout */}
                            <button
                                onClick={() => {
                                    // Add logout logic here
                                    window.location.href = '/login';
                                }}
                                className="flex w-full items-center gap-3 p-3 text-sm text-red-500 rounded-lg hover:bg-red-500/10 transition-colors mt-1"
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;
