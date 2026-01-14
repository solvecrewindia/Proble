import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const InstallPwaPopup: React.FC = () => {
    const { isInstallable, installApp } = usePWAInstall();
    const [isVisible, setIsVisible] = useState(false);

    // Show popup when install is available, but respect user dismissal for this session
    useEffect(() => {
        if (isInstallable) {
            // Check if previously dismissed in this session
            const dismissed = sessionStorage.getItem('pwa_install_dismissed');
            if (!dismissed) {
                // Small delay for better UX
                const timer = setTimeout(() => setIsVisible(true), 3000);
                return () => clearTimeout(timer);
            }
        } else {
            setIsVisible(false);
        }
    }, [isInstallable]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_install_dismissed', 'true');
    };

    const handleInstall = async () => {
        await installApp();
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] animate-in slide-in-from-right-10 fade-in duration-500">
            <div className="bg-surface/80 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-2xl p-4 max-w-sm w-[90vw] md:w-80 flex flex-col gap-3 relative overflow-hidden">

                {/* Decorative gradient blob */}
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/20 blur-2xl rounded-full pointer-events-none" />

                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-start gap-4 pr-6">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                        <Download className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="font-bold text-text text-sm">Install Proble App</h3>
                        <p className="text-xs text-muted leading-relaxed">
                            Install the app for a better experience, faster access, and offline mode.
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 mt-1">
                    <button
                        onClick={handleInstall}
                        className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 active:scale-95 flex items-center justify-center gap-2"
                    >
                        Install Now
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="px-4 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-text hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallPwaPopup;
