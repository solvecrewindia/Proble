import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../context/AuthContext';

export function Layout() {
    const { isAuthenticated } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="min-h-screen bg-background">
            <Topbar onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
            <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            <main className={`flex justify-center transition-all duration-200 min-h-screen ${isMobileMenuOpen ? 'md:ml-64' : 'ml-0 md:ml-64'}`}>
                <div className="w-full max-w-6xl p-4 md:p-6">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/50 md:hidden glass-overlay"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
}
