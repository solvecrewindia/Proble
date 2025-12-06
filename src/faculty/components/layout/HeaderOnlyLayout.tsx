import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Topbar } from './Topbar';
import { useAuth } from '../../context/AuthContext';

export function HeaderOnlyLayout() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/faculty/login" replace />;
    }

    return (
        <div className="min-h-screen bg-background">
            <Topbar />
            <main className="pt-20 min-h-screen">
                <div className="p-6 max-w-5xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
