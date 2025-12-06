import React from 'react';

export function LoginTopbar() {
    return (
        <header className="fixed left-0 top-0 z-30 flex h-15 w-full items-center justify-between bg-surface px-8 shadow-sm transition-colors duration-200 border-b border-border-custom">
            <div className="flex items-center">
                <span className="text-2xl font-bold text-text">Pro<span className="text-primary">ble</span></span>
            </div>
        </header>
    );
}
