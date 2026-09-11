import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('truber_business_token') || null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMe = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get('/auth/me');
                if (res.data?.success) {
                    setUser(res.data.data);
                }
            } catch (err) {
                console.warn('Session expired or logged out:', err.message);
                logout();
            } finally {
                setLoading(false);
            }
        };

        fetchMe();
    }, [token]);

    const sendOtp = async (phone) => {
        const res = await api.post('/auth/send-otp', { phone });
        return res.data;
    };

    const login = async (phone, otp) => {
        const res = await api.post('/auth/login', { phone, otp });
        if (res.data?.success && res.data.data?.token) {
            const authToken = res.data.data.token;
            const profile = res.data.data.user;
            setToken(authToken);
            setUser(profile);
            localStorage.setItem('truber_business_token', authToken);
            localStorage.setItem('truber_business_profile', JSON.stringify(profile));
            return { success: true, data: res.data.data };
        }
        return { success: false, message: res.data?.message || 'Login failed' };
    };

    const register = async (formData) => {
        const res = await api.post('/auth/register', {
            ...formData,
            role: 'business', // Business Owner
        });
        if (res.data?.success && res.data.data?.token) {
            const authToken = res.data.data.token;
            const profile = res.data.data.user;
            setToken(authToken);
            setUser(profile);
            localStorage.setItem('truber_business_token', authToken);
            localStorage.setItem('truber_business_profile', JSON.stringify(profile));
            return { success: true, data: res.data.data };
        }
        return { success: false, message: res.data?.message || 'Registration failed' };
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('truber_business_token');
        localStorage.removeItem('truber_business_profile');
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, sendOtp, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
