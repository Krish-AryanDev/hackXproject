/**
 * Geospatial & Route Corridor Mathematics Utilities
 */

const EARTH_RADIUS_KM = 6371.0;

/**
 * Convert degrees to radians
 */
const toRad = (degree) => (degree * Math.PI) / 180.0;

/**
 * Convert radians to degrees
 */
const toDeg = (rad) => (rad * 180.0) / Math.PI;

/**
 * Calculate Great-Circle Distance between two lat/lng coordinates (Haversine Formula)
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} distance in kilometers
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
};

/**
 * Project a point onto a line segment (P1 -> P2) and find the closest point and distance
 * Uses equirectangular approximation for high precision and efficiency
 * @param {{lat: number, lng: number}} p - Point to test
 * @param {{lat: number, lng: number}} p1 - Segment start
 * @param {{lat: number, lng: number}} p2 - Segment end
 * @returns {{distanceKm: number, t: number, projectedPoint: {lat: number, lng: number}}}
 */
export const pointToSegmentProjection = (p, p1, p2) => {
    const latMidRad = toRad((p1.lat + p2.lat) / 2);
    const cosLat = Math.cos(latMidRad);

    // Convert to planar coordinates centered around segment (km)
    const x = toRad(p.lng - p1.lng) * cosLat * EARTH_RADIUS_KM;
    const y = toRad(p.lat - p1.lat) * EARTH_RADIUS_KM;

    const dx = toRad(p2.lng - p1.lng) * cosLat * EARTH_RADIUS_KM;
    const dy = toRad(p2.lat - p1.lat) * EARTH_RADIUS_KM;

    const segLenSq = dx * dx + dy * dy;

    let t = 0;
    if (segLenSq > 0) {
        t = (x * dx + y * dy) / segLenSq;
    }

    // Clamp t to [0, 1] for segment bounds
    const clampedT = Math.max(0, Math.min(1, t));

    // Calculate projected coordinate
    const projLat = p1.lat + clampedT * (p2.lat - p1.lat);
    const projLng = p1.lng + clampedT * (p2.lng - p1.lng);

    const distanceKm = calculateHaversineDistance(p.lat, p.lng, projLat, projLng);

    return {
        distanceKm,
        t: clampedT,
        projectedPoint: { lat: projLat, lng: projLng },
    };
};

/**
 * Project a point onto a multi-waypoint route polyline
 * @param {{lat: number, lng: number}} point
 * @param {Array<{lat: number, lng: number, name?: string}>} routePoints
 * @returns {{minDistanceKm: number, routeMilestoneKm: number, closestPoint: {lat: number, lng: number}, segmentIndex: number}}
 */
export const projectPointOnRoute = (point, routePoints) => {
    if (!routePoints || routePoints.length < 2) {
        if (routePoints && routePoints.length === 1) {
            const dist = calculateHaversineDistance(point.lat, point.lng, routePoints[0].lat, routePoints[0].lng);
            return { minDistanceKm: dist, routeMilestoneKm: 0, closestPoint: routePoints[0], segmentIndex: 0 };
        }
        return { minDistanceKm: Infinity, routeMilestoneKm: 0, closestPoint: point, segmentIndex: -1 };
    }

    let minDistanceKm = Infinity;
    let closestPoint = null;
    let bestSegmentIndex = 0;
    let cumulativeDistanceToSegmentStart = 0;
    let routeMilestoneKm = 0;

    let runningRouteDistance = 0;

    for (let i = 0; i < routePoints.length - 1; i++) {
        const p1 = routePoints[i];
        const p2 = routePoints[i + 1];
        const segDist = calculateHaversineDistance(p1.lat, p1.lng, p2.lat, p2.lng);

        const proj = pointToSegmentProjection(point, p1, p2);

        if (proj.distanceKm < minDistanceKm) {
            minDistanceKm = proj.distanceKm;
            closestPoint = proj.projectedPoint;
            bestSegmentIndex = i;
            routeMilestoneKm = runningRouteDistance + proj.t * segDist;
        }

        runningRouteDistance += segDist;
    }

    return {
        minDistanceKm,
        routeMilestoneKm,
        closestPoint,
        segmentIndex: bestSegmentIndex,
        totalRouteLengthKm: runningRouteDistance,
    };
};

/**
 * Verify if a shipper's pickup and drop coordinates match a return trip's route corridor
 * @param {{lat: number, lng: number}} pickup
 * @param {{lat: number, lng: number}} drop
 * @param {object} trip - Trip object containing origin, waypoints, destination
 * @param {number} maxDetourKm - Maximum acceptable perpendicular detour radius (default 25 km)
 * @returns {{isMatch: boolean, pickupDistanceKm: number, dropDistanceKm: number, totalDetourKm: number, pickupMilestoneKm: number, dropMilestoneKm: number, shipmentDistanceKm: number, rejectionReason?: string}}
 */
export const evaluateRouteCorridorMatch = (pickup, drop, trip, maxDetourKm = 25) => {
    // 1. Build full route polyline: Origin -> Waypoints -> Destination
    const fullRoute = [
        { lat: parseFloat(trip.origin_lat), lng: parseFloat(trip.origin_lng), name: trip.origin_name },
    ];

    if (Array.isArray(trip.route_waypoints)) {
        trip.route_waypoints.forEach((wp) => {
            if (wp.lat !== undefined && wp.lng !== undefined) {
                fullRoute.push({
                    lat: parseFloat(wp.lat),
                    lng: parseFloat(wp.lng),
                    name: wp.name || 'Waypoint',
                });
            }
        });
    }

    fullRoute.push({
        lat: parseFloat(trip.destination_lat),
        lng: parseFloat(trip.destination_lng),
        name: trip.destination_name,
    });

    // 2. Project pickup and drop onto the route
    const pickupProj = projectPointOnRoute(pickup, fullRoute);
    const dropProj = projectPointOnRoute(drop, fullRoute);

    const pickupDist = pickupProj.minDistanceKm;
    const dropDist = dropProj.minDistanceKm;
    const totalDetour = pickupDist + dropDist;

    // 3. Verify corridor buffer radius
    if (pickupDist > maxDetourKm) {
        return {
            isMatch: false,
            pickupDistanceKm: parseFloat(pickupDist.toFixed(2)),
            dropDistanceKm: parseFloat(dropDist.toFixed(2)),
            rejectionReason: `Pickup location is ${pickupDist.toFixed(1)} km away from route corridor (max allowed: ${maxDetourKm} km)`,
        };
    }

    if (dropDist > maxDetourKm) {
        return {
            isMatch: false,
            pickupDistanceKm: parseFloat(pickupDist.toFixed(2)),
            dropDistanceKm: parseFloat(dropDist.toFixed(2)),
            rejectionReason: `Drop location is ${dropDist.toFixed(1)} km away from route corridor (max allowed: ${maxDetourKm} km)`,
        };
    }

    // 4. Verify direction of travel (Pickup must occur before Drop along the return trajectory)
    if (pickupProj.routeMilestoneKm >= dropProj.routeMilestoneKm) {
        return {
            isMatch: false,
            pickupDistanceKm: parseFloat(pickupDist.toFixed(2)),
            dropDistanceKm: parseFloat(dropDist.toFixed(2)),
            rejectionReason: 'Drop location occurs before pickup along the vehicle direction of travel (Backtracking required)',
        };
    }

    const shipmentDistanceKm = dropProj.routeMilestoneKm - pickupProj.routeMilestoneKm;

    return {
        isMatch: true,
        pickupDistanceKm: parseFloat(pickupDist.toFixed(2)),
        dropDistanceKm: parseFloat(dropDist.toFixed(2)),
        totalDetourKm: parseFloat(totalDetour.toFixed(2)),
        pickupMilestoneKm: parseFloat(pickupProj.routeMilestoneKm.toFixed(2)),
        dropMilestoneKm: parseFloat(dropProj.routeMilestoneKm.toFixed(2)),
        shipmentDistanceKm: parseFloat(shipmentDistanceKm.toFixed(2)),
        totalRouteLengthKm: parseFloat(pickupProj.totalRouteLengthKm.toFixed(2)),
    };
};

export default {
    calculateHaversineDistance,
    pointToSegmentProjection,
    projectPointOnRoute,
    evaluateRouteCorridorMatch,
};
