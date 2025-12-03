import type { Faculty, Class, Student, Quiz, Question, Attempt, Incident } from '../types';

// Initial Seed Data
const initialFaculty: Faculty = {
    id: 'fac-1',
    name: 'Dr. Sarah Connor',
    email: 'sarah@proble.edu',
    department: 'Computer Science',
    verified: true,
    lastActive: new Date().toISOString(),
};

const initialClasses: Class[] = [
    {
        id: 'class-1',
        name: 'Advanced Algorithms',
        code: 'CS401',
        semester: 'Fall 2024',
        studentsCount: 45,
        facultyIds: ['fac-1'],
    },
    {
        id: 'class-2',
        name: 'Database Systems',
        code: 'CS302',
        semester: 'Fall 2024',
        studentsCount: 38,
        facultyIds: ['fac-1'],
    },
];

const initialStudents: Student[] = Array.from({ length: 50 }, (_, i) => ({
    id: `stu-${i + 1}`,
    name: `Student ${i + 1}`,
    email: `student${i + 1}@proble.edu`,
    rollNo: `2024${String(i + 1).padStart(3, '0')}`,
    lastActive: new Date().toISOString(),
}));

const initialQuizzes: Quiz[] = [
    {
        id: 'quiz-1',
        title: 'Introduction to Computer Science',
        description: 'Basic concepts of CS including algorithms and data structures.',
        type: 'global',
        status: 'published',
        questions: [],
        settings: {
            duration: 60,
            passingScore: 40,
            antiCheatLevel: 'standard',
            allowRetake: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'quiz-2',
        title: 'Advanced Algorithms Final',
        description: 'Comprehensive exam on graph theory and dynamic programming.',
        type: 'master',
        status: 'published',
        accessCode: 'ALGO2024',
        scheduledAt: new Date().toISOString(),
        questions: [],
        settings: {
            duration: 90,
            passingScore: 50,
            antiCheatLevel: 'strict',
            allowRetake: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

const initialQuestions: Question[] = [
    {
        id: 'q-1',
        quizId: 'quiz-1',
        type: 'mcq',
        stem: 'What is the time complexity of QuickSort in the worst case?',
        options: ['O(n log n)', 'O(n^2)', 'O(n)', 'O(log n)'],
        correct: 1, // Index of O(n^2)
        weight: 2,
    },
    {
        id: 'q-2',
        quizId: 'quiz-1',
        type: 'text',
        stem: 'Explain the difference between BFS and DFS.',
        weight: 5,
    },
];

const initialAttempts: Attempt[] = [];
const initialIncidents: Incident[] = [];

// In-memory Storage
export let db = {
    faculty: [initialFaculty],
    classes: initialClasses,
    students: initialStudents,
    quizzes: initialQuizzes,
    questions: initialQuestions,
    attempts: initialAttempts,
    incidents: initialIncidents,
};

// Reset Function
export const seedReset = () => {
    db = {
        faculty: [initialFaculty],
        classes: [...initialClasses],
        students: [...initialStudents],
        quizzes: [...initialQuizzes],
        questions: [...initialQuestions],
        attempts: [],
        incidents: [],
    };
    console.log('Database reset to initial seeds.');
};
