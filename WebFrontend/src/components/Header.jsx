import React from 'react';
import { HelpCircle, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Header = ({ title = 'SEARCH' }) => {
    const { user } = useAuth();

    const initials = user?.full_name
        ? user.full_name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : 'BO';

    return (
        <header className="top-header">
            {/* Header Title matching mockup */}
            <h1 className="header-title">{title}</h1>

            {/* Right Actions matching mockup */}
            <div className="header-actions">
                <button className="icon-btn" title="Help & Support">
                    <HelpCircle size={20} />
                </button>

                <button className="icon-btn" title="Notifications">
                    <Bell size={20} />
                    <span className="notif-badge">2</span>
                </button>

                {/* Profile Avatar */}
                <div className="avatar-circle" title={user?.company_name || user?.full_name || 'Business Account'}>
                    {initials}
                </div>
            </div>
        </header>
    );
};

export default Header;
