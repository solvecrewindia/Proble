export interface User {
    id: string;
    name?: string; // Optional as we capture username first
    username?: string;
    email: string;
    role: 'student' | 'faculty' | 'admin' | 'teacher';
    created_at?: string;
    avatar_url?: string;
}

export interface Quiz {
    id: string;
    title: string;
    description: string;
    durationMinutes: number;
    totalQuestions: number;
    status: 'upcoming' | 'active' | 'completed';
    startTime?: string;
}

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex?: number; // Only for faculty/admin or after submission
}
