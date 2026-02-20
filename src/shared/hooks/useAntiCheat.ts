import { useEffect } from 'react';

export const useAntiCheat = () => {
    useEffect(() => {
        // Disable Right Click
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };

        // Disable Keyboard Shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Mac equivalents)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || // Mac Cmd+Option+I/J/C
                (e.ctrlKey && e.key === 'U') ||
                (e.metaKey && e.key === 'U') // Mac Cmd+U
            ) {
                e.preventDefault();
            }
        };

        // Disable Text Selection globally
        const style = document.createElement('style');
        style.innerHTML = `
            body {
                -webkit-user-select: none;
                -moz-user-select: none;
                -ms-user-select: none;
                user-select: none;
            }
            /* Allow select in inputs */
            input, textarea, [contenteditable] {
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
                user-select: text;
            }
        `;
        document.head.appendChild(style);

        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        // Debugger Loop - Freezes DevTools
        const debuggerInterval = setInterval(() => {
            const before = new Date().getTime();
            // eslint-disable-next-line no-debugger
            debugger;
            const after = new Date().getTime();

            // If the debugger triggered and paused execution, 'after' will be significantly later
            if (after - before > 100) {
                // If DevTools is open, we can optionally clear body or redirect.
                // For now, the debugger stopping the user is the main protection.
            }
        }, 100); // Aggressive 100ms interval

        // Console clear loop
        const consoleInterval = setInterval(() => {
            console.clear();
        }, 500);

        // Detect Devtools by window vs outer sizes
        const detectDevTools = () => {
            const threshold = 160;
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;

            if (widthDiff || heightDiff) {
                // We're actively blocking
                document.body.style.display = 'none';
            } else {
                document.body.style.display = '';
            }
        };

        window.addEventListener('resize', detectDevTools);
        detectDevTools(); // Initial check

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('resize', detectDevTools);
            document.head.removeChild(style);
            clearInterval(debuggerInterval);
            clearInterval(consoleInterval);
            document.body.style.display = ''; // Reset display
        };
    }, []);
};
