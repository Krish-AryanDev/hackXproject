import React from 'react';
import { MoreVertical } from 'lucide-react';

export const TruckCard = ({ truck, onSelect }) => {
    const getTruckEmoji = (type) => {
        if (type?.includes('mini')) return '🛻';
        if (type?.includes('container')) return '🚛';
        return '🚚';
    };

    return (
        <div className="truck-card" onClick={() => onSelect(truck)}>
            <div className="truck-card-header">
                {/* Truck Visual Box */}
                <div className="truck-image-box">
                    <span>{getTruckEmoji(truck.vehicle_type)}</span>
                </div>

                {/* Truck Info */}
                <div className="truck-info">
                    <h3 className="truck-model-title">{truck.title || `${truck.vehicle_type?.toUpperCase()} - ${truck.registration_number}`}</h3>
                    <p className="truck-status-sub">{truck.status_text || `En Route ${truck.destination_name}`}</p>
                </div>

                <button className="icon-btn" style={{ padding: 4 }} onClick={(e) => { e.stopPropagation(); onSelect(truck); }}>
                    <MoreVertical size={18} />
                </button>
            </div>

            {/* Stats Row matching mockup */}
            <div className="truck-card-stats">
                <div className="stat-item">
                    <span className="stat-label">LOAD</span>
                    <span className="stat-val">{truck.origin_name || 'Jaipur'} ➔ {truck.loaded_tons || '8'} TONS</span>
                </div>

                <div className="stat-item">
                    <span className="stat-label">AVAILABLE CAPACITY</span>
                    <span className="stat-val" style={{ color: '#059669' }}>{truck.available_capacity_tons || '3.0'} TONS</span>
                </div>

                <div className="stat-item">
                    <span className="stat-label">PRICE PER</span>
                    <span className="stat-val">₹{truck.price_per_km || '1.70'} /km/ton</span>
                </div>
            </div>

            {/* Quick Action */}
            <button className="btn-book-card" onClick={() => onSelect(truck)}>
                Check AI Safety & Book
            </button>
        </div>
    );
};

export default TruckCard;
