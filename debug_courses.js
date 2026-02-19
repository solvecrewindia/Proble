
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

async function debugCourses() {
    console.log('--- Debugging Quizzes ---');

    const titles = ['OPPS', 'Java Programing Language', 'DSA'];

    // 1. Check specific quizzes
    const { data: quizzes, error } = await supabase
        .from('quizzes')
        .select('id, title, type, module_id')
        .in('title', titles);

    if (error) {
        console.error('Error fetching quizzes:', error);
    } else {
        console.log('Target Quizzes Status:');
        quizzes.forEach(q => console.log(JSON.stringify(q, null, 2)));
    }

    // 2. Check all 'course' type quizzes
    const { data: courseQuizzes, error: courseError } = await supabase
        .from('quizzes')
        .select('id, title, type')
        .eq('type', 'course');

    if (courseError) {
        console.error('Error fetching course quizzes:', courseError);
    } else {
        console.log('All Quizzes with type "course":', courseQuizzes.map(q => q.title));
    }
}

debugCourses();
