import React from 'react';

export function LoginTopbar() {
    return (
        <header className="fixed left-0 top-0 z-30 flex h-15 w-full items-center justify-between bg-white px-8 shadow-sm">
            <div className="flex items-center">
                <span className="text-2xl font-bold text-neutral-900">Pro<span className="text-primary">ble</span></span>
            </div>
        </header>
    );
}
