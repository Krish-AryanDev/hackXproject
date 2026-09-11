import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ShieldCheck, Truck, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export const OwnerApprovalsPage = () => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPendingBookings();
    }, []);

    const fetchPendingBookings = async () => {
        setLoading(true);
        setError('');
        try {
            // Fetch pending requests specifically for the authenticated user's owned vehicles
            const res = await api.get('/bookings/owner-pending');
            if (res.data?.success) {
                setBookings(res.data.data || []);
            }
        } catch (err) {
            setError('Could not fetch pending booking requests for your vehicles.');
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    const handleRespond = async (bookingId, action) => {
        setActionLoading(bookingId);
        setMessage('');
        setError('');
        try {
            const res = await api.post(`/bookings/${bookingId}/respond`, {
                action,
                rejectionReason: action === 'reject' ? 'Declined by fleet owner' : undefined,
            });

            if (res.data?.success) {
                setMessage(
                    action === 'approve'
                        ? '✅ BOOKING APPROVED: Trip removed from database marketplace and dispatched to driver (Krish Aryan)!'
                        : '❌ Booking request rejected.'
                );
                // Remove from pending list
                setBookings(prev => prev.filter(b => b.id !== bookingId));
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update booking status');
        } finally {
            setActionLoading(null);
        }
    };

    const ownerDisplayName = user?.full_name?.toUpperCase() || 'KSHITIJ CHAUBEY';
    const ownerCompany = user?.company_name || 'Fleet Owner Account';

    return (
        <main className="main-content" style={{ flex: 1, padding: '24px 32px', backgroundColor: '#F8FAFC', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#18181B', color: '#FFFFFF', padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 900, marginBottom: 8, letterSpacing: 0.5 }}>
                            <ShieldCheck size={14} color="#10B981" />
                            OWNER DISPATCH PORTAL ({ownerDisplayName})
                        </div>
                        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#000000', margin: 0, letterSpacing: -0.5 }}>
                            Pending Cargo Booking Approvals
                        </h1>
                        <p style={{ color: '#6B7280', fontSize: 14, margin: '6px 0 0 0', fontWeight: 500 }}>
                            Only showing incoming co-loading requests for your own registered vehicles. Approving dispatches the vehicle and removes the trip from the marketplace.
                        </p>
                    </div>

                    <button
                        onClick={fetchPendingBookings}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 18px',
                            backgroundColor: '#000000',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: 13,
                            cursor: 'pointer',
                        }}
                    >
                        <RefreshCw size={16} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Notification Messages */}
            {message && (
                <div style={{ backgroundColor: '#DCFCE7', border: '1.5px solid #16A34A', borderRadius: 14, padding: '14px 18px', color: '#166534', fontWeight: 800, fontSize: 14, marginBottom: 20 }}>
                    {message}
                </div>
            )}

            {error && (
                <div style={{ backgroundColor: '#FEE2E2', border: '1.5px solid #DC2626', borderRadius: 14, padding: '14px 18px', color: '#991B1B', fontWeight: 800, fontSize: 14, marginBottom: 20 }}>
                    {error}
                </div>
            )}

            {/* Pending Bookings List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#6B7280', fontWeight: 700 }}>
                    Loading pending owner approvals...
                </div>
            ) : bookings.length === 0 ? (
                <div style={{ backgroundColor: '#F9FAFB', border: '2px dashed #D1D5DB', borderRadius: 20, padding: 50, textAlign: 'center' }}>
                    <Truck size={48} color="#9CA3AF" style={{ margin: '0 auto 12px auto' }} />
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: 0 }}>
                        No Pending Booking Requests
                    </h3>
                    <p style={{ color: '#6B7280', fontSize: 13, margin: '6px 0 0 0' }}>
                        All return leg bookings have been approved or dispatched. When a shipper books Krish Truck, it will appear here immediately.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 20 }}>
                    {bookings.map((booking) => (
                        <div
                            key={booking.id}
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: '2px solid #000000',
                                borderRadius: 20,
                                padding: 22,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                            }}
                        >
                            {/* Card Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 900, color: '#2563EB', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                        {booking.cargo_category || 'General Freight'}
                                    </div>
                                    <h3 style={{ fontSize: 18, fontWeight: 900, color: '#000000', margin: '2px 0 0 0' }}>
                                        {booking.cargo_title}
                                    </h3>
                                </div>

                                <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #F59E0B', color: '#B45309', padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 900 }}>
                                    Awaiting Approval
                                </div>
                            </div>

                            {/* Shipper & Vehicle Info */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280' }}>SHIPPER</div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>
                                        {booking.business?.full_name || 'Verified Shipper'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#4B5563' }}>{booking.business?.phone || '+91 8092150567'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280' }}>ASSIGNED VEHICLE</div>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: '#111827' }}>
                                        {booking.trip?.vehicle?.model_name || 'Krish Truck (Tata Signa)'}
                                    </div>
                                    <div style={{ fontSize: 11, color: '#4B5563' }}>Driver: {booking.trip?.driver?.full_name || 'Krish Aryan'}</div>
                                </div>
                            </div>

                            {/* Route & Cargo Metrics */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280' }}>PICKUP → DROP</div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: '#000000' }}>
                                        {booking.pickup_address?.split(',')[0]} → {booking.drop_address?.split(',')[0]}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280' }}>PAYOUT</div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: '#16A34A' }}>
                                        ₹{booking.price_calculated?.toLocaleString('en-IN') || '40,000'}
                                    </div>
                                </div>
                            </div>

                            {/* AI Safety Verdict */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '8px 12px', borderRadius: 10, marginBottom: 18 }}>
                                <CheckCircle2 size={16} color="#16A34A" />
                                <div style={{ fontSize: 11, fontWeight: 800, color: '#15803D' }}>
                                    AI Co-Loading Score: {booking.ai_compatibility_score || 95}% ({booking.ai_compatibility_verdict || 'COMPATIBLE'})
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => handleRespond(booking.id, 'approve')}
                                    disabled={actionLoading === booking.id}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#000000',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: 12,
                                        padding: '12px 0',
                                        fontWeight: 900,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                    }}
                                >
                                    {actionLoading === booking.id ? 'Approving...' : 'APPROVE & DISPATCH'}
                                </button>
                                <button
                                    onClick={() => handleRespond(booking.id, 'reject')}
                                    disabled={actionLoading === booking.id}
                                    style={{
                                        backgroundColor: '#F3F4F6',
                                        color: '#EF4444',
                                        border: '1.5px solid #E5E7EB',
                                        borderRadius: 12,
                                        padding: '12px 18px',
                                        fontWeight: 800,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                    }}
                                >
                                    REJECT
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
};

export default OwnerApprovalsPage;
