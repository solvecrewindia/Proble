import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export default function StudentLayout() {
    return (
        <div className="min-h-screen bg-background">
            <Sidebar />
            <main className="pl-64 transition-all duration-300 ease-in-out">
                <div className="container mx-auto p-6 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
