import dotenv from 'dotenv';
dotenv.config();

/**
 * Validated Environment Variables Configuration
 */
export const env = {
    PORT: parseInt(process.env.PORT || '5000', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    SUPABASE_URL: process.env.SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
    GROQ_API_KEY: process.env.GROQ_API_KEY || '',
    GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    JWT_SECRET: process.env.JWT_SECRET || 'hackx-secret-key-change-in-prod',
};



// Validate critical variables in non-test environment
export const validateEnv = () => {
    const missing = [];
    if (!env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');

    if (missing.length > 0) {
        console.warn(`[Env Warning] Missing recommended environment variables: ${missing.join(', ')}`);
    }
};

export default env;
