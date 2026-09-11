import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import CurvedHeader from '../components/CurvedHeader.js';
import FloatingInput from '../components/FloatingInput.js';
import { useAuth } from '../context/AuthContext.js';
import { requestOtpApi } from '../api/auth.api.js';

export const LoginScreen = () => {
    const { login, register } = useAuth();

    // Mode: 'login' | 'signup'
    const [isSignUpMode, setIsSignUpMode] = useState(false);

    // Form inputs
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');

    // Flow states
    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    /**
     * Step 1: Request OTP from backend
     */
    const handleSendOtp = async () => {
        if (!phone || phone.trim().length < 10) {
            setErrorMsg('Please enter a valid 10-digit mobile number');
            return;
        }

        if (isSignUpMode && (!fullName || fullName.trim().length === 0)) {
            setErrorMsg('Please enter your full name for driver registration');
            return;
        }

        setErrorMsg('');
        setSuccessMsg('');
        setLoading(true);

        try {
            const formattedPhone = phone.trim().startsWith('+91')
                ? phone.trim()
                : `+91${phone.trim()}`;

            const res = await requestOtpApi(formattedPhone);

            if (res.success) {
                setOtpSent(true);
                setSuccessMsg('OTP code sent! Check server terminal (or use 123456).');
            } else {
                setErrorMsg(res.message || 'Failed to send OTP code');
            }
        } catch (err) {
            setErrorMsg(err.response?.data?.message || err.message || 'Cannot connect to backend server');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Step 2: Verify OTP & Authenticate
     */
    const handleVerifyAndSubmit = async () => {
        if (!otp || otp.trim().length !== 6) {
            setErrorMsg('Please enter the 6-digit OTP code');
            return;
        }

        setErrorMsg('');
        setLoading(true);

        const formattedPhone = phone.trim().startsWith('+91')
            ? phone.trim()
            : `+91${phone.trim()}`;

        if (isSignUpMode) {
            // Driver Registration Flow
            const regResult = await register({
                phone: formattedPhone,
                otp: otp.trim(),
                full_name: fullName.trim(),
                role: 'driver',
            });

            if (!regResult.success) {
                setErrorMsg(regResult.message);
                setLoading(false);
            }
        } else {
            // Driver Login Flow
            const loginResult = await login(formattedPhone, otp.trim());

            if (!loginResult.success) {
                setErrorMsg(loginResult.message);
                setLoading(false);
            }
        }
    };

    /**
     * Main action button handler
     */
    const handleActionPress = () => {
        if (!otpSent) {
            handleSendOtp();
        } else {
            handleVerifyAndSubmit();
        }
    };

    /**
     * Toggle between Login and Signup mode
     */
    const toggleMode = () => {
        setIsSignUpMode((prev) => !prev);
        setOtpSent(false);
        setOtp('');
        setErrorMsg('');
        setSuccessMsg('');
    };

    /**
     * Quick filler for dev testing
     */
    const fillTestOtp = () => {
        setOtp('123456');
    };

    return (
        <KeyboardAvoidingView
            style={styles.screen}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="light" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                bounces={false}
            >
                {/* 1. Curvy Header matching designer's mockup */}
                <CurvedHeader title={isSignUpMode ? 'Sign Up' : 'Login'} />

                {/* 2. Main Form Body */}
                <View style={styles.formContainer}>
                    {/* Feedback Messages */}
                    {errorMsg ? (
                        <View style={styles.errorBanner}>
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    ) : null}

                    {successMsg ? (
                        <View style={styles.successBanner}>
                            <Text style={styles.successText}>{successMsg}</Text>
                        </View>
                    ) : null}

                    {/* Driver Full Name Input (Only in Sign Up Mode) */}
                    {isSignUpMode && (
                        <FloatingInput
                            label="Full Name"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="e.g. Ramesh Kumar"
                            autoCapitalize="words"
                        />
                    )}

                    {/* Phone Input matching exact mockup (Email removed per instructions) */}
                    <FloatingInput
                        label="Phone"
                        value={phone}
                        onChangeText={(val) => {
                            setPhone(val);
                            if (otpSent) setOtpSent(false); // Reset OTP state if phone changes
                        }}
                        placeholder="+91-809******7"
                        keyboardType="phone-pad"
                        maxLength={15}
                    />

                    {/* OTP Input (Revealed after clicking login/send OTP) */}
                    {otpSent && (
                        <View style={styles.otpSection}>
                            <FloatingInput
                                label="6-Digit OTP"
                                value={otp}
                                onChangeText={setOtp}
                                placeholder="Enter 6-digit OTP code"
                                keyboardType="number-pad"
                                maxLength={6}
                            />

                            {/* Dev Quick-Fill helper */}
                            <TouchableOpacity style={styles.devOtpButton} onPress={fillTestOtp}>
                                <Text style={styles.devOtpText}>🧪 Dev Mode: Auto-fill OTP (123456)</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Action Button: Solid Black Button matching mockup */}
                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleActionPress}
                        activeOpacity={0.85}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.loginButtonText}>
                                {otpSent
                                    ? isSignUpMode
                                        ? 'complete signup'
                                        : 'verify & login'
                                    : isSignUpMode
                                        ? 'get registration otp'
                                        : 'login'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Resend OTP button if OTP is already sent */}
                    {otpSent && (
                        <TouchableOpacity style={styles.resendButton} onPress={handleSendOtp} disabled={loading}>
                            <Text style={styles.resendText}>Didn't receive OTP? Resend</Text>
                        </TouchableOpacity>
                    )}

                    {/* Footer Toggle matching mockup: "Not have account? Signup here" */}
                    <TouchableOpacity style={styles.footerContainer} onPress={toggleMode} activeOpacity={0.7}>
                        <Text style={styles.footerRegularText}>
                            {isSignUpMode ? 'Already have an account?' : 'Not have account?'}
                        </Text>
                        <Text style={styles.footerBoldText}>
                            {isSignUpMode ? ' Login here' : ' Signup here'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        flexGrow: 1,
        backgroundColor: '#FFFFFF',
        paddingBottom: 30,
    },
    formContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 32,
        paddingTop: 10,
    },
    errorBanner: {
        backgroundColor: '#FEE2E2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 10,
        padding: 10,
        marginBottom: 14,
    },
    errorText: {
        color: '#B91C1C',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    successBanner: {
        backgroundColor: '#ECFDF5',
        borderWidth: 1,
        borderColor: '#6EE7B7',
        borderRadius: 10,
        padding: 10,
        marginBottom: 14,
    },
    successText: {
        color: '#047857',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    otpSection: {
        width: '100%',
    },
    devOtpButton: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 6,
        marginTop: -4,
        marginBottom: 8,
    },
    devOtpText: {
        fontSize: 11,
        color: '#4B5563',
        fontWeight: '600',
    },
    loginButton: {
        width: '100%',
        height: 52,
        backgroundColor: '#000000',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 18,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    loginButtonDisabled: {
        backgroundColor: '#4B5563',
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5,
        fontFamily: 'System',
    },
    resendButton: {
        alignSelf: 'center',
        marginTop: 12,
        paddingVertical: 6,
    },
    resendText: {
        fontSize: 13,
        color: '#4B5563',
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 22,
        paddingVertical: 8,
    },
    footerRegularText: {
        fontSize: 13,
        color: '#000000',
        fontWeight: '400',
        fontFamily: 'System',
    },
    footerBoldText: {
        fontSize: 13,
        color: '#000000',
        fontWeight: '700',
        fontFamily: 'System',
    },
});

export default LoginScreen;
