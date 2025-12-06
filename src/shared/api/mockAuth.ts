import { User } from '../types';

// Dummy Users
export const DUMMY_USERS = {
    student: {
        id: 's1',
        name: 'Student User',
        email: 'student@test.com',
        role: 'student',
    } as User,
    faculty: {
        id: 'f1',
        name: 'Faculty User',
        email: 'teacher@test.com',
        role: 'faculty',
    } as User,
    admin: {
        id: 'a1',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
    } as User,
};

export const mockLogin = async (identifier: string): Promise<User | null> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const users = Object.values(DUMMY_USERS);
    const user = users.find(u =>
        u.email === identifier ||
        u.name.toLowerCase().includes(identifier.toLowerCase()) ||
        (identifier.toLowerCase() === 'student' && u.role === 'student') ||
        (identifier.toLowerCase() === 'teacher' && u.role === 'faculty') ||
        (identifier.toLowerCase() === 'admin' && u.role === 'admin')
    );

    return user || null;
};
