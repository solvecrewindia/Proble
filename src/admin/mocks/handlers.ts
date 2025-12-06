import { http, HttpResponse, delay } from 'msw';
import seedData from './seed.json';

// In-memory state
let users = [...seedData.users];
let quizzes = [...seedData.quizzes];
let alerts = [...seedData.alerts];
let logs: any[] = [];

// Helper to log actions
const logAction = (action: string, details: any) => {
    const entry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action,
        details,
    };
    logs.unshift(entry);
    return entry;
};

export const handlers = [
    // Auth
    http.post('/api/auth/login', async ({ request }) => {
        await delay(500);
        const body = await request.json() as any;
        const { email, password, role } = body;

        // Dev backdoor or simple check
        if (role) {
            return HttpResponse.json({
                accessToken: `mock-jwt-${role}`,
                refreshToken: `mock-refresh-${role}`,
                role: role,
                user: { name: 'Dev User', email: 'dev@test.com' }
            });
        }

        if (email === 'admin@proble.io' && password === 'password') {
            return HttpResponse.json({
                accessToken: 'mock-jwt-admin',
                refreshToken: 'mock-refresh-admin',
                role: 'admin',
                user: { name: 'Admin User', email: 'admin@proble.io' }
            });
        }

        return new HttpResponse(null, { status: 401 });
    }),

    http.post('/api/auth/refresh', async () => {
        await delay(300);
        return HttpResponse.json({ accessToken: 'new-mock-jwt' });
    }),

    // Dashboard Metrics
    http.get('/api/admin/metrics/dashboard', async () => {
        await delay(500);
        return HttpResponse.json({
            activeUsers: users.filter(u => u.status === 'active').length,
            concurrentQuizzes: quizzes.filter(q => q.status === 'active').length,
            totalQuizzes: quizzes.length,
            flaggedIncidents24h: alerts.filter(a => new Date(a.timestamp) > new Date(Date.now() - 86400000)).length,
            apiErrorRate: 0.05,
        });
    }),

    // Users
    http.get('/api/admin/users', async ({ request }) => {
        await delay(500);
        const url = new URL(request.url);
        const page = Number(url.searchParams.get('page') || 1);
        const pageSize = Number(url.searchParams.get('pageSize') || 10);
        const search = url.searchParams.get('q')?.toLowerCase();
        const role = url.searchParams.get('role');
        const verified = url.searchParams.get('verified');

        let filtered = [...users];

        if (search) {
            filtered = filtered.filter(u =>
                u.name.toLowerCase().includes(search) ||
                u.email.toLowerCase().includes(search)
            );
        }
        if (role) {
            filtered = filtered.filter(u => u.role === role);
        }
        if (verified !== null) {
            filtered = filtered.filter(u => String(u.verified) === verified);
        }

        const start = (page - 1) * pageSize;
        const paginated = filtered.slice(start, start + pageSize);

        return HttpResponse.json({
            data: paginated,
            total: filtered.length,
            page,
            pageSize
        });
    }),

    http.get('/api/admin/users/:id', async ({ params }) => {
        await delay(300);
        const user = users.find(u => u.id === params.id);
        if (!user) return new HttpResponse(null, { status: 404 });
        return HttpResponse.json(user);
    }),

    http.post('/api/admin/users/bulk', async ({ request }) => {
        await delay(800);
        const body = await request.json() as any;
        const { action, userIds, payload } = body;

        users = users.map(u => {
            if (userIds.includes(u.id)) {
                if (action === 'verify') return { ...u, verified: true, status: 'active' };
                if (action === 'suspend') return { ...u, status: 'suspended' };
                if (action === 'changeRole') return { ...u, role: payload.role };
            }
            return u;
        });

        logAction('BULK_USER_UPDATE', { action, userIds, count: userIds.length });
        return HttpResponse.json({ success: true });
    }),

    // Quizzes
    http.get('/api/admin/quizzes', async () => {
        await delay(500);
        return HttpResponse.json(quizzes);
    }),

    http.patch('/api/admin/quizzes/:id', async ({ params, request }) => {
        await delay(500);
        const body = await request.json() as any;
        const { id } = params;
        quizzes = quizzes.map(q => q.id === id ? { ...q, ...body } : q);
        logAction('UPDATE_QUIZ', { id, updates: body });
        return HttpResponse.json({ success: true });
    }),

    // Alerts
    http.get('/api/admin/alerts', async () => {
        await delay(500);
        return HttpResponse.json(alerts);
    }),

    http.post('/api/admin/alerts/:id/actions', async ({ params, request }) => {
        await delay(500);
        const { id } = params;
        const body = await request.json() as any;
        const { action, note } = body;

        alerts = alerts.map(a => {
            if (a.id === id) {
                if (action === 'resolve') return { ...a, status: 'resolved' };
                if (action === 'escalate') return { ...a, status: 'escalated' };
            }
            return a;
        });

        logAction('ALERT_ACTION', { id, action, note });
        return HttpResponse.json({ success: true });
    }),

    // Logs
    http.get('/api/admin/logs', async () => {
        await delay(300);
        return HttpResponse.json(logs);
    }),

    // Telemetry
    http.get('/api/admin/telemetry/snapshot', async () => {
        return HttpResponse.json({
            latency: { p50: 120, p95: 350, p99: 800 },
            errorRate: 0.02,
            redisHitRatio: 0.94,
            aiQueueLength: 15
        });
    })
];
