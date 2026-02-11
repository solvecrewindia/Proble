
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Manually load env file since we are running with ts-node/node
const envPath = resolve('m:/Proble/.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseAnonKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('--- Checking Supabase Data ---');

    // 1. Check Modules
    const { data: modules, error: modError } = await supabase.from('modules').select('count', { count: 'exact', head: true });
    if (modError) console.error('Modules Error:', modError);
    else console.log('Modules Count:', modules);

    // 2. Check Questions
    const { count: questionsCount, error: qError } = await supabase.from('questions').select('*', { count: 'exact', head: true });
    if (qError) console.error('Questions Error:', qError);
    else console.log('Questions Count:', questionsCount);

    // 3. Try fetching some questions
    const { data: sampleQ, error: sampleError } = await supabase.from('questions').select('id').limit(5);
    if (sampleError) console.error('Sample Q Error:', sampleError);
    else console.log('Sample Questions:', sampleQ);
}

check();
