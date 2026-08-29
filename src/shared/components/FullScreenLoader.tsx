import React from 'react';

const FullScreenLoader = () => (
    <div className="flex items-center justify-center min-h-[60vh] h-full w-full bg-background text-foreground">
        <div className="animate-breathe flex flex-col items-center gap-4">
            <img src="/logo-light.png" alt="Proble" className="h-12 hidden dark:block" />
            <img src="/logo-dark.png" alt="Proble" className="h-12 block dark:hidden" />
        </div>
    </div>
);

export default FullScreenLoader;
