import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import SearchDashboard from './pages/SearchDashboard';
import TrackingPage from './pages/TrackingPage';
import OwnerApprovalsPage from './pages/OwnerApprovalsPage';
import LoginPage from './pages/LoginPage';

function MainApp() {
    const { token, loading } = useAuth();
    const [activeTab, setActiveTab] = useState('tracking'); // Default to Tracking Map view matching user request
    const [selectedShipmentId, setSelectedShipmentId] = useState(null);

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B0F19', color: '#FFFFFF' }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>Loading Truber Portal...</div>
            </div>
        );
    }

    // If Business Owner is not authenticated, show Login Page
    if (!token) {
        return <LoginPage />;
    }

    const handleGoToTracking = (tripOrBooking) => {
        setSelectedShipmentId(tripOrBooking?.trip_id || tripOrBooking?.id);
        setActiveTab('tracking');
    };

    // Show Selected Tab
    return (
        <div className="app-container">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            {activeTab === 'tracking' && (
                <TrackingPage initialShipmentId={selectedShipmentId} />
            )}
            {activeTab === 'dashboard' && (
                <SearchDashboard onGoToTracking={handleGoToTracking} />
            )}
            {activeTab === 'approvals' && (
                <OwnerApprovalsPage />
            )}
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <MainApp />
        </AuthProvider>
    );
}
