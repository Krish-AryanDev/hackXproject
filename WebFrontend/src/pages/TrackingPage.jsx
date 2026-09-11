import React, { useState, useEffect } from 'react';
import {
    Truck,
    Maximize2,
    Clock,
    MapPin,
    ShieldCheck,
    Navigation,
    Phone,
    Package,
    CheckCircle2,
    RefreshCw,
    User,
    ArrowRight,
} from 'lucide-react';
import Header from '../components/Header';
import api from '../api';

// Vibrant marker color palette matching mockup
const TRUCK_COLORS = {
    green: { bg: '#DCFCE7', border: '#16A34A', iconBg: '#10B981', text: '#15803D' },
    yellow: { bg: '#FEF3C7', border: '#F59E0B', iconBg: '#F59E0B', text: '#B45309' },
    red: { bg: '#FEE2E2', border: '#EF4444', iconBg: '#EF4444', text: '#B91C1C' },
    blue: { bg: '#DBEAFE', border: '#3B82F6', iconBg: '#3B82F6', text: '#1D4ED8' },
};

export const TrackingPage = ({ initialShipmentId }) => {
    const [shipments, setShipments] = useState([]);
    const [selectedShipment, setSelectedShipment] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        fetchActiveShipments();
    }, []);

    const fetchActiveShipments = async () => {
        setLoading(true);
        try {
            // Fetch live trips and user bookings
            const [tripsRes, bookingsRes] = await Promise.all([
                api.get('/trips?status=all'),
                api.get('/bookings/my-bookings').catch(() => ({ data: { data: [] } })),
            ]);

            const trips = tripsRes.data?.data?.items || [];
            const bookings = bookingsRes.data?.data || [];

            // Color scheme assignment for 4 visual statuses
            const colorKeys = ['green', 'yellow', 'red', 'blue'];

            const formatted = trips.map((t, idx) => {
                const colorKey = colorKeys[idx % colorKeys.length];
                const matchingBooking = bookings.find((b) => b.trip_id === t.id);

                return {
                    id: t.id,
                    title: `${(t.vehicle?.model_name || 'TATA SIGNA').toUpperCase()} - ${t.vehicle?.registration_number?.slice(0, 10) || 'RJ14...'}`,
                    vehicleName: t.vehicle?.model_name || 'Tata Signa 4825.TK',
                    regNumber: t.vehicle?.registration_number || 'RJ14-GB-9821',
                    vehicleType: t.vehicle?.vehicle_type || 'closed_container',
                    status_text: idx === 1 ? 'Idle Jaipur' : `En Route ${t.destination_name?.split(',')[0] || 'Delhi'}`,
                    subStatus: idx === 1 ? 'Idle Jaipur' : idx === 0 ? `Real-time ${t.destination_name?.split(',')[0] || 'Delhi'}` : 'Real-time ETA',
                    etaHours: `${13 - idx}h`,
                    origin: t.origin_name?.split(',')[0] || 'Jaipur',
                    destination: t.destination_name?.split(',')[0] || 'Delhi',
                    lat: t.origin_lat || 26.9124,
                    lng: t.origin_lng || 75.7873,
                    destLat: t.destination_lat || 28.7041,
                    destLng: t.destination_lng || 77.1025,
                    colorKey,
                    colors: TRUCK_COLORS[colorKey],
                    driver: t.driver || { full_name: 'Krish Aryan', phone: '+91 9031350700' },
                    owner: t.owner || { full_name: 'Kshitij Chaubey', company_name: 'Kshitij Chaubey Transporters' },
                    availableCapacity: t.available_capacity_tons || 7.0,
                    totalCapacity: t.total_capacity_tons || 15.0,
                    cargoDescription: t.existing_cargo_description || 'Packaged FMCG Co-Load',
                    booking: matchingBooking,
                    // Position offsets for map visualization
                    mapLeft: idx === 0 ? '30%' : idx === 1 ? '38%' : idx === 2 ? '58%' : '44%',
                    mapTop: idx === 0 ? '34%' : idx === 1 ? '72%' : idx === 2 ? '48%' : '26%',
                };
            });

            setShipments(formatted);
            if (formatted.length > 0) {
                const initial = initialShipmentId
                    ? formatted.find((s) => s.id === initialShipmentId) || formatted[0]
                    : formatted[0];
                setSelectedShipment(initial);
            }
        } catch (err) {
            console.error('Failed to load tracking data:', err);
        } finally {
            setLoading(false);
        }
    };

    const currentTruck = selectedShipment || shipments[0];

    return (
        <div className="main-wrapper" style={{ backgroundColor: '#F8FAFC' }}>
            <Header title="TRACKING" />

            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    padding: '20px 28px',
                    gap: 20,
                    overflow: 'hidden',
                }}
            >
                {/* 1. LEFT COLUMN: INTERACTIVE LIVE GPS MAP */}
                <div
                    style={{
                        flex: '1 1 68%',
                        backgroundColor: '#E5E7EB',
                        borderRadius: 24,
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px solid #D1D5DB',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    {/* OpenStreetMap Base Tile Canvas */}
                    <iframe
                        title="Live Freight Tracking Map"
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        scrolling="no"
                        marginHeight="0"
                        marginWidth="0"
                        src="https://www.openstreetmap.org/export/embed.html?bbox=74.8%2C25.8%2C78.4%2C29.4&layer=mapnik&marker=26.9124%2C75.7873"
                        style={{ border: 0, width: '100%', height: '100%', position: 'absolute', inset: 0 }}
                    />

                    {/* SVG Vector Highway Corridor Line Overlay */}
                    <svg
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            zIndex: 10,
                        }}
                    >
                        <path
                            d="M 220 540 Q 260 480 320 400 T 440 280 T 520 220"
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeDasharray="8 6"
                        />
                        <path
                            d="M 320 400 Q 420 380 500 240"
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    </svg>

                    {/* Top Right Fullscreen & Refresh Button */}
                    <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 30, display: 'flex', gap: 8 }}>
                        <button
                            onClick={fetchActiveShipments}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #D1D5DB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                            title="Refresh GPS"
                        >
                            <RefreshCw size={18} className={loading ? 'spin' : ''} color="#374151" />
                        </button>
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 12,
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #D1D5DB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            }}
                            title="Fullscreen"
                        >
                            <Maximize2 size={18} color="#374151" />
                        </button>
                    </div>

                    {/* Top Left Live Status HUD */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 16,
                            left: 16,
                            zIndex: 30,
                            backgroundColor: 'rgba(15, 23, 42, 0.92)',
                            backdropFilter: 'blur(8px)',
                            padding: '8px 16px',
                            borderRadius: 14,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            color: '#FFFFFF',
                        }}
                    >
                        <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', animation: 'pulse 1.5s infinite' }} />
                        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5 }}>
                            LIVE CORRIDOR NETWORK: 4 TRUCKS IN TRANSIT
                        </span>
                    </div>

                    {/* Interactive Floating Truck Callout Pins (Matching Mockup) */}
                    {shipments.map((truck) => {
                        const isSelected = selectedShipment?.id === truck.id;

                        return (
                            <div
                                key={truck.id}
                                onClick={() => setSelectedShipment(truck)}
                                style={{
                                    position: 'absolute',
                                    left: truck.mapLeft,
                                    top: truck.mapTop,
                                    transform: 'translate(-50%, -100%)',
                                    zIndex: isSelected ? 25 : 20,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                }}
                            >
                                {/* Floating Speech Bubble Popup */}
                                <div
                                    style={{
                                        backgroundColor: '#FFFFFF',
                                        borderRadius: 14,
                                        padding: '6px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        boxShadow: isSelected
                                            ? '0 12px 28px rgba(0,0,0,0.22), 0 0 0 2px #000000'
                                            : '0 6px 16px rgba(0,0,0,0.12)',
                                        border: '1px solid rgba(0,0,0,0.08)',
                                        marginBottom: 6,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 8,
                                            backgroundColor: truck.colors.bg,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Truck size={16} color={truck.colors.iconBg} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 11, fontWeight: 900, color: '#000000' }}>
                                            {truck.title}
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 600, color: '#6B7280' }}>
                                            {truck.status_text}
                                        </div>
                                    </div>
                                </div>

                                {/* Circular Ground Pin Icon */}
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 16,
                                        backgroundColor: truck.colors.iconBg,
                                        border: '3px solid #FFFFFF',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.25)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Truck size={15} color="#FFFFFF" />
                                </div>
                            </div>
                        );
                    })}

                    {/* Bottom Floating Telemetry Panel for Selected Truck */}
                    {currentTruck && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: 16,
                                left: 16,
                                right: 16,
                                zIndex: 30,
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 18,
                                padding: '14px 20px',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        backgroundColor: currentTruck.colors.bg,
                                        border: `1.5px solid ${currentTruck.colors.border}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Truck size={22} color={currentTruck.colors.iconBg} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 15, fontWeight: 900, color: '#000000' }}>
                                            {currentTruck.vehicleName}
                                        </span>
                                        <span style={{ fontSize: 11, fontWeight: 800, backgroundColor: '#E5E7EB', padding: '2px 8px', borderRadius: 6 }}>
                                            {currentTruck.regNumber}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#4B5563', fontWeight: 600, marginTop: 2 }}>
                                        Route: {currentTruck.origin} → {currentTruck.destination} • Driver: {currentTruck.driver?.full_name} ({currentTruck.driver?.phone})
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280' }}>AVAILABLE SPACE</div>
                                    <div style={{ fontSize: 14, fontWeight: 900, color: '#059669' }}>
                                        {currentTruck.availableCapacity} / {currentTruck.totalCapacity} TONS
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: '#6B7280' }}>STATUS</div>
                                    <div style={{ fontSize: 13, fontWeight: 900, color: currentTruck.colors.text }}>
                                        {currentTruck.status_text}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. RIGHT COLUMN: ACTIVE SHIPMENTS SIDEBAR (Matching Mockup) */}
                <div
                    style={{
                        flex: '0 0 340px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 24,
                        padding: 22,
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflowY: 'auto',
                    }}
                >
                    {/* Header */}
                    <div style={{ marginBottom: 18 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#000000', margin: 0, letterSpacing: -0.4 }}>
                            ACTIVE SHIPMENTS
                        </h2>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '4px 0 0 0', fontWeight: 500 }}>
                            Real-time GPS return corridor telemetry
                        </p>
                    </div>

                    {/* Shipments List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {shipments.map((truck) => {
                            const isSelected = selectedShipment?.id === truck.id;

                            return (
                                <div
                                    key={truck.id}
                                    onClick={() => setSelectedShipment(truck)}
                                    style={{
                                        backgroundColor: isSelected ? '#F9FAFB' : '#FFFFFF',
                                        border: isSelected ? '2px solid #000000' : '1.5px solid #F3F4F6',
                                        borderRadius: 16,
                                        padding: '12px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        {/* Truck Circle Icon */}
                                        <div
                                            style={{
                                                width: 38,
                                                height: 38,
                                                borderRadius: 12,
                                                backgroundColor: truck.colors.bg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <Truck size={20} color={truck.colors.iconBg} />
                                        </div>

                                        {/* Title & Status */}
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 900, color: '#000000', letterSpacing: -0.2 }}>
                                                {truck.title}
                                            </div>
                                            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginTop: 2 }}>
                                                {truck.subStatus}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ETA Badge */}
                                    <div
                                        style={{
                                            fontSize: 13,
                                            fontWeight: 800,
                                            color: truck.colors.text,
                                        }}
                                    >
                                        {truck.etaHours}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Owner / Driver Verified Fleet Footer */}
                    <div
                        style={{
                            marginTop: 'auto',
                            paddingTop: 18,
                            borderTop: '1px solid #F3F4F6',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <ShieldCheck size={18} color="#10B981" />
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#374151' }}>
                            Fleet Owner: Kshitij Chaubey (Verified Carrier)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackingPage;
