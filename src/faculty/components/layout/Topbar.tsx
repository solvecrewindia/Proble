import React from 'react';
import { Search, Plus, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';


export function Topbar() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <header className="fixed left-0 top-0 z-30 flex h-15 w-full items-center justify-between bg-white px-8 shadow-sm">
            {/* Logo Section */}
            <div className="flex items-center w-64">
                <span className="text-2xl font-bold text-neutral-900">Pro<span className="text-primary">ble</span></span>
            </div>

            {/* Spacer to keep layout balanced if needed, or just remove if justify-between handles it */}
            <div className="flex-1"></div>

            {/* Right Side Controls */}
            <div className="flex items-center justify-end w-64 space-x-6">
                <Button size="sm" variant="secondary" className="gap-2 rounded-full" onClick={() => navigate('/faculty/create')}>
                    <Plus className="h-4 w-4" /> Create
                </Button>

                <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center border border-neutral-200 overflow-hidden">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="h-full w-full" />
                    </div>
                </div>
            </div>
        </header>
    );
}
