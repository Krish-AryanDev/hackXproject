import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';
import env from '../../config/env.js';

/**
 * In-Memory OTP Store with 5-minute TTL
 * Key: formatted phone number -> Value: { code, expiresAt, attempts }
 */
const otpStore = new Map();
export const devProfilesStore = new Map();


/**
 * Format and sanitize phone number to E.164 standard (defaulting to +91 for 10-digit numbers)
 * @param {string} phone
 * @returns {string}
 */
export const formatPhoneNumber = (phone) => {
    if (!phone) throw ApiError.badRequest('Phone number is required');
    let cleaned = phone.toString().replace(/[\s\-()]/g, '');
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
 * Generate a 6-digit random numeric OTP code
 */
const generateSixDigitCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate signed JWT Token for a user profile
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
 * Request Phone OTP for Login or Registration
 * Logs OTP directly to terminal console for development & hackathon testing
 * @param {string} rawPhone
 */
export const requestPhoneOtp = async (rawPhone) => {
    const phone = formatPhoneNumber(rawPhone);

    // 1. Check if user already exists in profiles database
    const { data: existingProfile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, phone, role, full_name')
        .eq('phone', phone)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') {
        console.warn('[DB Check Note]:', error.message);
    }

    const isRegistered = Boolean(existingProfile);

    // 2. Generate and store 6-digit OTP (Valid for 5 minutes)
    const otpCode = generateSixDigitCode();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    otpStore.set(phone, {
        code: otpCode,
        expiresAt,
        attempts: 0,
    });

    // 3. Print OTP banner to the server terminal console
    console.log('\n' + '='.repeat(60));
    console.log(`📱 [AUTH OTP DISPATCH]`);
    console.log(`   Phone Number : ${phone}`);
    console.log(`   One-Time OTP : \x1b[1m\x1b[32m${otpCode}\x1b[0m`);
    console.log(`   Account State: ${isRegistered ? 'Registered User (Login)' : 'New User (Registration Required)'}`);
    console.log(`   Valid For    : 5 Minutes`);
    console.log('='.repeat(60) + '\n');

    return {
        phone,
        isRegistered,
        message: isRegistered
            ? 'OTP sent for login (Printed in server terminal)'
            : 'OTP sent. Please complete registration with your details (Printed in server terminal)',
    };
};

/**
 * Internal helper to verify OTP code from store
 */
const verifyOtpCode = (phone, otp) => {
    if (!otp) throw ApiError.badRequest('OTP code is required');

    // Allow master dev test OTP in development mode
    if (env.NODE_ENV === 'development' && otp === '123456') {
        return true;
    }

    const stored = otpStore.get(phone);
    if (!stored) {
        throw ApiError.badRequest('No OTP was requested for this phone number or it has expired. Please request a new OTP.');
    }

    if (Date.now() > stored.expiresAt) {
        otpStore.delete(phone);
        throw ApiError.badRequest('OTP code has expired. Please request a new one.');
    }

    if (stored.code !== otp.toString().trim()) {
        stored.attempts += 1;
        if (stored.attempts >= 5) {
            otpStore.delete(phone);
            throw ApiError.badRequest('Too many invalid attempts. Please request a new OTP.');
        }
        throw ApiError.badRequest('Invalid OTP code');
    }

    // OTP verified successfully, clear from store
    otpStore.delete(phone);
    return true;
};

/**
 * Register a new user with mobile number, OTP, and profile details
 */
export const registerUser = async (data) => {
    const {
        phone: rawPhone,
        otp,
        full_name,
        role = 'business',
        company_name,
        gst_number,
        email,
        profile_photo_url,
    } = data;

    const phone = formatPhoneNumber(rawPhone);

    if (!full_name || full_name.trim().length === 0) {
        throw ApiError.badRequest('Full name is required for registration');
    }

    const validRoles = ['owner', 'driver', 'business', 'admin'];
    if (!validRoles.includes(role)) {
        throw ApiError.badRequest(`Invalid role. Allowed roles: ${validRoles.join(', ')}`);
    }

    // Verify OTP
    verifyOtpCode(phone, otp);

    // Check if phone already registered
    const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

    if (existing) {
        throw ApiError.conflict('Phone number is already registered. Please log in instead.');
    }

    // Insert new profile into Supabase
    const payload = {
        phone,
        full_name: full_name.trim(),
        role,
        company_name: company_name ? company_name.trim() : null,
        gst_number: gst_number ? gst_number.trim() : null,
        email: email ? email.trim() : null,
        profile_photo_url: profile_photo_url || null,
    };

    let { data: insertedData, error } = await supabaseAdmin
        .from('profiles')
        .insert([payload])
        .select()
        .single();

    // If existing database column still has NOT NULL constraint on email, retry with fallback email
    if (error && error.message?.includes('not-null constraint') && error.message?.includes('email')) {
        payload.email = `${phone.replace(/[^0-9]/g, '')}@user.hackx.internal`;
        const retryResult = await supabaseAdmin
            .from('profiles')
            .insert([payload])
            .select()
            .single();
        insertedData = retryResult.data;
        error = retryResult.error;
    }


    let newProfile = null;

    if (error) {
        if (env.NODE_ENV === 'development') {
            console.warn(`[Dev Notice] Supabase insert note: ${error.message}. Using development profile store.`);
            newProfile = {
                id: 'dev-user-' + Math.random().toString(36).substring(2, 10),
                phone,
                full_name: full_name.trim(),
                role,
                company_name: company_name ? company_name.trim() : null,
                gst_number: gst_number ? gst_number.trim() : null,
                email: email ? email.trim() : null,
                rating_avg: '5.00',
                rating_count: 0,
                created_at: new Date().toISOString(),
            };
            devProfilesStore.set(newProfile.id, newProfile);
            devProfilesStore.set(phone, newProfile);
        } else {
            throw ApiError.internal(`Failed to register user profile: ${error.message}`);
        }
    } else {
        newProfile = insertedData;
    }


    // Generate mandatory signed JWT token
    const token = generateToken(newProfile);

    return {
        token,
        user: newProfile,
        isNewUser: true,
    };
};

/**
 * Log in an existing registered user with phone number and OTP
 */
export const loginUser = async (rawPhone, otp) => {
    const phone = formatPhoneNumber(rawPhone);

    // Verify OTP
    verifyOtpCode(phone, otp);

    // Fetch registered profile
    let profile = null;
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

    if (error || !data) {
        if (env.NODE_ENV === 'development' && devProfilesStore.has(phone)) {
            profile = devProfilesStore.get(phone);
        } else {
            throw ApiError.notFound('No account found for this phone number. Please register first.');
        }
    } else {
        profile = data;
    }

    // Generate mandatory signed JWT token
    const token = generateToken(profile);

    return {
        token,
        user: profile,
        isNewUser: false,

    };
};

/**
 * Unified Verify OTP Route (handles either login or automatic registration)
 */
export const verifyOtpUnified = async (data) => {
    const { phone: rawPhone, otp, token: rawToken, full_name, role, company_name } = data;
    const phone = formatPhoneNumber(rawPhone);
    const otpToVerify = otp || rawToken;

    // Check if user is registered
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

    if (existingProfile) {
        return await loginUser(phone, otpToVerify);
    } else {
        return await registerUser({
            phone,
            otp: otpToVerify,
            full_name: full_name || 'User',
            role: role || 'business',
            company_name,
        });
    }
};

/**
 * Get profile by user ID
 */
export const getUserProfile = async (userId) => {
    const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (error || !data) {
        if (env.NODE_ENV === 'development' && devProfilesStore.has(userId)) {
            return devProfilesStore.get(userId);
        }
        throw ApiError.notFound('User profile not found');
    }

    return data;
};


/**
 * Update current user profile
 */
export const updateUserProfile = async (userId, updates) => {
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
    requestPhoneOtp,
    registerUser,
    loginUser,
    verifyOtpUnified,
    getUserProfile,
    updateUserProfile,
    generateToken,
};
