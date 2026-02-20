import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';

export default function StudentLayout() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Menu Toggle - Floating below header */}
            <button
                onClick={() => setSidebarOpen(!isSidebarOpen)}
                className="fixed top-[76px] left-4 z-30 p-2 bg-surface rounded-md shadow-sm border border-neutral-200 dark:border-neutral-700 md:hidden"
            >
                <Menu className="h-5 w-5 text-text" />
            </button>

            <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className={`flex-1 flex justify-center transition-all duration-300 ease-in-out ${isSidebarOpen ? 'ml-0' : 'ml-0 md:ml-64'}`}>
                <div className="w-full max-w-6xl px-4 md:px-6 pt-16 md:pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 md:hidden glass-overlay"
                    onClick={() => setSidebarOpen(false)}
                    style={{ top: '63px' }}
                />
            )}
        </div>
    );
}
