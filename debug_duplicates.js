
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { resolve } from 'path';

// Manually load env file
const envPath = resolve('m:/Proble/.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseAnonKey = envConfig.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDuplicates() {
    console.log('--- Checking for Duplicates ---');

    // 1. Fetch Modules with category 'COURSE'
    const { data: modules, error: modError } = await supabase
        .from('modules')
        .select('id, title, category')
        .eq('category', 'COURSE');

    if (modError) console.error('Modules Error:', modError);
    else {
        console.log('Modules (COURSE):');
        modules.forEach(m => console.log(JSON.stringify(m, null, 2)));
    }

    // 2. Fetch Quizzes with type 'course'
    const { data: quizzes, error: quizError } = await supabase
        .from('quizzes')
        .select('id, title, type, module_id')
        .eq('type', 'course');

    if (quizError) console.error('Quizzes Error:', quizError);
    else {
        console.log('Quizzes (course):');
        quizzes.forEach(q => console.log(JSON.stringify(q, null, 2)));
    }
}

checkDuplicates();
