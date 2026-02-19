
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { resolve } from 'path';

// Manually load env file
const envPath = resolve('m:/Proble/.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabaseUrl = envConfig.VITE_SUPABASE_URL;
const supabaseAnonKey = envConfig.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function updateCourses() {
    console.log('--- Updating Quizzes to Course Type ---');

    const titlesToUpdate = ['OPPS', 'Java Programing Language', 'DSA'];

    // 1. Fetch IDs of these quizzes
    const { data: quizzes, error: fetchError } = await supabase
        .from('quizzes')
        .select('id, title, type')
        .in('title', titlesToUpdate);

    if (fetchError) {
        console.error('Error fetching quizzes:', fetchError);
        return;
    }

    if (!quizzes || quizzes.length === 0) {
        console.log('No quizzes found with the specified titles.');
        return;
    }

    console.log(`Found ${quizzes.length} quizzes to update:`, quizzes.map(q => q.title));

    // 2. Update their type to 'course' and remove module_id
    const { data: updated, error: updateError } = await supabase
        .from('quizzes')
        .update({ type: 'course', module_id: null })
        .in('id', quizzes.map(q => q.id))
        .select();

    if (updateError) {
        console.error('Error updating quizzes:', updateError);
    } else {
        console.log('Successfully updated quizzes:', updated.length);
        console.log('Updated Quizzes:', updated);
    }
}

updateCourses();
