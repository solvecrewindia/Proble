
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuizzes() {
    const { data, error } = await supabase
        .from('quizzes')
        .select('id, title, type, status, created_by');

    if (error) {
        console.error('Error fetching quizzes:', error);
    } else {
        console.log('Quizzes found:', data);
        const globalQuizzes = data.filter(q => q.type === 'global');
        console.log(`Total Global Quizzes: ${globalQuizzes.length}`);
        console.log(`Global Quizzes Details:`, globalQuizzes);
    }
}

checkQuizzes();
