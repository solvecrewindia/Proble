import { useState, useEffect, useCallback } from 'react';

interface AntiCheatOptions {
    enabled: boolean;
    level?: 'standard' | 'strict' | 'none'; // Added level
    maxViolations?: number;
    onViolation?: (count: number, type: string) => void;
    onAutoSubmit?: () => void;
}

export const useAntiCheat = ({
    enabled,
    level = 'standard', // Default to standard
    maxViolations = 3,
    onViolation,
    onAutoSubmit
}: AntiCheatOptions) => {
    // Override maxViolations based on level if needed
    const strictnessLimit = level === 'strict' ? 1 : maxViolations; // Strict = 1 strike
    const effectiveLimit = level === 'none' ? Infinity : strictnessLimit;

    const [violations, setViolations] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(true); // Assume start in FS or prompt
    const [warning, setWarning] = useState<string | null>(null);

    const triggerViolation = useCallback((type: string) => {
        if (!enabled) return;

        setViolations(prev => {
            const newCount = prev + 1;

            // Notify parent
            if (onViolation) onViolation(newCount, type);

            // Check limit - triggers auto-submit
            if (newCount >= effectiveLimit && onAutoSubmit) {
                onAutoSubmit();
            }

            return newCount;
        });

        setWarning(`Security Violation: ${type}. Warning ${violations + 1}/${effectiveLimit}`);

        // Clear warning after 5 seconds
        setTimeout(() => setWarning(null), 5000);
    }, [enabled, effectiveLimit, onViolation, onAutoSubmit, violations]);

    // 1. Full Screen Enforcement
    const enterFullScreen = async () => {
        // iOS Safari doesn't support requestFullscreen on elements
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isIOS) return;

        const elem = document.documentElement;
        try {
            if (elem.requestFullscreen) {
                await elem.requestFullscreen();
            }
        } catch (err) {
            console.error("Fullscreen denied:", err);
        }
    };

    useEffect(() => {
        if (!enabled) return;

        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        
        const handleFullScreenChange = () => {
            // Document.fullscreenElement is common for Desktop and Android
            const inFullScreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
            
            if (!inFullScreen) {
                setIsFullScreen(false);
                // On mobile, sometimes rotation or system bars cause this, but it's still a risk
                triggerViolation("Exited Full Screen");
            } else {
                setIsFullScreen(true);
            }
        };

        if (isIOS) {
            // iOS Safari doesn't support standard fullscreen API for elements well
            // We assume true for UI purposes but still rely on blur/visibility
            setIsFullScreen(true);
        } else {
            document.addEventListener('fullscreenchange', handleFullScreenChange);
            document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
            
            if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                setIsFullScreen(false);
            }
        }

        return () => {
            document.removeEventListener('fullscreenchange', handleFullScreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
        };
    }, [enabled, triggerViolation]);

    // 2. Visibility Change (Tab Switching) & Focus Loss
    useEffect(() => {
        if (!enabled) return;

        let isArmed = false;
        const armTimer = setTimeout(() => {
            isArmed = true;
        }, 2000); // 2 second grace period on start to allow OAuth popups to cleanly close

        const handleVisibility = () => {
            if (document.hidden && isArmed) {
                triggerViolation("Tab Switched / Window Hidden");
            }
        };

        const handleBlur = () => {
            // If the document is hidden, visibilitychange naturally handles it.
            // We want to catch cases where document is VISIBLE but NOT FOCUSED (e.g. clicking address bar, split screen interaction)
            if (!document.hidden && isArmed) {
                triggerViolation("Focus Lost / Overlay Interaction");
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur', handleBlur);

        return () => {
            clearTimeout(armTimer);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleBlur);
        };
    }, [enabled, triggerViolation]);

    // 3. Input Blocking (Copy/Paste/Right Click)
    useEffect(() => {
        if (!enabled) return;

        const preventDefault = (e: Event) => e.preventDefault();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey && ['c', 'v', 'x', 'p', 'u'].includes(e.key.toLowerCase())) ||
                e.key === 'F12' ||
                (e.altKey && e.key === 'Tab')
            ) {
                e.preventDefault();
                triggerViolation("Restricted Keyboard Shortcut");
            }
        };

        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('copy', preventDefault);
        document.addEventListener('paste', preventDefault);
        document.addEventListener('cut', preventDefault);
        window.addEventListener('keydown', handleKeyDown);

        // 5. Block Long-Press (Often used to trigger Google Lens / Circle to Search)
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
                triggerViolation("Multi-touch Gesture");
            }
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        
        // 6. Disable Text Selection & Image Dragging via CSS
        const style = document.createElement('style');
        style.innerHTML = `
            body {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important; /* Disable iOS context menu */
            }
            img {
                -webkit-user-drag: none !important;
                pointer-events: none !important; /* Block long-press on images */
            }
            input, textarea, [contenteditable] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('copy', preventDefault);
            document.removeEventListener('paste', preventDefault);
            document.removeEventListener('cut', preventDefault);
            window.removeEventListener('keydown', handleKeyDown);
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, [enabled, triggerViolation]);

    return {
        violations,
        isFullScreen,
        warning,
        enterFullScreen,
        remainingStrikes: Math.max(0, effectiveLimit - violations)
    };
};
