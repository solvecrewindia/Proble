
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { resolve } from 'path';

// Manually load env file
const envPath = resolve('m:/Proble/.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const supabase = createClient(envConfig.VITE_SUPABASE_URL, envConfig.VITE_SUPABASE_ANON_KEY);

async function deleteDuplicateModule() {
    console.log('--- Deleting Duplicate OPPS Module ---');

    // 1. Get the module to delete
    const { data: module, error: fetchError } = await supabase
        .from('modules')
        .select('id, title')
        .eq('title', 'OPPS')
        .eq('category', 'COURSE')
        .single();

    if (fetchError) {
        console.error('Error fetching module to delete:', fetchError);
        return;
    }

    if (!module) {
        console.log('Module not found, maybe already deleted?');
        return;
    }

    console.log(`Deleting Module: ${module.title} (${module.id})`);

    // 2. Delete it
    const { error: deleteError } = await supabase
        .from('modules')
        .delete()
        .eq('id', module.id);

    if (deleteError) {
        console.error('Error deleting module:', deleteError);
    } else {
        console.log('Successfully deleted module.');
    }
}

deleteDuplicateModule();
