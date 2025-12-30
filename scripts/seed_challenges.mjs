
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Fix for loading .env from root
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_KEY) {
    console.error("Missing environment variables. Make sure .env is set.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // Use the working model

const GENERATE_DAYS = 30;

async function generateChallengePack(date) {
    const prompt = `
        Generate a "Daily Game Pack" for a Computer Science student.
        Return ONLY a raw JSON object (valid JSON, no markdown) with the following structure:
        {
          "date": "${date}",
          "mixed": [], 
          "flashcards": [ ... 6 distinct Flashcards about CS concepts (term, definition, subtopic, question, options, correctAnswer: index) ... ],
          "puzzle": [ ... 8 Concept-Definition pairs for matching game (id, term, match) ... ],
          "debugger": [ ... 4 Code snippets with bugs (id, title, snippet, options, correct: index, explanation) ... ],
          "mistakeFinder": [ ... 4 Logic scenarios with errors (id, scenario, code, error, type) ... ]
        }

        Requirements:
        1. Topics: Varied CS topics (Algorithms, Web, Database, AI, etc.).
        2. "mixed": Keep this empty array [] as we are removing this mode.
        3. "flashcards": Must have "term", "definition", "subtopic", "question", "options" (4 string array), "correctAnswer" (0-3).
        4. "puzzle": Simple pairs like { "id": "1", "term": "CPU", "match": "Central Processing Unit" }.
        5. "debugger": Snippets in JS, Python, or Java. "snippet" field contains the code.
        6. "mistakeFinder": Non-syntax logic errors or concept misunderstandings.
        7. Ensure all content is educational and accurate.
      `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        text = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.error(`Failed to generate for ${date}:`, e);
        return null;
    }
}

async function seed() {
    console.log(`Starting to seed ${GENERATE_DAYS} days of challenges...`);

    // Clean up existing future days to avoid conflicts if re-running
    const cleanDate = new Date();
    const cleanDateStr = cleanDate.toISOString().split('T')[0];
    const { error: delError } = await supabase.from('daily_challenges').delete().gte('date', cleanDateStr);
    if (delError) console.error("Error cleaning old data:", delError);

    for (let i = 0; i < GENERATE_DAYS; i++) {
        const d = new Date();
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        console.log(`Generating for ${dateStr} (${i + 1}/${GENERATE_DAYS})...`);
        const content = await generateChallengePack(dateStr);

        if (content) {
            const { error } = await supabase
                .from('daily_challenges')
                .insert([{ date: dateStr, content: content }]);

            if (error) console.error(`Error saving ${dateStr}:`, error);
            else console.log(`Saved ${dateStr}.`);
        }

        // Brief pause to respect rate limits (Gemini Free Tier is strict)
        await new Promise(r => setTimeout(r, 10000));
    }
    console.log("Seeding complete.");
}

seed();
