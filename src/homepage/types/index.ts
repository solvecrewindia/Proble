export interface Course {
    id: string | number;
    title: string;
    author: string;
    author_avatar_url?: string;
    date: string;
    image: string;
    type?: 'quiz' | 'module';
}

export type TabType = 'nptel' | 'gate' | 'srm' | 'placement' | 'global' | 'course';
