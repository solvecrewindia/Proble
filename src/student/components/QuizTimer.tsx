import React, { useEffect, useState, memo } from 'react';

interface QuizTimerProps {
    initialSeconds: number;
    onTimeUp: () => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const QuizTimer = memo(({ initialSeconds, onTimeUp }: QuizTimerProps) => {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onTimeUp]); // initialSeconds ignored to prevent reset on re-renders unless logic changes

    // Safety check if initial changes? No, we likely want it to persist.

    return (
        <div className="flex flex-col items-end">
            <div className="text-sm font-mono font-bold text-primary tabular-nums tracking-wider text-lg">
                {formatTime(timeLeft)}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted font-medium">Time Left</div>
        </div>
    );
});

QuizTimer.displayName = 'QuizTimer';
