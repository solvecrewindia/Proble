import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import process from 'process';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const TEST_CODE = 'GL5X4V';
const NUM_USERS = 150;
const REGISTRATION_DELAY = 3500; // 3.5 seconds delay between signups to avoid rate limits

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runLoadTest() {
    console.log(`Starting 150 USER SLOW-ROLL TEST`);
    console.log(`Phase 1: Creating/Authenticating ${NUM_USERS} users (Estimated time: ~${(NUM_USERS * REGISTRATION_DELAY / 1000 / 60).toFixed(1)} mins)`);

    const masterClient = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: quizzes, error: quizError } = await masterClient
        .from('quizzes')
        .select('id, title')
        .eq('code', TEST_CODE)
        .limit(1);

    if (quizError || !quizzes || quizzes.length === 0) {
        console.error('Error finding quiz:', quizError || 'Quiz not found');
        return;
    }

    const quiz = quizzes[0];
    console.log(`Found quiz: ${quiz.title} (${quiz.id})`);

    const authenticatedClients = [];

    // --- PHASE 1: REGISTRATION ---
    for (let i = 0; i < NUM_USERS; i++) {
        const client = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            }
        });

        const email = `slowtest_${i}@example.com`; // Fixed names so we can re-run without creating new users if they exist
        const password = 'password123';

        process.stdout.write(`\r[${i + 1}/${NUM_USERS}] Authenticating ${email}... `);

        try {
            // Try to sign up
            let { data: authData, error: authError } = await client.auth.signUp({
                email,
                password,
            });

            // If user already exists, sign in
            if (authError && authError.message.includes('already registered')) {
                const signInRes = await client.auth.signInWithPassword({
                    email,
                    password,
                });
                authData = signInRes.data;
                authError = signInRes.error;
            }

            if (authError || !authData.user) {
                console.error(`\nFound error for ${email}:`, authError?.message);
                if (authError?.message?.includes('rate limit')) {
                    console.error("RATE LIMIT HIT! Waiting 60 seconds...");
                    await delay(60000);
                    i--; // Retry this index
                    continue;
                }
            } else {
                // Ensure Profile
                await client.from('profiles').upsert({
                    id: authData.user.id,
                    username: `Student ${i + 1}`,
                    email: email,
                    role: 'student'
                }, { onConflict: 'id' });

                authenticatedClients.push({ client, user: authData.user, email });
            }

        } catch (e) {
            console.error(`\nException for ${email}:`, e);
        }

        // Wait before next implementation to respect rate limits
        await delay(REGISTRATION_DELAY);
    }

    console.log(`\n\nPhase 1 Complete. ${authenticatedClients.length} users ready.`);
    console.log(`Phase 2: Simultaneous Join starting in 5 seconds...`);
    await delay(5000);

    // --- PHASE 2: EXECUTION ---
    let connectedCount = 0;

    // Connect all almost simultaneously (small random jitter to be realistic)
    authenticatedClients.forEach(async ({ client, user, email }, index) => {
        // Jitter: 0 to 2000ms
        await delay(Math.random() * 2000);

        const channel = client.channel(`quiz_session:${quiz.id}`, {
            config: { presence: { key: user.id } },
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                connectedCount++;
                if (connectedCount % 10 === 0) process.stdout.write(`\rConnected: ${connectedCount}/${authenticatedClients.length}`);

                await channel.track({
                    student_id: user.id,
                    online_at: new Date().toISOString(),
                    email: email
                });

                // Simulate Test Submission
                setTimeout(async () => {
                    try {
                        const score = Math.floor(Math.random() * 10) + 1;
                        await client.from('quiz_results').insert({
                            quiz_id: quiz.id,
                            student_id: user.id,
                            score: score,
                            total_questions: 10,
                            percentage: (score / 10) * 100
                        });
                    } catch (e) { /* ignore duplicate/error */ }
                }, Math.random() * 10000 + 5000); // Submit within 5-15 seconds
            }
        });
    });

    console.log("All join requests sent. Monitoring...");
    // Keep alive
    setInterval(() => { }, 10000);
}

runLoadTest();
