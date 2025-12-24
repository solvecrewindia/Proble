export interface Faculty {
    id: string;
    name: string;
    email: string;
    department?: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    verified?: boolean;
    lastActive?: string;
}

export interface Class {
    id: string;
    name: string;
    code: string;
    semester: string;
    studentsCount: number;
    facultyIds: string[];
}

export interface Student {
    id: string;
    name: string;
    email: string;
    rollNo?: string;
    lastActive: string;
}

export interface Question {
    id: string;
    quizId: string;
    type: 'mcq' | 'text' | 'numeric' | 'code';
    stem: string;
    imageUrl?: string;
    options?: string[];
    optionImages?: string[];
    correct?: any;
    weight: number;
}

export interface Quiz {
    id: string;
    title: string;
    description: string;
    type: 'global' | 'master';
    status: 'draft' | 'active' | 'completed' | 'paused';
    accessCode?: string;
    scheduledAt?: string;
    questions: Question[];
    settings: {
        duration: number; // minutes
        passingScore: number;
        antiCheatLevel: 'low' | 'standard' | 'strict';
        allowRetake: boolean;
    };
    created_by: string; // Foreign Key to profiles
    createdAt: string;
    updatedAt: string;
}

export type QuizMeta = Pick<Quiz, 'id' | 'title' | 'description' | 'status' | 'settings' | 'type'>;

export interface Attempt {
    id: string;
    quizId: string;
    studentId: string;
    startedAt: string;
    submittedAt?: string;
    score?: number;
    status: 'in-progress' | 'submitted' | 'graded';
    flags: string[];
}

export interface Incident {
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    createdAt: string;
    resolved: boolean;
    evidence: any[];
}
