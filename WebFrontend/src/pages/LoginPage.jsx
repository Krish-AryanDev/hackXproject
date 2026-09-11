import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Shield } from 'lucide-react';

export const LoginPage = () => {
    const { sendOtp, login, register } = useAuth();

    const [isSignUp, setIsSignUp] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [fullName, setFullName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [gstNumber, setGstNumber] = useState('');

    const [otpSent, setOtpSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!phone || phone.trim().length < 10) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        if (isSignUp && (!fullName || !companyName)) {
            setError('Please enter your full name and company name');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const formattedPhone = phone.trim().startsWith('+91') ? phone.trim() : `+91${phone.trim()}`;
            const res = await sendOtp(formattedPhone);
            if (res.success) {
                setOtpSent(true);
                setSuccessMsg('OTP code sent! Check server terminal console (or use test code 123456).');
            } else {
                setError(res.message || 'Failed to send OTP');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Server connection error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp || otp.trim().length !== 6) {
            setError('Please enter the 6-digit OTP code');
            return;
        }

        setError('');
        setLoading(true);

        const formattedPhone = phone.trim().startsWith('+91') ? phone.trim() : `+91${phone.trim()}`;

        if (isSignUp) {
            const res = await register({
                phone: formattedPhone,
                otp: otp.trim(),
                full_name: fullName.trim(),
                company_name: companyName.trim(),
                gst_number: gstNumber.trim() || undefined,
            });

            if (!res.success) {
                setError(res.message);
                setLoading(false);
            }
        } else {
            const res = await login(formattedPhone, otp.trim());
            if (!res.success) {
                setError(res.message);
                setLoading(false);
            }
        }
    };

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                {/* Brand Badge */}
                <div className="auth-logo-badge">T</div>

                <h1 className="auth-title">{isSignUp ? 'Shipper Onboarding' : 'Business Portal'}</h1>
                <p className="auth-subtitle">
                    {isSignUp
                        ? 'Register your company to book return freight at 30% discount'
                        : 'Sign in with your registered phone number & OTP'}
                </p>

                {error && (
                    <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', padding: 12, borderRadius: 10, color: '#B91C1C', fontSize: 13, marginBottom: 20 }}>
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', padding: 12, borderRadius: 10, color: '#047857', fontSize: 13, marginBottom: 20 }}>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={!otpSent ? handleSendOtp : handleVerifyOtp}>
                    {isSignUp && (
                        <>
                            <div style={{ marginBottom: 14 }}>
                                <label className="field-label">Full Name</label>
                                <input
                                    className="field-input"
                                    style={{ width: '100%' }}
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="e.g. Priya Sharma"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label className="field-label">Company / Enterprise Name</label>
                                <input
                                    className="field-input"
                                    style={{ width: '100%' }}
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="e.g. Fresh Organics Corp"
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: 14 }}>
                                <label className="field-label">GST Number (Optional)</label>
                                <input
                                    className="field-input"
                                    style={{ width: '100%' }}
                                    type="text"
                                    value={gstNumber}
                                    onChange={(e) => setGstNumber(e.target.value)}
                                    placeholder="08AAAAA0000A1Z5"
                                />
                            </div>
                        </>
                    )}

                    <div style={{ marginBottom: 14 }}>
                        <label className="field-label">Business Phone Number</label>
                        <input
                            className="field-input"
                            style={{ width: '100%' }}
                            type="tel"
                            value={phone}
                            onChange={(e) => {
                                setPhone(e.target.value);
                                if (otpSent) setOtpSent(false);
                            }}
                            placeholder="+91-9876543210"
                            required
                        />
                    </div>

                    {otpSent && (
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="field-label">6-Digit OTP Code</label>
                                <button
                                    type="button"
                                    onClick={() => setOtp('123456')}
                                    style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                >
                                    🧪 Fill Dev OTP (123456)
                                </button>
                            </div>
                            <input
                                className="field-input"
                                style={{ width: '100%', fontSize: 20, letterSpacing: 4, textAlign: 'center' }}
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="• • • • • •"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="auth-btn-primary"
                        disabled={loading}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    >
                        {loading ? (
                            'Processing...'
                        ) : otpSent ? (
                            isSignUp ? 'Complete Registration' : 'Verify & Enter Portal'
                        ) : isSignUp ? (
                            'Get Signup OTP'
                        ) : (
                            'Send One-Time OTP'
                        )}
                        <ArrowRight size={18} />
                    </button>
                </form>

                {/* Footer Mode Switcher */}
                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: '#6B7280' }}>
                    {isSignUp ? 'Already registered?' : "Don't have a business account?"}{' '}
                    <button
                        type="button"
                        onClick={() => {
                            setIsSignUp(!isSignUp);
                            setOtpSent(false);
                            setError('');
                            setSuccessMsg('');
                        }}
                        style={{ background: 'none', border: 'none', color: '#000000', fontWeight: 800, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {isSignUp ? 'Sign In here' : 'Sign Up as Business'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
