import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parsing
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    const value = match[2].trim().replace(/^["']|["']$/g, '');
                    process.env[key] = value;
                }
            }
        }
    } catch (e) {
        console.error('Error reading .env:', e);
    }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in environment variables.');
    // Check .env.local as fallback
    try {
        const envPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            const lines = content.split('\n');
            for (const line of lines) {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    if (!process.env[key]) {
                        const value = match[2].trim().replace(/^["']|["']$/g, '');
                        process.env[key] = value;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error reading .env.local:', e);
    }
}
// Re-check
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;


if (!url || !key) {
    console.error('STILL Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(url, key);

async function checkBuckets() {
    console.log('Checking storage buckets...');
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error);
        // If error is 401/403, it means anon key can't list buckets (likely).
        // Storage buckets often require Service Role for listing unless RLS allows.
        return;
    }

    console.log('Buckets found:', data.map(b => b.name));

    const bucketName = 'quiz_images';
    const quizImagesBucket = data.find(b => b.name === bucketName);

    if (quizImagesBucket) {
        console.log(`Bucket '${bucketName}' exists.`);
        console.log('Public:', quizImagesBucket.public);
    } else {
        console.error(`Bucket '${bucketName}' does NOT exist.`);
    }
}

checkBuckets();
