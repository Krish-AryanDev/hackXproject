import React, { useState } from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '../api';

export const BookingModal = ({ truck, searchParams, onClose, onBookingSuccess }) => {
    const [cargoTitle, setCargoTitle] = useState('Household Storage Crates');
    const [cargoCategory, setCargoCategory] = useState('packaged_consumer_goods');
    const [cargoDescription, setCargoDescription] = useState('50 sealed corrugated boxes of plastic containers');
    const [weightTons, setWeightTons] = useState(searchParams?.capacity || '2.0');

    // AI Check & Submission States
    const [checkingAi, setCheckingAi] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [bookingCompleted, setBookingCompleted] = useState(null);
    const [error, setError] = useState('');

    const handleRunAiCheck = async () => {
        setCheckingAi(true);
        setError('');
        try {
            const res = await api.post('/matching/check-compatibility', {
                existingCargo: {
                    category: truck?.existing_cargo_category || 'packaged_fmcg',
                    description: truck?.existing_cargo_description || 'Packaged biscuits & tea boxes',
                },
                newCargo: {
                    category: cargoCategory,
                    description: cargoDescription,
                    weight_tons: parseFloat(weightTons),
                },
            });

            if (res.data?.success) {
                setAiResult(res.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Could not evaluate AI safety check');
        } finally {
            setCheckingAi(false);
        }
    };

    const handleConfirmBooking = async () => {
        setSubmitting(true);
        setError('');
        try {
            const res = await api.post('/bookings', {
                trip_id: truck?.id || 'sample-trip-id',
                cargo_title: cargoTitle,
                cargo_category: cargoCategory,
                cargo_description: cargoDescription,
                weight_tons: parseFloat(weightTons),
                pickup_address: `${searchParams?.from || 'Jaipur'}, Industrial Area`,
                pickup_lat: 26.9124,
                pickup_lng: 75.7873,
                drop_address: `${searchParams?.to || 'Delhi'}, Logistics Terminal`,
                drop_lat: 28.7041,
                drop_lng: 77.1025,
            });

            if (res.data?.success) {
                setBookingCompleted(res.data.data);
                if (onBookingSuccess) onBookingSuccess(res.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to submit booking');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={22} />
                </button>

                {!bookingCompleted ? (
                    <>
                        <div style={{ marginBottom: 20 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#10B981', letterSpacing: 0.5 }}>
                                RETURN CORRIDOR DISPATCH
                            </span>
                            <h2 style={{ fontSize: 22, fontWeight: 900, color: '#000000', marginTop: 4 }}>
                                Book Space on {truck?.vehicle_type?.toUpperCase()}
                            </h2>
                            <p style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
                                {searchParams?.from || 'Jaipur'} ➔ {searchParams?.to || 'Delhi'} • Available: {truck?.available_capacity_tons || '3.0'} Tons
                            </p>
                        </div>

                        {error && (
                            <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', padding: 12, borderRadius: 10, color: '#B91C1C', fontSize: 13, marginBottom: 16 }}>
                                {error}
                            </div>
                        )}

                        {/* Form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label className="field-label">Cargo Title</label>
                                <input
                                    className="field-input"
                                    style={{ width: '100%' }}
                                    value={cargoTitle}
                                    onChange={(e) => setCargoTitle(e.target.value)}
                                    placeholder="e.g. Electrical Panels"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label className="field-label">Cargo Category</label>
                                    <select
                                        className="field-select"
                                        style={{ width: '100%' }}
                                        value={cargoCategory}
                                        onChange={(e) => setCargoCategory(e.target.value)}
                                    >
                                        <option value="packaged_consumer_goods">Packaged Consumer Goods</option>
                                        <option value="dry_packaged_goods">Dry Packaged FMCG</option>
                                        <option value="fresh_produce">Fresh Produce / Perishables</option>
                                        <option value="industrial_machinery">Industrial Machinery</option>
                                        <option value="chemicals">Industrial Chemicals</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="field-label">Weight (Tons)</label>
                                    <input
                                        className="field-input"
                                        style={{ width: '100%' }}
                                        type="number"
                                        step="0.5"
                                        value={weightTons}
                                        onChange={(e) => setWeightTons(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="field-label">Detailed Cargo Description</label>
                                <textarea
                                    className="field-input"
                                    style={{ width: '100%', height: 64, paddingTop: 10, resize: 'none' }}
                                    value={cargoDescription}
                                    onChange={(e) => setCargoDescription(e.target.value)}
                                    placeholder="Describe packaging, fragility, and storage needs..."
                                />
                            </div>
                        </div>

                        {/* Groq AI Compatibility Trigger */}
                        <div style={{ marginTop: 20, padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ShieldCheck size={20} color="#10B981" />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                                        Groq AI Co-Loading Safety Check
                                    </span>
                                </div>
                                <button
                                    style={{ padding: '6px 14px', backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                                    onClick={handleRunAiCheck}
                                    disabled={checkingAi}
                                >
                                    {checkingAi ? 'Inspecting...' : 'Run Safety Check'}
                                </button>
                            </div>

                            {aiResult && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #E5E7EB' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: 6,
                                            fontSize: 11,
                                            fontWeight: 800,
                                            backgroundColor: aiResult.safety_level === 'SAFE' ? '#ECFDF5' : '#FEF3C7',
                                            color: aiResult.safety_level === 'SAFE' ? '#065F46' : '#92400E'
                                        }}>
                                            {aiResult.safety_level} (Score: {aiResult.compatibility_score}/100)
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 12, color: '#4B5563', marginTop: 6, lineHeight: 1.4 }}>
                                        {aiResult.reasoning}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Booking Submit Button */}
                        <button
                            className="auth-btn-primary"
                            style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                            onClick={handleConfirmBooking}
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting to Fleet Owner...' : 'Confirm Return Trip Booking'}
                            <ArrowRight size={18} />
                        </button>
                    </>
                ) : (
                    /* Booking Success State */
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <div style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                            <CheckCircle2 size={36} />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#000000' }}>Booking Dispatched!</h2>
                        <p style={{ fontSize: 14, color: '#6B7280', marginTop: 6, maxWidth: 400, margin: '6px auto 20px auto' }}>
                            Your return freight booking has been submitted. The vehicle owner has been notified.
                        </p>

                        <div style={{ backgroundColor: '#F3F4F6', padding: 20, borderRadius: 14, margin: '20px 0', border: '2px dashed #000000' }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: '#6B7280', letterSpacing: 0.5 }}>
                                CONSIGNEE PROOF OF DELIVERY (POD) OTP
                            </span>
                            <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: 6, color: '#000000', margin: '8px 0' }}>
                                {bookingCompleted?.pod_otp || '782910'}
                            </div>
                            <span style={{ fontSize: 12, color: '#4B5563' }}>
                                Share this OTP with the receiver at destination dock for handover verification.
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                            <button
                                className="auth-btn-primary"
                                style={{ flex: 1, backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                onClick={() => {
                                    onClose();
                                    if (onGoToTracking) onGoToTracking(bookingCompleted);
                                }}
                            >
                                Track Shipment Live
                                <ArrowRight size={18} />
                            </button>
                            <button
                                className="auth-btn-primary"
                                style={{ flex: 1, backgroundColor: '#000000' }}
                                onClick={onClose}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingModal;
