import { createClient } from '@supabase/supabase-js';

// Usando as chaves fornecidas pelo usuário como fallback direto
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://db.monarcahub.com';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.YkQszxMsQwn4AKjpaixdXrIbCHVSZ2e7yY2Y5kE_djA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
