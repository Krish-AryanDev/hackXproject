import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, SlidersHorizontal, RefreshCw, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import TruckCard from '../components/TruckCard';
import BookingModal from '../components/BookingModal';
import api from '../api';

export const SearchDashboard = ({ onGoToTracking }) => {
    const [fromCity, setFromCity] = useState('Jaipur');
    const [toCity, setToCity] = useState('Delhi');
    const [travelDate, setTravelDate] = useState('SEPT 12, 2026');
    const [capacity, setCapacity] = useState('2.0 TONS');

    const [selectedTruck, setSelectedTruck] = useState(null);
    const [loading, setLoading] = useState(false);
    const [trucks, setTrucks] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        handleSearch();
    }, []);

    const handleSearch = async () => {
        setLoading(true);
        setError('');
        try {
            // Live query to Backend PostgreSQL Database
            const queryParams = new URLSearchParams();
            if (fromCity.trim()) queryParams.append('origin', fromCity.trim().split(' ')[0]);
            if (toCity.trim()) queryParams.append('destination', toCity.trim().split(' ')[0]);
            queryParams.append('minAvailableCapacity', parseFloat(capacity) || 1.0);
            queryParams.append('status', 'all');

            const res = await api.get(`/trips?${queryParams.toString()}`);

            if (res.data?.success) {
                const liveDbTrips = res.data.data.items || [];
                const formattedTrucks = liveDbTrips.map((t) => ({
                    id: t.id,
                    vehicle_type: t.vehicle?.vehicle_type || 'closed_container',
                    registration_number: t.vehicle?.registration_number || 'RJ14-GB-9821',
                    title: `${(t.vehicle?.model_name || 'TATA SIGNA').toUpperCase()} - ${t.vehicle?.registration_number || ''}`,
                    status_text: `En Route ${t.destination_name} (ETA 30 mins)`,
                    origin_name: t.origin_name?.split(',')[0] || 'Jaipur',
                    destination_name: t.destination_name?.split(',')[0] || 'Delhi',
                    loaded_tons: t.current_loaded_tons || '8.0',
                    available_capacity_tons: t.available_capacity_tons || '3.0',
                    price_per_km: t.base_price_per_km_ton || '1.70',
                    existing_cargo_category: t.existing_cargo_category,
                    existing_cargo_description: t.existing_cargo_description,
                    owner: t.owner,
                    driver: t.driver,
                }));
                setTrucks(formattedTrucks);
            } else {
                setError(res.data?.message || 'Failed to fetch live trips');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to connect to live logistics database');
            setTrucks([]);
        } finally {
            setLoading(false);
        }
    };

    const handleShowAll = async () => {
        setFromCity('');
        setToCity('');
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/trips?status=all');
            if (res.data?.success) {
                const liveDbTrips = res.data.data.items || [];
                const formattedTrucks = liveDbTrips.map((t) => ({
                    id: t.id,
                    vehicle_type: t.vehicle?.vehicle_type || 'closed_container',
                    registration_number: t.vehicle?.registration_number || 'RJ14...',
                    title: `${(t.vehicle?.model_name || 'TATA SIGNA').toUpperCase()} - ${t.vehicle?.registration_number || ''}`,
                    status_text: `En Route ${t.destination_name}`,
                    origin_name: t.origin_name?.split(',')[0] || 'Jaipur',
                    destination_name: t.destination_name?.split(',')[0] || 'Delhi',
                    loaded_tons: t.current_loaded_tons || '8.0',
                    available_capacity_tons: t.available_capacity_tons || '3.0',
                    price_per_km: t.base_price_per_km_ton || '1.70',
                    existing_cargo_category: t.existing_cargo_category,
                    existing_cargo_description: t.existing_cargo_description,
                    owner: t.owner,
                    driver: t.driver,
                }));
                setTrucks(formattedTrucks);
            }
        } catch (err) {
            setError('Could not load all trucks from database');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="main-wrapper">
            <Header title="SEARCH" />

            <div className="content-body">
                {/* Search / Filter Card */}
                <div className="search-card">
                    <div className="search-grid">
                        <div className="search-field">
                            <label className="field-label">FROM</label>
                            <input
                                className="field-input"
                                value={fromCity}
                                onChange={(e) => setFromCity(e.target.value)}
                                placeholder="Origin city (e.g. Jaipur)"
                            />
                        </div>

                        <div className="search-field">
                            <label className="field-label">TO</label>
                            <input
                                className="field-input"
                                value={toCity}
                                onChange={(e) => setToCity(e.target.value)}
                                placeholder="Destination city (e.g. Delhi)"
                            />
                        </div>

                        <div className="search-field">
                            <label className="field-label">DATE</label>
                            <input
                                className="field-input"
                                value={travelDate}
                                onChange={(e) => setTravelDate(e.target.value)}
                                placeholder="Date"
                            />
                        </div>

                        <div className="search-field">
                            <label className="field-label">CAPACITY</label>
                            <input
                                className="field-input"
                                value={capacity}
                                onChange={(e) => setCapacity(e.target.value)}
                                placeholder="Capacity (e.g. 2.0 TONS)"
                            />
                        </div>
                    </div>

                    <div className="search-actions-row">
                        <button
                            className="btn-search"
                            onClick={handleSearch}
                            disabled={loading}
                        >
                            <Search size={18} strokeWidth={2.5} />
                            <span>SEARCH</span>
                        </button>

                        <div className="compatibility-badge">
                            <CheckCircle2 size={18} color="#10B981" />
                            <span>AI COMPATIBILITY CHECK READY</span>
                        </div>
                    </div>
                </div>

                {/* Section Header */}
                <div className="section-header-row">
                    <h2 className="section-title">AVAILABLE TRUCKS ({trucks.length})</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#4B5563' }}>
                            {loading ? 'Searching live database...' : `${trucks.length} Trucks Available Along Corridor`}
                        </span>
                        <span className="link-show-all" onClick={handleShowAll}>Show all vehicles</span>
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #F87171', borderRadius: 12, padding: '14px 18px', color: '#991B1B', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <AlertCircle size={20} />
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{error}</span>
                    </div>
                )}

                {/* Trucks Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: '#6B7280', fontSize: 15, fontWeight: 600 }}>
                        <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px auto' }} />
                        Querying available return trucks from database...
                    </div>
                ) : trucks.length === 0 ? (
                    <div style={{ backgroundColor: '#FFFFFF', border: '2px dashed #E5E7EB', borderRadius: 18, padding: 48, textAlign: 'center', margin: '20px 0' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827', margin: 0 }}>No trucks found for this search filter</h3>
                        <p style={{ color: '#6B7280', fontSize: 14, margin: '8px 0 16px 0' }}>Try changing the route or clearing the filters to see all available return leg trips.</p>
                        <button onClick={handleShowAll} className="auth-btn-primary" style={{ display: 'inline-block', width: 'auto', padding: '10px 24px' }}>
                            Show All Active Return Trucks
                        </button>
                    </div>
                ) : (
                    /* 2-Column Grid matching mockup with live database items */
                    <div className="trucks-grid">
                        {trucks.map((truck) => (
                            <TruckCard
                                key={truck.id}
                                truck={truck}
                                onSelect={(t) => setSelectedTruck(t)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Booking & AI Check Modal */}
            {selectedTruck && (
                <BookingModal
                    truck={selectedTruck}
                    searchParams={{ from: fromCity || 'Jaipur', to: toCity || 'Delhi', capacity: capacity.split(' ')[0] }}
                    onClose={() => setSelectedTruck(null)}
                    onBookingSuccess={() => handleSearch()}
                    onGoToTracking={onGoToTracking}
                />
            )}
        </div>
    );
};

export default SearchDashboard;
