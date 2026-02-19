
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { resolve } from 'path';

// Manually load env file
const envPath = resolve('m:/Proble/.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function checkDependencies() {
    console.log('--- Checking OPPS Module Dependencies ---');

    // 1. Get OPPS Module ID
    const { data: modules, error: modError } = await supabase
        .from('modules')
        .select('id, title')
        .eq('title', 'OPPS')
        .eq('category', 'COURSE')
        .single();

    if (modError) {
        console.error('Error fetching module:', modError);
        return;
    }
    console.log('Found Module:', modules);

    // 2. Check for quizzes linked to this module
    const { data: linkedQuizzes, error: linkError } = await supabase
        .from('quizzes')
        .select('id, title')
        .eq('module_id', modules.id);

    if (linkError) console.error('Error checking linked quizzes:', linkError);
    else {
        console.log(`Quizzes linked to Module ${modules.id}:`, linkedQuizzes.length);
        if (linkedQuizzes.length > 0) console.log(linkedQuizzes);
    }
}

checkDependencies();
