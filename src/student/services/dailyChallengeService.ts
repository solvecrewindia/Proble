import { generateDailyChallengeLocal } from '../data/dailyContentSource';

export interface DailyChallenge {
    date: string;
    mixed: ChallengeQuestion[];
    flashcards: any[];
    puzzle: any[];
    debugger: any[];
    mistakeFinder: any[];
}

export interface ChallengeQuestion {
    id: number;
    type: 'flashcard' | 'puzzle' | 'debugger' | 'quiz';
    content: any;
}

export const dailyChallengeService = {
    async getDailyChallenge(): Promise<DailyChallenge | null> {
        try {
            // Use LOCAL generation (Offline Mode)
            // Sourced from 300-item local pool
            const today = new Date().toLocaleDateString('en-CA');
            const data = generateDailyChallengeLocal(today);
            return data;
        } catch (err) {
            console.error('Daily challenge service error:', err);
            return null;
        }
    }
};
