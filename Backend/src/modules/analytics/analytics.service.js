import { supabaseAdmin } from '../../db/db.js';
import { ApiError } from '../../utils/apiError.util.js';

/**
 * Get Platform-Wide Green Logistics & Efficiency Metrics
 */
export const getPlatformOverview = async () => {
    // 1. Aggregate green analytics
    const { data: analyticsRows, error: analyticsErr } = await supabaseAdmin
        .from('trip_analytics')
        .select('empty_km_avoided, co2_kg_saved, carrier_earnings, shipper_cost_saved');

    if (analyticsErr) {
        throw new ApiError(500, `Failed to load platform analytics: ${analyticsErr.message}`);
    }

    const totals = (analyticsRows || []).reduce((acc, row) => {
        acc.total_empty_km_avoided += Number(row.empty_km_avoided) || 0;
        acc.total_co2_kg_saved += Number(row.co2_kg_saved) || 0;
        acc.total_carrier_earnings += Number(row.carrier_earnings) || 0;
        acc.total_shipper_cost_saved += Number(row.shipper_cost_saved) || 0;
        return acc;
    }, {
        total_empty_km_avoided: 0,
        total_co2_kg_saved: 0,
        total_carrier_earnings: 0,
        total_shipper_cost_saved: 0
    });

    // 2. Count active return trips and completed bookings
    const { count: completedDeliveries } = await supabaseAdmin
        .from('shipment_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered');

    const { count: totalTrips } = await supabaseAdmin
        .from('trips')
        .select('*', { count: 'exact', head: true });

    const { count: totalVehicles } = await supabaseAdmin
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

    return {
        total_co2_kg_saved: Number(totals.total_co2_kg_saved.toFixed(2)),
        total_co2_metric_tons_saved: Number((totals.total_co2_kg_saved / 1000).toFixed(3)),
        total_empty_km_avoided: Number(totals.total_empty_km_avoided.toFixed(2)),
        total_carrier_earnings: Number(totals.total_carrier_earnings.toFixed(2)),
        total_shipper_cost_saved: Number(totals.total_shipper_cost_saved.toFixed(2)),
        completed_deliveries: completedDeliveries || 0,
        total_trips_published: totalTrips || 0,
        active_fleet_count: totalVehicles || 0,
        diesel_liters_conserved: Number((totals.total_empty_km_avoided / 3.7).toFixed(1))
    };
};

/**
 * Get Personalized Green & Financial Metrics for the Authenticated User
 */
export const getUserAnalytics = async (userId, userRole) => {
    if (userRole === 'business') {
        // Shipper analytics
        const { data: bookings, error: bErr } = await supabaseAdmin
            .from('shipment_requests')
            .select(`
                id,
                status,
                weight_tons,
                estimated_distance_km,
                price_calculated,
                trip_analytics (
                    empty_km_avoided,
                    co2_kg_saved,
                    shipper_cost_saved
                )
            `)
            .eq('business_id', userId);

        if (bErr) throw new ApiError(500, `Failed to load shipper metrics: ${bErr.message}`);

        const totalBookings = bookings.length;
        const deliveredBookings = bookings.filter(b => b.status === 'delivered');

        let totalCo2Saved = 0;
        let totalEmptyKmAvoided = 0;
        let totalShipperSavings = 0;
        let totalFreightSpend = 0;

        for (const b of bookings) {
            totalFreightSpend += Number(b.price_calculated) || 0;
            if (b.trip_analytics && b.trip_analytics.length > 0) {
                for (const a of b.trip_analytics) {
                    totalCo2Saved += Number(a.co2_kg_saved) || 0;
                    totalEmptyKmAvoided += Number(a.empty_km_avoided) || 0;
                    totalShipperSavings += Number(a.shipper_cost_saved) || 0;
                }
            }
        }

        return {
            role: 'business',
            total_shipment_requests: totalBookings,
            delivered_shipments: deliveredBookings.length,
            total_freight_spent: Number(totalFreightSpend.toFixed(2)),
            total_cost_saved: Number(totalShipperSavings.toFixed(2)),
            total_co2_kg_saved: Number(totalCo2Saved.toFixed(2)),
            total_empty_km_avoided: Number(totalEmptyKmAvoided.toFixed(2)),
            green_score: Math.min(100, Math.round(deliveredBookings.length * 20 + totalCo2Saved / 10))
        };
    } else {
        // Owner or Driver analytics
        const tripFilterField = userRole === 'driver' ? 'driver_id' : 'owner_id';

        const { data: trips, error: tErr } = await supabaseAdmin
            .from('trips')
            .select(`
                id,
                status,
                total_capacity_tons,
                available_capacity_tons,
                current_loaded_tons,
                trip_analytics (
                    empty_km_avoided,
                    co2_kg_saved,
                    carrier_earnings
                )
            `)
            .eq(tripFilterField, userId);

        if (tErr) throw new ApiError(500, `Failed to load carrier metrics: ${tErr.message}`);

        let totalEarnings = 0;
        let totalCo2Saved = 0;
        let totalEmptyKmAvoided = 0;
        let totalCapacityOffered = 0;
        let totalCapacityUtilized = 0;

        for (const t of trips || []) {
            totalCapacityOffered += Number(t.total_capacity_tons) || 0;
            totalCapacityUtilized += Number(t.current_loaded_tons) || 0;

            if (t.trip_analytics && t.trip_analytics.length > 0) {
                for (const a of t.trip_analytics) {
                    totalEarnings += Number(a.carrier_earnings) || 0;
                    totalCo2Saved += Number(a.co2_kg_saved) || 0;
                    totalEmptyKmAvoided += Number(a.empty_km_avoided) || 0;
                }
            }
        }

        const avgUtilization = totalCapacityOffered > 0
            ? Number(((totalCapacityUtilized / totalCapacityOffered) * 100).toFixed(1))
            : 0;

        return {
            role: userRole,
            total_trips_published: (trips || []).length,
            active_trips: (trips || []).filter(t => t.status === 'in_transit' || t.status === 'scheduled').length,
            completed_trips: (trips || []).filter(t => t.status === 'completed').length,
            total_incremental_earnings: Number(totalEarnings.toFixed(2)),
            total_co2_kg_saved: Number(totalCo2Saved.toFixed(2)),
            total_empty_km_avoided: Number(totalEmptyKmAvoided.toFixed(2)),
            average_load_factor_percent: avgUtilization
        };
    }
};

/**
 * Get Trip-Specific Green Analytics Breakdown
 */
export const getTripAnalytics = async (tripId) => {
    const { data: trip, error: tErr } = await supabaseAdmin
        .from('trips')
        .select(`
            id,
            origin_name,
            destination_name,
            total_capacity_tons,
            current_loaded_tons,
            status,
            trip_analytics (
                id,
                empty_km_avoided,
                co2_kg_saved,
                carrier_earnings,
                shipper_cost_saved,
                created_at,
                booking:shipment_requests(
                    id,
                    cargo_title,
                    cargo_category,
                    weight_tons,
                    pickup_address,
                    drop_address,
                    price_calculated,
                    status
                )
            )
        `)
        .eq('id', tripId)
        .single();

    if (tErr || !trip) {
        throw new ApiError(404, 'Trip not found');
    }

    const analyticsSummary = (trip.trip_analytics || []).reduce((acc, row) => {
        acc.total_co2_kg_saved += Number(row.co2_kg_saved) || 0;
        acc.total_empty_km_avoided += Number(row.empty_km_avoided) || 0;
        acc.total_trip_earnings += Number(row.carrier_earnings) || 0;
        acc.total_shipper_savings += Number(row.shipper_cost_saved) || 0;
        return acc;
    }, {
        total_co2_kg_saved: 0,
        total_empty_km_avoided: 0,
        total_trip_earnings: 0,
        total_shipper_savings: 0
    });

    return {
        trip_id: trip.id,
        origin_name: trip.origin_name,
        destination_name: trip.destination_name,
        trip_status: trip.status,
        capacity_utilization: {
            total_tons: trip.total_capacity_tons,
            loaded_tons: trip.current_loaded_tons
        },
        summary: {
            total_co2_kg_saved: Number(analyticsSummary.total_co2_kg_saved.toFixed(2)),
            total_empty_km_avoided: Number(analyticsSummary.total_empty_km_avoided.toFixed(2)),
            total_trip_earnings: Number(analyticsSummary.total_trip_earnings.toFixed(2)),
            total_shipper_savings: Number(analyticsSummary.total_shipper_savings.toFixed(2))
        },
        consolidated_shipments: trip.trip_analytics || []
    };
};
