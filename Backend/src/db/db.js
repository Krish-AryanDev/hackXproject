import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Warning: SUPABASE_URL or SUPABASE_ANON_KEY is missing in .env');
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

export const connectDB = async () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Cannot connect: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
        return false;
    }

    try {
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${supabaseAnonKey}`,
            },
        });

        if (res.ok || res.status === 200) {
            console.log(' Supabase connected successfully');
            return true;
        } else {
            console.error(`Supabase connection failed with status: ${res.status}`);
            return false;
        }
    } catch (error) {
        console.error('Supabase connection error:', error.message);
        return false;
    }
};

export default supabase;
