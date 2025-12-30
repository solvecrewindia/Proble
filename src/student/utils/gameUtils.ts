export const getDailySeed = (): number => {
    const today = new Date();
    // specific string key for the day e.g. "2024-04-27"
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    // simple hash function to turn string into number
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
};

// Simple pseudo-random number generator seeded with daily hash
export const seededRandom = (seed: number) => {
    let value = seed;
    return () => {
        value = (value * 9301 + 49297) % 233280;
        return value / 233280;
    };
};

// Select n items from array using daily seed
export const getDailyContent = <T>(items: T[], count: number): T[] => {
    const seed = getDailySeed();
    const random = seededRandom(seed);

    // Shuffle array using Fisher-Yates with seeded random
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
};
