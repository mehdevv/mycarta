/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_GROQ_API_KEY?: string;
  /** Injected from root .env via vite.config.ts */
  readonly GROQ_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
