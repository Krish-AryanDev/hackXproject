import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginDriverApi, registerDriverApi, getDriverProfileApi } from '../api/auth.api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('@driver_token');
                const storedUser = await AsyncStorage.getItem('@driver_profile');

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                }
            } catch (err) {
                console.warn('Failed to load stored auth session:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadStoredAuth();
    }, []);

    const login = async (phone, otp) => {
        setIsLoading(true);
        try {
            const res = await loginDriverApi(phone, otp);
            if (res.success && res.data?.token) {
                const receivedToken = res.data.token;
                const driverProfile = res.data.user;

                setToken(receivedToken);
                setUser(driverProfile);

                await AsyncStorage.setItem('@driver_token', receivedToken);
                await AsyncStorage.setItem('@driver_profile', JSON.stringify(driverProfile));

                return { success: true, data: res.data };
            } else {
                return { success: false, message: res.message || 'Login failed' };
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Connection error with logistics server';
            return { success: false, message: msg };
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (driverDetails) => {
        setIsLoading(true);
        try {
            const res = await registerDriverApi(driverDetails);
            if (res.success && res.data?.token) {
                const receivedToken = res.data.token;
                const driverProfile = res.data.user;

                setToken(receivedToken);
                setUser(driverProfile);

                await AsyncStorage.setItem('@driver_token', receivedToken);
                await AsyncStorage.setItem('@driver_profile', JSON.stringify(driverProfile));

                return { success: true, data: res.data };
            } else {
                return { success: false, message: res.message || 'Registration failed' };
            }
        } catch (error) {
            const msg = error.response?.data?.message || error.message || 'Registration error';
            return { success: false, message: msg };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setUser(null);
        setToken(null);
        await AsyncStorage.removeItem('@driver_token');
        await AsyncStorage.removeItem('@driver_profile');
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
