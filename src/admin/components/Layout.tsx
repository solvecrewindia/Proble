import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = () => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-background text-text font-sans selection:bg-primary/20 selection:text-primary admin-scope">
            <TopBar onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
            <div className="flex pt-16 h-screen overflow-hidden">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
                <main className="flex-1 flex justify-center overflow-y-auto p-6 md:pl-64 transition-all duration-300">
                    <div className="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ zoom: '90%' }}>
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-10 bg-black/50 md:hidden glass-overlay"
                        onClick={() => setSidebarOpen(false)}
                        style={{ top: '64px' }} // Below TopBar
                    />
                )}
            </div>
        </div>
    );
};

export default Layout;
