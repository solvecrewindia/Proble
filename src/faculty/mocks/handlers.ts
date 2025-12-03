import { http, HttpResponse, delay } from 'msw';
import { db } from './seeds';
import { v4 as uuidv4 } from 'uuid';

const ARTIFICIAL_DELAY_MS = 800;

export const handlers = [
    // --- AUTH ---
    http.post('/api/faculty/login', async () => {
        await delay(ARTIFICIAL_DELAY_MS);
        return HttpResponse.json({
            token: 'mock-jwt-token-' + uuidv4(),
            user: db.faculty[0],
        });
    }),

    // --- CLASSES ---
    http.get('/api/faculty/classes', async () => {
        await delay(ARTIFICIAL_DELAY_MS);
        return HttpResponse.json(db.classes);
    }),

    http.get('/api/faculty/classes/:id/roster', async ({ params }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        // In a real app, we'd filter by class ID. For now, returning all students as a mock.
        return HttpResponse.json(db.students);
    }),

    http.post('/api/faculty/classes/:id/roster/import', async ({ request }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        // Mock import success
        return HttpResponse.json({ success: true, importedCount: 15, errors: [] });
    }),

    // --- QUIZZES ---
    http.get('/api/faculty/quizzes', async () => {
        await delay(ARTIFICIAL_DELAY_MS);
        return HttpResponse.json(db.quizzes);
    }),

    http.post('/api/faculty/quizzes', async ({ request }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        const newQuiz = await request.json() as any;
        newQuiz.id = 'quiz-' + uuidv4();
        newQuiz.status = 'draft';
        db.quizzes.push(newQuiz);
        return HttpResponse.json(newQuiz, { status: 201 });
    }),

    http.get('/api/faculty/quizzes/:id', async ({ params }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        const quiz = db.quizzes.find((q) => q.id === params.id);
        if (!quiz) return new HttpResponse(null, { status: 404 });

        const questions = db.questions.filter(q => q.quizId === params.id);
        return HttpResponse.json({ ...quiz, questions });
    }),

    http.put('/api/faculty/quizzes/:id', async ({ params, request }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        const update = await request.json() as any;
        const index = db.quizzes.findIndex((q) => q.id === params.id);
        if (index === -1) return new HttpResponse(null, { status: 404 });

        db.quizzes[index] = { ...db.quizzes[index], ...update };
        return HttpResponse.json(db.quizzes[index]);
    }),

    http.post('/api/faculty/quizzes/:id/schedule', async ({ params, request }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        const { scheduledAt, duration, accessCode } = await request.json() as any;
        const index = db.quizzes.findIndex((q) => q.id === params.id);
        if (index === -1) return new HttpResponse(null, { status: 404 });

        const currentQuiz = db.quizzes[index];
        db.quizzes[index] = {
            ...currentQuiz,
            status: 'published', // Changed from scheduled to published for simplicity in this pivot
            scheduledAt,
            accessCode,
            settings: {
                ...currentQuiz.settings,
                duration: duration || currentQuiz.settings.duration
            }
        };
        return HttpResponse.json(db.quizzes[index]);
    }),

    // --- ATTEMPTS & GRADING ---
    http.get('/api/faculty/quizzes/:id/attempts', async ({ params }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        // Return mock attempts
        return HttpResponse.json(db.attempts);
    }),

    http.patch('/api/faculty/attempts/:id/grade', async ({ params, request }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        const { score, feedback } = await request.json() as any;
        // Mock update
        return HttpResponse.json({ success: true });
    }),

    // --- ANALYTICS ---
    http.get('/api/faculty/analytics/quiz/:id', async ({ params }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        return HttpResponse.json({
            averageScore: 75.5,
            medianScore: 78,
            highestScore: 98,
            lowestScore: 45,
            histogram: [2, 5, 12, 15, 8, 3], // 0-10, 10-20, etc. (simplified)
            questionStats: db.questions.filter(q => q.quizId === params.id).map(q => ({
                questionId: q.id,
                correctPercentage: Math.floor(Math.random() * 100),
            })),
        });
    }),

    // --- MONITOR ---
    http.get('/api/faculty/monitor/sessions', async () => {
        await delay(ARTIFICIAL_DELAY_MS);
        // Mock live sessions
        return HttpResponse.json([
            {
                sessionId: 'sess-1',
                studentId: 'stu-1',
                studentName: 'Student 1',
                status: 'active',
                lastPing: new Date().toISOString(),
                signals: { tabSwitches: 0, faceMissing: false },
            },
            {
                sessionId: 'sess-2',
                studentId: 'stu-2',
                studentName: 'Student 2',
                status: 'warning',
                lastPing: new Date().toISOString(),
                signals: { tabSwitches: 3, faceMissing: true },
            },
        ]);
    }),

    // --- INCIDENTS ---
    http.get('/api/faculty/incidents', async () => {
        await delay(ARTIFICIAL_DELAY_MS);
        return HttpResponse.json(db.incidents);
    }),

    http.post('/api/faculty/incidents', async ({ request }) => {
        await delay(ARTIFICIAL_DELAY_MS);
        const incident = await request.json() as any;
        incident.id = 'inc-' + uuidv4();
        incident.createdAt = new Date().toISOString();
        incident.resolved = false;
        db.incidents.push(incident);
        return HttpResponse.json(incident, { status: 201 });
    }),

    // --- PROFILE ---
    http.get('/api/faculty/profile', async () => {
        await delay(ARTIFICIAL_DELAY_MS);
        return HttpResponse.json(db.faculty[0]);
    }),

    http.post('/api/faculty/profile/verify', async () => {
        await delay(ARTIFICIAL_DELAY_MS);
        db.faculty[0].verified = true;
        return HttpResponse.json({ success: true });
    }),
];
