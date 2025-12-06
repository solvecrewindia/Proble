export interface Course {
    id: number;
    title: string;
    author: string;
    date: string;
    image: string;
}

export type TabType = 'nptel' | 'gate' | 'srm' | 'global';
