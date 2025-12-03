import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-background text-text font-sans selection:bg-primary/20 selection:text-primary admin-scope">
            <TopBar />
            <div className="flex pt-16 h-screen overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-6 md:pl-64 transition-all duration-300">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
