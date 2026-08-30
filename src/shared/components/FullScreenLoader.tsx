import React from 'react';

const FullScreenLoader = () => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background text-foreground">
        <div className="animate-breathe flex flex-col items-center gap-4">
            <img src="/logo-light.png" alt="Proble" className="h-12 hidden dark:block" />
            <img src="/logo-dark.png" alt="Proble" className="h-12 block dark:hidden" />
        </div>
    </div>
);

export default FullScreenLoader;
