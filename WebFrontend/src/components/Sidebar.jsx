import React from 'react';
import { LayoutGrid, Package, ShieldCheck, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activeTab, setActiveTab }) => {
    const { logout } = useAuth();

    return (
        <aside className="sidebar" style={{ width: 88, backgroundColor: '#0B131F', padding: '20px 0' }}>
            {/* Truber Brand Logo */}
            <div
                style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: 22,
                    fontWeight: 900,
                    marginBottom: 28,
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
            >
                T
            </div>

            {/* Navigation Icons with Text Labels */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center' }}>
                <button
                    onClick={() => setActiveTab('dashboard')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '10px 0',
                        background: activeTab === 'dashboard' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        borderLeft: activeTab === 'dashboard' ? '3px solid #10B981' : '3px solid transparent',
                        color: activeTab === 'dashboard' ? '#10B981' : '#9CA3AF',
                        borderTop: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    title="Search & Book Return Trips"
                >
                    <LayoutGrid size={22} />
                    <span style={{ fontSize: 9, fontWeight: 800, marginTop: 4, letterSpacing: 0.5 }}>DASHBOARD</span>
                </button>

                <button
                    onClick={() => setActiveTab('tracking')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '10px 0',
                        background: activeTab === 'tracking' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        borderLeft: activeTab === 'tracking' ? '3px solid #10B981' : '3px solid transparent',
                        color: activeTab === 'tracking' ? '#10B981' : '#9CA3AF',
                        borderTop: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    title="Live Tracking Map & Active Shipments"
                >
                    <Package size={22} />
                    <span style={{ fontSize: 9, fontWeight: 800, marginTop: 4, letterSpacing: 0.5 }}>BOOKINGS</span>
                </button>

                <button
                    onClick={() => setActiveTab('approvals')}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        padding: '10px 0',
                        background: activeTab === 'approvals' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        borderLeft: activeTab === 'approvals' ? '3px solid #10B981' : '3px solid transparent',
                        color: activeTab === 'approvals' ? '#10B981' : '#9CA3AF',
                        borderTop: 'none',
                        borderRight: 'none',
                        borderBottom: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                    }}
                    title="Owner Dispatch Approvals (Kshitij Chaubey)"
                >
                    <ShieldCheck size={22} />
                    <span style={{ fontSize: 9, fontWeight: 800, marginTop: 4, letterSpacing: 0.5 }}>APPROVALS</span>
                </button>
            </nav>

            {/* Bottom Logout */}
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={logout}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        padding: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    title="Sign Out"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
