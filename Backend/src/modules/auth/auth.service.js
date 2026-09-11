import jwt from 'jsonwebtoken';
import { supabase, supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';
import env from '../../config/env.js';

/**
 * Generate signed JWT Token for profile
 * @param {object} profile
 * @returns {string}
 */
export const generateToken = (profile) => {
    return jwt.sign(
        {
            id: profile.id,
            phone: profile.phone,
            role: profile.role,
        },
        env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

/**
 * Format and sanitize phone number to E.164 standard (defaulting to +91 if 10-digit Indian number)
 * @param {string} phone
 * @returns {string}
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) throw ApiError.badRequest('Phone number is required');
    let cleaned = phone.replace(/[\s\-()]/g, '');
    if (!cleaned.startsWith('+')) {
        if (cleaned.length === 10) {
            cleaned = `+91${cleaned}`;
        } else {
            cleaned = `+${cleaned}`;
        }
    }
    return cleaned;
};

/**
 * Trigger SMS OTP via Supabase Auth
 * @param {string} rawPhone
 */
export const sendPhoneOtp = async (rawPhone) => {
    const phone = formatPhoneNumber(rawPhone);

    const { data, error } = await supabase.auth.signInWithOtp({
        phone,
    });

    if (error) {
        // Provide helpful feedback if SMS provider is not yet set in Supabase dashboard
        console.warn(`[Supabase Auth Notice] OTP request for ${phone}: ${error.message}`);
        
        // If developer testing without Twilio configured in Supabase, provide fallback info in dev mode
        if (env.NODE_ENV === 'development') {
            return {
                phone,
                message: 'OTP initiated (In development: check Supabase Auth logs or configure SMS provider in dashboard)',
                devNote: error.message,
            };
        }
        throw ApiError.badRequest(`Failed to send OTP: ${error.message}`);
    }

    return {
        phone,
        message: 'OTP sent successfully to phone number',
    };
};

/**
 * Verify OTP, authenticate user, and sync with `profiles` table
 * @param {string} rawPhone
 * @param {string} token - 6-digit OTP code
 * @param {string} role - 'owner' | 'driver' | 'business'
 * @param {string} fullName
 * @param {string} companyName
 */
export const verifyPhoneOtp = async (rawPhone, token, role = 'business', fullName = '', companyName = '') => {
    const phone = formatPhoneNumber(rawPhone);

    if (!token) {
        throw ApiError.badRequest('OTP token is required');
    }

    let authUser = null;
    let session = null;

    // 1. Verify with Supabase Auth
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
    });

    if (verifyError) {
        // Allow mock OTP '123456' in development mode for easy testing if Twilio isn't active
        if (env.NODE_ENV === 'development' && token === '123456') {
            console.log(`[Dev Fallback] Authenticating ${phone} using dev OTP`);
            // Query or create profile directly
            const { data: existingProfile } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('phone', phone)
                .maybeSingle();

            let profileId = existingProfile?.id;
            if (!profileId) {
                const { data: newProfile, error: insertError } = await supabaseAdmin
                    .from('profiles')
                    .insert([
                        {
                            phone,
                            full_name: fullName || 'User',
                            role: ['owner', 'driver', 'business', 'admin'].includes(role) ? role : 'business',
                            company_name: companyName || null,
                        },
                    ])
                    .select()
                    .single();

                if (insertError) throw ApiError.internal(`Failed to create profile: ${insertError.message}`);
                return {
                    user: { id: newProfile.id, phone: newProfile.phone },
                    profile: newProfile,
                    token: generateToken(newProfile),
                    accessToken: generateToken(newProfile),
                    isNewUser: true,
                };
            }

            return {
                user: { id: existingProfile.id, phone: existingProfile.phone },
                profile: existingProfile,
                token: generateToken(existingProfile),
                accessToken: generateToken(existingProfile),
                isNewUser: false,
            };
        }

        throw ApiError.badRequest(`OTP verification failed: ${verifyError.message}`);
    }

    authUser = verifyData.user;
    session = verifyData.session;

    if (!authUser) {
        throw ApiError.unauthorized('Authentication failed: user not found');
    }

    // 2. Fetch or create profile in `profiles` table
    const { data: existingProfile, error: profileFetchError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

    let profile = existingProfile;
    let isNewUser = false;

    if (!profile) {
        isNewUser = true;
        const validRole = ['owner', 'driver', 'business', 'admin'].includes(role) ? role : 'business';

        const { data: newProfile, error: insertError } = await supabaseAdmin
            .from('profiles')
            .insert([
                {
                    id: authUser.id,
                    phone,
                    full_name: fullName || 'User',
                    role: validRole,
                    company_name: companyName || null,
                },
            ])
            .select()
            .single();

        if (insertError) {
            console.error('Error creating profile for auth user:', insertError);
            throw ApiError.internal(`Failed to create user profile: ${insertError.message}`);
        }
        profile = newProfile;
    }

    const jwtToken = generateToken(profile);

    return {
        user: authUser,
        profile,
        token: jwtToken,
        accessToken: session?.access_token || jwtToken,
        session,
        isNewUser,
    };
};


/**
 * Get profile by user ID
 * @param {string} userId
 */
export const getUserProfile = async (userId) => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error || !data) {
        throw ApiError.notFound('User profile not found');
    }

    return data;
};

/**
 * Update current user profile
 * @param {string} userId
 * @param {object} updates
 */
export const updateUserProfile = async (userId, updates) => {
    // Whitelist allowed update fields
    const allowedFields = ['full_name', 'email', 'company_name', 'gst_number', 'profile_photo_url'];
    const filteredUpdates = {};

    for (const key of allowedFields) {
        if (updates[key] !== undefined) {
            filteredUpdates[key] = updates[key];
        }
    }

    if (Object.keys(filteredUpdates).length === 0) {
        throw ApiError.badRequest('No valid fields provided for update');
    }

    filteredUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(filteredUpdates)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        throw ApiError.badRequest(`Failed to update profile: ${error.message}`);
    }

    return data;
};

export default {
    formatPhoneNumber,
    sendPhoneOtp,
    verifyPhoneOtp,
    getUserProfile,
    updateUserProfile,
};
