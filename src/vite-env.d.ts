/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GROQ_API_KEYS: string;
    readonly VITE_GROQ_API_KEY: string;
    readonly VITE_GROQ_GAME_API_KEY: string;
    readonly GROQ_API_KEYS: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_GEMINI_API_KEY: string;
}
