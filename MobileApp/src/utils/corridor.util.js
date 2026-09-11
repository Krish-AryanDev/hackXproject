/**
 * Haversine & Route Corridor Mathematics for Driver Navigation
 */

const EARTH_RADIUS_KM = 6371.0;

const toRad = (deg) => (deg * Math.PI) / 180.0;

/**
 * Calculate Great-Circle Haversine distance in km
 */
export const calculateHaversine = (lat1, lon1, lat2, lon2) => {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const rLat1 = toRad(lat1);
    const rLat2 = toRad(lat2);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
};

/**
 * Major Logistics Cities & Highway Hubs Database
 */
export const LOGISTICS_HUBS = [
    { name: 'Delhi NCR', lat: 28.7041, lng: 77.1025, hubType: 'Major Freight Terminal', highway: 'NH48 / Yamuna Exp' },
    { name: 'Jaipur', lat: 26.9124, lng: 75.7873, hubType: 'North Corridor Hub', highway: 'NH48' },
    { name: 'Lucknow', lat: 26.8467, lng: 80.9462, hubType: 'East Expressway Hub', highway: 'Agra-Lucknow Exp' },
    { name: 'Agra', lat: 27.1767, lng: 78.0081, hubType: 'Industrial Interchange', highway: 'Yamuna & Agra Exp' },
    { name: 'Mathura', lat: 27.4924, lng: 77.6737, hubType: 'Highway Toll Point', highway: 'NH19' },
    { name: 'Gurgaon (Manesar)', lat: 28.3512, lng: 76.9421, hubType: 'Auto Logistics Zone', highway: 'NH48' },
    { name: 'Kanpur', lat: 26.4499, lng: 80.3319, hubType: 'Commercial Goods Depot', highway: 'NH19' },
    { name: 'Gwalior', lat: 26.2183, lng: 78.1828, hubType: 'Central Transit Hub', highway: 'NH44' },
    { name: 'Aligarh', lat: 27.8974, lng: 78.0880, hubType: 'Hardware Freight Hub', highway: 'GT Road' },
    { name: 'Kotputli', lat: 27.7011, lng: 76.1982, hubType: 'Highway Checkpoint', highway: 'NH48' },
    { name: 'Bharatpur', lat: 27.2152, lng: 77.4930, hubType: 'State Border Depot', highway: 'NH21' },
    { name: 'Chandigarh', lat: 30.7333, lng: 76.7794, hubType: 'North Highway Junction', highway: 'NH44' },
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, hubType: 'Western Corridor Hub', highway: 'NE1' },
    { name: 'Vadodara', lat: 22.3072, lng: 73.1812, hubType: 'Chemical Freight Corridor', highway: 'NE1' },
    { name: 'Surat', lat: 21.1702, lng: 72.8311, hubType: 'Textile Depot', highway: 'NH48' },
    { name: 'Mumbai (Navi Mumbai)', lat: 19.0330, lng: 73.0297, hubType: 'Port & Terminal Hub', highway: 'JNPT Corridor' },
    { name: 'Pune', lat: 18.5204, lng: 73.8567, hubType: 'Industrial MIDC Hub', highway: 'Mumbai-Pune Exp' },
    { name: 'Varanasi', lat: 25.3176, lng: 82.9739, hubType: 'Eastern Cargo Depot', highway: 'NH19' },
    { name: 'Prayagraj', lat: 25.4358, lng: 81.8463, hubType: 'River Corridor Junction', highway: 'NH19' },
    { name: 'Indore', lat: 22.7196, lng: 75.8577, hubType: 'Commercial MP Hub', highway: 'NH52' },
    { name: 'Bhopal', lat: 23.2599, lng: 77.4126, hubType: 'Central Logistics Base', highway: 'NH46' },
];

/**
 * Discovers Points of Load (Corridor Waypoints) between Driver Location & Destination using Haversine
 * Supports transit junctions like Delhi between Jaipur and Lucknow
 * @param {{lat: number, lng: number}} origin 
 * @param {{lat: number, lng: number}} destination 
 * @param {number} maxDetourKm - Optional custom detour threshold in km
 * @returns {Object} List of identified load points ordered along the route with direct distance
 */
export const findPointsOfLoadAlongCorridor = (origin, destination, maxDetourKm = null) => {
    const directDistance = calculateHaversine(origin.lat, origin.lng, destination.lat, destination.lng);
    if (directDistance < 10) return { directDistanceKm: Math.round(directDistance), pointsOfLoad: [] };

    // Adaptive detour tolerance: allows up to 35% corridor deviation or minimum 140km for national freight
    const allowedDetour = maxDetourKm || Math.max(140, directDistance * 0.32);

    const loadPoints = [];

    for (const hub of LOGISTICS_HUBS) {
        const distFromOrigin = calculateHaversine(origin.lat, origin.lng, hub.lat, hub.lng);
        const distToDest = calculateHaversine(hub.lat, hub.lng, destination.lat, destination.lng);

        // Ignore if the hub is the origin or destination itself (within 20km)
        if (distFromOrigin < 20 || distToDest < 20) continue;

        const totalCorridorDist = distFromOrigin + distToDest;
        const detour = totalCorridorDist - directDistance;

        // Condition: Must be along the economic highway corridor and closer to dest than start + detour
        if (detour <= allowedDetour && distFromOrigin < directDistance * 1.15) {
            const progressRatio = distFromOrigin / (distFromOrigin + distToDest);

            loadPoints.push({
                ...hub,
                distFromOriginKm: Math.round(distFromOrigin),
                distToDestKm: Math.round(distToDest),
                detourKm: Number(detour.toFixed(1)),
                progressRatio,
                etaMins: Math.round((distFromOrigin / 50) * 60), // Commercial truck avg 50 km/h speed
                estimatedEarnings: `₹${Math.round(distFromOrigin * 1.8 * 8).toLocaleString('en-IN')}`,
            });
        }
    }

    // Sort waypoints sequentially along travel direction
    loadPoints.sort((a, b) => a.distFromOriginKm - b.distFromOriginKm);

    return {
        directDistanceKm: Math.round(directDistance),
        pointsOfLoad: loadPoints,
    };
};
