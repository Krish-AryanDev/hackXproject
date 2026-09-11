import { createClient } from '@supabase/supabase-js';
import env, { validateEnv } from '../config/env.js';

// Validate env variables on module import
validateEnv();

const supabaseUrl = env.SUPABASE_URL || 'https://placeholder.supabase.co';
// Prefer service role key on backend to bypass RLS restrictions, fallback to anon key
const activeKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || 'placeholder-key';

/**
 * Primary Supabase Client (For general queries)
 */
export const supabase = createClient(supabaseUrl, activeKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

/**
 * Admin Supabase Client (Privileged backend access)
 */
export const supabaseAdmin = createClient(supabaseUrl, activeKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

/**
 * Verify Supabase database connection connectivity
 * @returns {Promise<boolean>}
 */
export const connectDB = async () => {
    if (!env.SUPABASE_URL || (!env.SUPABASE_ANON_KEY && !env.SUPABASE_SERVICE_ROLE_KEY)) {
        console.warn('⚠️  Cannot connect: Missing SUPABASE_URL or Supabase Key in environment');
        return false;
    }

    try {
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            headers: {
                apikey: activeKey,
                Authorization: `Bearer ${activeKey}`,
            },
        });

        if (res.ok || res.status === 200) {
            console.log('✅ Supabase connected successfully');
            return true;
        } else {
            console.warn(`⚠️ Supabase ping returned status: ${res.status} (${res.statusText})`);
            return false;
        }
    } catch (error) {
        console.error('❌ Supabase connection error:', error.message);
        return false;
    }
};

export default supabase;
