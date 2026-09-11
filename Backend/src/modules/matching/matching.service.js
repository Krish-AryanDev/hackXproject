import { supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';
import { evaluateRouteCorridorMatch, calculateHaversineDistance } from '../../utils/distance.util.js';
import { evaluateCargoCompatibility } from './aiCompatibility.service.js';

/**
 * Search and match available return trucks for a shipper's request
 */
export const searchMatchingTrips = async (criteria) => {
    const {
        pickup_lat,
        pickup_lng,
        drop_lat,
        drop_lng,
        weight_tons,
        volume_cft,
        cargo_category = 'General Goods',
        cargo_description = '',
        max_detour_km = 25,
        pickup_date,
    } = criteria;

    if (pickup_lat === undefined || pickup_lng === undefined) {
        throw ApiError.badRequest('Valid pickup coordinates (pickup_lat, pickup_lng) are required');
    }
    if (drop_lat === undefined || drop_lng === undefined) {
        throw ApiError.badRequest('Valid drop coordinates (drop_lat, drop_lng) are required');
    }
    if (!weight_tons || parseFloat(weight_tons) <= 0) {
        throw ApiError.badRequest('A positive shipment weight in tons is required');
    }

    const requiredWeight = parseFloat(weight_tons);
    const pickupCoords = { lat: parseFloat(pickup_lat), lng: parseFloat(pickup_lng) };
    const dropCoords = { lat: parseFloat(drop_lat), lng: parseFloat(drop_lng) };
    const maxDetour = parseFloat(max_detour_km) || 25;

    // 1. Direct straight-line distance for reference
    const directDistanceKm = calculateHaversineDistance(
        pickupCoords.lat,
        pickupCoords.lng,
        dropCoords.lat,
        dropCoords.lng
    );

    // 2. Fetch active/scheduled candidate trips with sufficient available capacity
    let tripQuery = supabaseAdmin
        .from('trips')
        .select(`
            *,
            vehicle:vehicles(id, registration_number, vehicle_type, model_name, max_weight_capacity_tons, max_volume_capacity_cft),
            driver:profiles!trips_driver_id_fkey(id, full_name, phone, rating_avg, rating_count),
            owner:profiles!trips_owner_id_fkey(id, full_name, phone, company_name, rating_avg)
        `)
        .eq('status', 'scheduled')
        .gte('available_capacity_tons', requiredWeight);

    if (pickup_date) {
        // Match trips on or after specified date
        tripQuery = tripQuery.gte('departure_time', new Date(pickup_date).toISOString());
    }

    const { data: candidateTrips, error } = await tripQuery;

    if (error) {
        throw ApiError.internal(`Failed to query candidate return trips: ${error.message}`);
    }

    if (!candidateTrips || candidateTrips.length === 0) {
        return {
            matches_found: 0,
            direct_distance_km: parseFloat(directDistanceKm.toFixed(2)),
            trips: [],
        };
    }

    const matchedResults = [];

    // 3. Evaluate each candidate trip
    for (const trip of candidateTrips) {
        // A. Geospatial Route Corridor Match
        const corridorResult = evaluateRouteCorridorMatch(pickupCoords, dropCoords, trip, maxDetour);

        if (!corridorResult.isMatch) {
            continue; // Skip trip outside the corridor or wrong direction
        }

        // B. AI Cargo Compatibility Evaluation
        const existingCargo = {
            category: trip.existing_cargo_category,
            description: trip.existing_cargo_description,
        };
        const newCargo = {
            category: cargo_category,
            description: cargo_description,
            weight_tons: requiredWeight,
        };

        const aiCompatibility = await evaluateCargoCompatibility(existingCargo, newCargo);

        // C. Transparent Partial-Load Pricing Calculation
        const shipmentDistance = corridorResult.shipmentDistanceKm || directDistanceKm;
        const baseRate = parseFloat(trip.base_price_per_km_ton || 5.0);
        // Shared Return load discount (15% platform saving for empty return monetization)
        const discountFactor = 0.85;
        const calculatedPrice = Math.round(shipmentDistance * requiredWeight * baseRate * discountFactor);

        // D. Match Quality Ranking Score
        // Score = AI Compatibility (50%) + Detour Proximity (30%) + Capacity Fit (20%)
        const detourPenalty = Math.min(30, (corridorResult.totalDetourKm / maxDetour) * 30);
        const matchRankScore = Math.round(
            (aiCompatibility.compatibility_score * 0.5) + (30 - detourPenalty) + (20)
        );

        matchedResults.push({
            trip_id: trip.id,
            match_rank_score: matchRankScore,
            vehicle: trip.vehicle,
            driver: trip.driver,
            owner: trip.owner,
            route: {
                origin_name: trip.origin_name,
                destination_name: trip.destination_name,
                departure_time: trip.departure_time,
                estimated_arrival_time: trip.estimated_arrival_time,
                route_waypoints: trip.route_waypoints,
            },
            capacity: {
                total_capacity_tons: trip.total_capacity_tons,
                current_loaded_tons: trip.current_loaded_tons,
                available_capacity_tons: trip.available_capacity_tons,
                requested_weight_tons: requiredWeight,
                remaining_after_booking: parseFloat((trip.available_capacity_tons - requiredWeight).toFixed(2)),
            },
            corridor_metrics: {
                pickup_distance_km: corridorResult.pickupDistanceKm,
                drop_distance_km: corridorResult.dropDistanceKm,
                total_detour_km: corridorResult.totalDetourKm,
                shipment_distance_km: corridorResult.shipmentDistanceKm,
            },
            pricing: {
                base_price_per_km_ton: baseRate,
                discount_percentage: 15,
                estimated_total_price: calculatedPrice,
                currency: 'INR',
            },
            ai_compatibility: aiCompatibility,
        });
    }

    // 4. Sort results by match rank score (highest first) and AI safety
    matchedResults.sort((a, b) => {
        if (a.ai_compatibility.is_compatible !== b.ai_compatibility.is_compatible) {
            return a.ai_compatibility.is_compatible ? -1 : 1;
        }
        return b.match_rank_score - a.match_rank_score;
    });

    return {
        matches_found: matchedResults.length,
        direct_distance_km: parseFloat(directDistanceKm.toFixed(2)),
        trips: matchedResults,
    };
};

/**
 * Direct Standalone AI Cargo Compatibility Checker
 */
export const checkDirectCompatibility = async (existingCargo, newCargo) => {
    if (!existingCargo || !newCargo) {
        throw ApiError.badRequest('Both existingCargo and newCargo objects are required');
    }
    return await evaluateCargoCompatibility(existingCargo, newCargo);
};

export default {
    searchMatchingTrips,
    checkDirectCompatibility,
};
