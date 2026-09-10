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
    const [isObscured, setIsObscured] = useState(false);
    const [warning, setWarning] = useState<string | null>(null);

    const triggerViolation = useCallback((type: string, instantTerminate: boolean = false) => {
        if (!enabled) return;

        const currentCount = instantTerminate ? effectiveLimit : violations + 1;
        setViolations(currentCount);

        // Notify parent
        if (onViolation) onViolation(currentCount, type);

        // Check limit - triggers auto-submit
        if (currentCount >= effectiveLimit || instantTerminate) {
            if (onAutoSubmit) onAutoSubmit();
            setWarning(`Security Violation: ${type}. Exam Terminated.`);
        } else {
            setWarning(`Security Violation: ${type}. Warning ${currentCount}/${effectiveLimit}`);
            // Clear warning after 5 seconds
            setTimeout(() => setWarning(null), 5000);
        }
    }, [enabled, effectiveLimit, onViolation, onAutoSubmit, violations]);

    // 1. Full Screen Enforcement
    const enterFullScreen = async () => {
        setIsObscured(false);
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
            const inFullScreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
            
            if (!inFullScreen) {
                setIsFullScreen(false);
                triggerViolation("Exited Full Screen");
            } else {
                setIsFullScreen(true);
            }
        };

        if (isIOS) {
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

    // 2. Visibility Change (Tab Switching)
    useEffect(() => {
        if (!enabled) return;

        let isArmed = false;
        const armTimer = setTimeout(() => {
            isArmed = true;
        }, 2000);

        const handleVisibility = () => {
            if (document.hidden) {
                if (isArmed) {
                    triggerViolation("Tab Switched / Window Hidden");
                }
            }
        };

        const handleBlur = () => {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('');
                }
            } catch {}
            if (!document.hidden && isArmed) {
                triggerViolation("Focus Lost / Overlay Interaction");
            }
        };

        const handleFocus = () => {};

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            clearTimeout(armTimer);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
        };
    }, [enabled, triggerViolation]);

    // 3. Input Blocking (Copy/Paste/Right Click & Screenshot key detection)
    useEffect(() => {
        if (!enabled) return;

        const preventDefault = (e: Event) => {
            e.preventDefault();
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText('');
                }
            } catch {}
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const isCtrlOrCmd = e.ctrlKey || e.metaKey;

            // Screenshot detection (Instant Termination)
            if (
                e.key === 'PrintScreen' || 
                (isCtrlOrCmd && e.shiftKey && e.key.toLowerCase() === 's') || 
                (isCtrlOrCmd && e.shiftKey && ['3', '4', '5'].includes(e.key))
            ) {
                e.preventDefault();
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText('');
                    }
                } catch {}
                triggerViolation("Screenshot Attempt Detected", true);
                return;
            }

            // Developer Tools / Inspect Element / Source inspection
            if (
                e.key === 'F12' ||
                (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase())) ||
                (e.altKey && isCtrlOrCmd && ['i', 'j'].includes(e.key.toLowerCase())) ||
                (isCtrlOrCmd && e.key.toLowerCase() === 'u')
            ) {
                e.preventDefault();
                triggerViolation("Developer Tools / Source Inspection Blocked");
                return;
            }

            // Normal restricted shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+P, Alt+Tab)
            if (
                (isCtrlOrCmd && ['c', 'v', 'x', 'p'].includes(e.key.toLowerCase())) ||
                (e.altKey && e.key === 'Tab')
            ) {
                e.preventDefault();
                triggerViolation("Restricted Keyboard Shortcut");
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText('');
                    }
                } catch {}
            }
        };

        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('copy', preventDefault);
        document.addEventListener('paste', preventDefault);
        document.addEventListener('cut', preventDefault);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // 5. Block Long-Press & Multi-touch (used to trigger Google Lens / Circle to Search)
        let touchTimer: any = null;
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                e.preventDefault();
                triggerViolation("Multi-touch Gesture (Google Lens / Screenshot blocked)");
                return;
            }
            touchTimer = setTimeout(() => {
                triggerViolation("Long Press Detected (Google Lens / Image Search blocked)");
            }, 600);
        };

        const handleTouchEnd = () => {
            if (touchTimer) clearTimeout(touchTimer);
        };
        const handleTouchMove = () => {
            if (touchTimer) clearTimeout(touchTimer);
        };

        document.addEventListener('touchstart', handleTouchStart, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        document.addEventListener('touchmove', handleTouchMove);
        
        // 6. Disable Text Selection, Image Dragging & Print via CSS
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                body {
                    display: none !important;
                }
            }
            body {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
                -webkit-touch-callout: none !important; /* Disable iOS context menu & Google Lens */
            }
            img {
                -webkit-user-drag: none !important;
                pointer-events: none !important; /* Block long-press on images & Google Lens scan */
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
            window.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            if (touchTimer) clearTimeout(touchTimer);
            if (document.head.contains(style)) {
                document.head.removeChild(style);
            }
        };
    }, [enabled, triggerViolation]);

    const resetViolations = useCallback(() => {
        setViolations(0);
        setIsObscured(false);
        setWarning(null);
    }, []);

    return {
        violations,
        isFullScreen,
        isObscured,
        warning,
        enterFullScreen,
        resetViolations,
        remainingStrikes: Math.max(0, effectiveLimit - violations)
    };
};
