import { supabase } from '../../lib/supabase';

// --- Flash Cards ---
export interface FlashCardState {
    lastPlayedDate: string | null;  // YYYY-MM-DD
    totalScore: number;
    dailyScore: number;
}

const getFlashKey = (userId?: string) => `proble_flashcard_state_v3_${userId || 'guest'}`;

export const getFlashCardState = (userId?: string): FlashCardState => {
    const key = getFlashKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) {
        return {
            lastPlayedDate: null,
            totalScore: 0,
            dailyScore: 0
        };
    }
    return JSON.parse(stored);
};

// Helper to get ISO Week ID (e.g., "2025-W1")
export const getWeekId = (date: Date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo}`;
};

// --- Puzzle State ---
export interface PuzzleState {
    lastPlayedDate: string | null;
    lastPlayedWeek: string | null; // Added for weekly leaderboard
    totalScore: number;
    dailyScore: number;
}

const getPuzzleKey = (userId?: string) => `proble_puzzle_state_v4_${userId || 'guest'}`;

export const getPuzzleState = (userId?: string): PuzzleState => {
    const key = getPuzzleKey(userId);
    const stored = localStorage.getItem(key);

    // Default State
    const defaultState: PuzzleState = {
        lastPlayedDate: null,
        lastPlayedWeek: getWeekId(),
        totalScore: 0,
        dailyScore: 0
    };

    if (!stored) return defaultState;

    const state = JSON.parse(stored);

    // Check for Weekly Reset (Auto-reset on new week)
    const currentWeek = getWeekId();
    if (state.lastPlayedWeek !== currentWeek) {
        state.totalScore = 0; // Reset weekly score
        state.lastPlayedWeek = currentWeek; // Update to new week
        localStorage.setItem(key, JSON.stringify(state)); // Save reset
    }

    return state;
};

// Check if puzzle is played today
export const isPuzzleLocked = (userId?: string): boolean => {
    const state = getPuzzleState(userId);
    const today = new Date().toISOString().split('T')[0];
    return state.lastPlayedDate === today;
};

// Helper to sync with DB
export const syncScoreToSupabase = async (userId: string) => {
    try {
        const puzzle = getPuzzleState(userId);
        const flash = getFlashCardState(userId);
        const total = puzzle.totalScore + flash.totalScore;
        const currentWeek = getWeekId();

        const { error } = await supabase
            .from('leaderboard')
            .upsert({
                user_id: userId,
                week_id: currentWeek, // Partition by week
                total_xp: total,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id, week_id' // Explicitly handle composite key conflict
            });

        if (error) console.error('Error syncing score:', error);
    } catch (err) {
        console.error('Failed to sync score:', err);
    }
};

export const saveFlashCardScore = (points: number, userId?: string) => {
    const state = getFlashCardState(userId);
    const today = new Date().toISOString().split('T')[0];

    if (state.lastPlayedDate !== today) {
        state.dailyScore = 0;
        state.lastPlayedDate = today;
    }

    state.dailyScore += points;
    state.totalScore += points;

    const key = getFlashKey(userId);
    localStorage.setItem(key, JSON.stringify(state));

    if (userId) syncScoreToSupabase(userId);
};

export const isFlashCardLocked = (): boolean => {
    return false;
};

export const getNextUnlockTime = (): Date => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
};

export const resetFlashCardState = (userId?: string) => {
    localStorage.removeItem(getFlashKey(userId));
};

// EXPORTED helper to manually reset stats (Requested by User)
export const hardResetStats = (userId?: string) => {
    localStorage.removeItem(getPuzzleKey(userId));
    localStorage.removeItem(getFlashKey(userId));
    window.location.reload(); // Force reload to reflect changes
};

export const savePuzzleScore = (points: number, userId?: string) => {
    const state = getPuzzleState(userId); // This handles weekly reset check internally
    const today = new Date().toISOString().split('T')[0];
    const currentWeek = getWeekId();

    if (state.lastPlayedDate !== today) {
        state.dailyScore = 0;
        state.lastPlayedDate = today;
    }

    // Double check week (redundant but safe)
    if (state.lastPlayedWeek !== currentWeek) {
        state.totalScore = 0;
        state.lastPlayedWeek = currentWeek;
    }

    state.dailyScore += points;
    state.totalScore += points;

    const key = getPuzzleKey(userId);
    localStorage.setItem(key, JSON.stringify(state));

    if (userId) syncScoreToSupabase(userId);
};

// --- Daily Challenge State ---
export interface DailyChallengeState {
    lastPlayedDate: string | null;
    completed: boolean;
}

const getDailyKey = (userId?: string) => `proble_daily_challenge_v1_${userId || 'guest'}`;

export const getDailyChallengeState = (userId?: string): DailyChallengeState => {
    const key = getDailyKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) {
        return {
            lastPlayedDate: null,
            completed: false
        };
    }
    return JSON.parse(stored);
};

export const setDailyChallengeCompleted = (userId?: string) => {
    const state = getDailyChallengeState(userId);
    // Use local date to align with user's day
    const today = new Date().toLocaleDateString('en-CA');

    state.lastPlayedDate = today;
    state.completed = true;

    localStorage.setItem(getDailyKey(userId), JSON.stringify(state));
};

export const isDailyChallengeLocked = (userId?: string): boolean => {
    const state = getDailyChallengeState(userId);
    const today = new Date().toLocaleDateString('en-CA');
    return state.lastPlayedDate === today && state.completed;
};


// --- Mistake Finder State ---

