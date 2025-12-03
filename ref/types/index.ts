export type Role = 'admin' | 'superadmin' | 'auditor' | 'teacher' | 'student';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
    verified?: boolean;
    institution?: string;
    lastActive?: string;
    onboardingStatus?: 'pending' | 'completed';
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: User;
}

export interface Quiz {
    id: string;
    title: string;
    creatorId: string;
    creatorName: string;
    status: 'draft' | 'scheduled' | 'live' | 'ended';
    scheduledAt?: string;
    malpracticeCount: number;
}

export interface Alert {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    type: string;
    timestamp: string;
    resolved: boolean;
    metadata?: Record<string, any>;
}
