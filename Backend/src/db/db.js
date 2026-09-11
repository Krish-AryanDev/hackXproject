import { createClient } from '@supabase/supabase-js';
import env, { validateEnv } from '../config/env.js';

// Validate env variables on module import
validateEnv();

const supabaseUrl = env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * Primary Supabase Client (Using Anon Key)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

/**
 * Admin Supabase Client (Service Role for backend-privileged operations if provided)
 */
export const supabaseAdmin = env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(supabaseUrl, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: {
              persistSession: false,
              autoRefreshToken: false,
          },
      })
    : supabase;

/**
 * Verify Supabase database connection connectivity
 * @returns {Promise<boolean>}
 */
export const connectDB = async () => {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        console.warn('⚠️  Cannot connect: Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
        return false;
    }

    try {
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
            method: 'GET',
            headers: {
                apikey: env.SUPABASE_ANON_KEY,
                Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
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
