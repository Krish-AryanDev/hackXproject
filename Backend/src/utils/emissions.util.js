/**
 * Green Logistics & Emissions Calculation Utility
 * 
 * Computes:
 * 1. Empty Kilometers Avoided: The distance cargo was consolidated into an existing return trip.
 * 2. CO2 Emissions Saved: Using standard diesel freight emission factors (~2.68 kg CO2/L, ~0.72 kg CO2/km).
 * 3. Carrier Incremental Earnings: Direct revenue earned on what would have been an empty run.
 * 4. Shipper Logistics Savings: Cost delta compared to hiring a dedicated on-demand one-way truck.
 */

// Average diesel truck parameters
const DIESEL_CO2_KG_PER_KM = 0.72; // ~2.68 kg CO2/L at ~3.7 km/L average commercial freight consumption
const STANDARD_MARKET_MARKUP_FACTOR = 1.35; // Standard one-way spot rates are typically 35% higher than return leg discounts

/**
 * Calculate Green Analytics for a fulfilled return-leg booking
 * @param {Object} params
 * @param {number} params.distanceKm - Distance of the shipment leg in km
 * @param {number} params.weightTons - Weight in tons
 * @param {number} params.priceCalculated - Agreed return-trip freight price
 * @returns {Object} Calculated metrics
 */
export const calculateGreenMetrics = ({ distanceKm, weightTons, priceCalculated }) => {
    const dist = Number(distanceKm) || 0;
    const weight = Number(weightTons) || 0;
    const price = Number(priceCalculated) || 0;

    // 1. Empty Kilometers Avoided (km that would have required a dedicated one-way dispatch)
    const emptyKmAvoided = Number(dist.toFixed(2));

    // 2. CO2 Emissions Saved (kg CO2)
    // Avoided truck trip CO2 minus marginal weight penalty (~0.015 kg CO2/ton-km)
    const baselineAvoidedCo2 = dist * DIESEL_CO2_KG_PER_KM;
    const co2KgSaved = Number(Math.max(0, baselineAvoidedCo2).toFixed(2));

    // 3. Carrier Incremental Earnings
    const carrierEarnings = Number(price.toFixed(2));

    // 4. Shipper Cost Saved
    // Comparison against standard full-truckload / dedicated market freight rate
    const standardMarketRate = price * STANDARD_MARKET_MARKUP_FACTOR;
    const shipperCostSaved = Number(Math.max(0, standardMarketRate - price).toFixed(2));

    return {
        empty_km_avoided: emptyKmAvoided,
        co2_kg_saved: co2KgSaved,
        carrier_earnings: carrierEarnings,
        shipper_cost_saved: shipperCostSaved
    };
};
