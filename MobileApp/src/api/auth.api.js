import axios from 'axios';
import { Platform } from 'react-native';

// In React Native / Expo:
// - iOS Simulator / Web: localhost:5000
// - Android Emulator: 10.0.2.2:5000
// - Physical Device: Replace with your machine LAN IP
const getBaseUrl = () => {
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:5000/api/v1';
    }
    return 'http://localhost:5000/api/v1';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

/**
 * Send Phone OTP for Login or Signup
 */
export const requestOtpApi = async (phone) => {
    const response = await api.post('/auth/send-otp', { phone });
    return response.data;
};

/**
 * Login existing Driver with Phone + OTP
 */
export const loginDriverApi = async (phone, otp) => {
    const response = await api.post('/auth/login', { phone, otp });
    return response.data;
};

/**
 * Register new Driver with Details + OTP
 */
export const registerDriverApi = async (driverData) => {
    const response = await api.post('/auth/register', {
        ...driverData,
        role: 'driver', // Driver Mobile App registers as role: driver
    });
    return response.data;
};

/**
 * Fetch Current Authenticated Driver Profile
 */
export const getDriverProfileApi = async (token) => {
    const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
};

export default api;
