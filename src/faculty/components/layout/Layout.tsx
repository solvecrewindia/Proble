import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../context/AuthContext';

export function Layout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/faculty/login" replace />;
    }

    return (
        <div className="min-h-screen bg-background">
            <Topbar />
            <Sidebar />
            <main className="ml-64 pt-20 min-h-screen">
                <div className="p-6 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
