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

            // Check limit
            if (newCount >= effectiveLimit && onAutoSubmit) {
                onAutoSubmit();
            }

            return newCount;
        });

        setWarning(`Violation detected: ${type}. warning ${violations + 1}/${effectiveLimit}`);

        // Clear warning after a few seconds
        setTimeout(() => setWarning(null), 5000);
    }, [enabled, maxViolations, onViolation, onAutoSubmit, violations]);

    // 1. Full Screen Enforcement
    const enterFullScreen = async () => {
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

        const handleFullScreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullScreen(false);
                triggerViolation("Exited Full Screen");
            } else {
                setIsFullScreen(true);
            }
        };

        document.addEventListener('fullscreenchange', handleFullScreenChange);

        // Initial check/force
        if (!document.fullscreenElement) {
            setIsFullScreen(false);
        }

        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, [enabled, triggerViolation]);

    // 2. Visibility Change (Tab Switching)
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerViolation("Tab Switched / Window Hidden");
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleVisibilityChange);
        };
    }, [enabled, triggerViolation]);

    // 3. Input Blocking (Copy/Paste/Right Click)
    useEffect(() => {
        if (!enabled) return;

        const preventDefault = (e: Event) => e.preventDefault();

        document.addEventListener('contextmenu', preventDefault);
        document.addEventListener('copy', preventDefault);
        document.addEventListener('paste', preventDefault);
        document.addEventListener('cut', preventDefault);

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block specific combos like Alt+Tab (hard to block but we can detect blur), F12, Ctrl+C
            if (
                (e.ctrlKey && ['c', 'v', 'x', 'p', 'u'].includes(e.key.toLowerCase())) ||
                e.key === 'F12' ||
                (e.altKey && e.key === 'Tab')
            ) {
                e.preventDefault();
                triggerViolation("Restricted Keyboard Shortcut");
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('contextmenu', preventDefault);
            document.removeEventListener('copy', preventDefault);
            document.removeEventListener('paste', preventDefault);
            document.removeEventListener('cut', preventDefault);
            window.removeEventListener('keydown', handleKeyDown);
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
