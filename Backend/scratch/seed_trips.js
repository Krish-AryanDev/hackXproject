import { supabaseAdmin } from '../src/db/db.js';

async function getOrCreateProfile(phone, fullName, role, companyName = null) {
    let { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

    if (!profile) {
        const { data: newProfile, error } = await supabaseAdmin
            .from('profiles')
            .insert({
                phone,
                email: `${phone.replace(/[^0-9]/g, '')}@truber.com`,
                full_name: fullName,
                company_name: companyName,
                role,
                rating_avg: 4.90,
                rating_count: 25,
            })
            .select()
            .single();

        if (error) {
            console.error(`Failed to create profile for ${phone}:`, error.message);
            throw error;
        }
        return newProfile;
    }
    return profile;
}

async function getOrCreateVehicle(vehicleData) {
    let { data: vehicle } = await supabaseAdmin
        .from('vehicles')
        .select('*')
        .eq('registration_number', vehicleData.registration_number)
        .maybeSingle();

    if (!vehicle) {
        const { data: newVehicle, error } = await supabaseAdmin
            .from('vehicles')
            .insert(vehicleData)
            .select()
            .single();

        if (error) {
            console.error(`Failed to create vehicle ${vehicleData.registration_number}:`, error.message);
            throw error;
        }
        return newVehicle;
    }
    return vehicle;
}

async function seed() {
    console.log('🌱 Seeding return trips into Supabase...');

    // 1. Profiles
    const owner = await getOrCreateProfile('+919811223344', 'Kshitij Chaubey', 'owner', 'Kshitij Chaubey Transporters Pvt Ltd');
    const driver1 = await getOrCreateProfile('+919031350700', 'Krish Aryan', 'driver');
    const driver2 = await getOrCreateProfile('+919755667788', 'Rajesh Sharma', 'driver');

    console.log('✅ Profiles ready:', { owner: owner.id, driver1: driver1.id, driver2: driver2.id });

    // 2. Vehicles
    const v1 = await getOrCreateVehicle({
        owner_id: owner.id,
        assigned_driver_id: driver1.id,
        registration_number: 'RJ14-GB-9821',
        vehicle_type: 'closed_container',
        max_weight_capacity_tons: 10.0,
        model_name: 'Krish Truck (Tata Signa 4825.TK)',
    });

    const v2 = await getOrCreateVehicle({
        owner_id: owner.id,
        assigned_driver_id: driver2.id,
        registration_number: 'HR38-X-4412',
        vehicle_type: 'mini_truck',
        max_weight_capacity_tons: 3.5,
        model_name: 'Mahindra Bolero Maxi Truck',
    });

    const v3 = await getOrCreateVehicle({
        owner_id: owner.id,
        assigned_driver_id: driver1.id,
        registration_number: 'RJ14-KB-2390',
        vehicle_type: 'closed_container',
        max_weight_capacity_tons: 12.0,
        model_name: 'Tata Signa 2823.K',
    });

    const v4 = await getOrCreateVehicle({
        owner_id: owner.id,
        assigned_driver_id: driver2.id,
        registration_number: 'HR38-Z-9901',
        vehicle_type: 'open_body_truck',
        max_weight_capacity_tons: 7.5,
        model_name: 'Eicher Pro 3015',
    });

    console.log('✅ Vehicles ready:', [v1.id, v2.id, v3.id, v4.id]);

    // 3. Clear existing trips and insert fresh realistic return trips
    await supabaseAdmin.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    const tripsData = [
        {
            owner_id: owner.id,
            vehicle_id: v1.id,
            driver_id: driver1.id,
            origin_name: 'Jaipur, Rajasthan',
            origin_lat: 26.9124,
            origin_lng: 75.7873,
            destination_name: 'Delhi NCR',
            destination_lat: 28.7041,
            destination_lng: 77.1025,
            route_waypoints: [
                { name: 'Kotputli Corridor Hub', lat: 27.7011, lng: 76.1982 },
                { name: 'Behror Freight Terminal', lat: 27.8821, lng: 76.2812 },
                { name: 'Neemrana Industrial Zone', lat: 27.9892, lng: 76.3812 },
                { name: 'Gurgaon IMT Manesar', lat: 28.3512, lng: 76.9421 },
            ],
            departure_time: new Date(Date.now() + 1800000).toISOString(),
            estimated_arrival_time: new Date(Date.now() + 18000000).toISOString(),
            total_capacity_tons: 10.0,
            current_loaded_tons: 8.0,
            available_capacity_tons: 2.0,
            existing_cargo_category: 'dry_packaged_fmcg',
            existing_cargo_description: '8.0 tons of sealed cardboard packaged dry wheat biscuits & grocery',
            base_price_per_km_ton: 1.70,
            status: 'scheduled',
        },
        {
            owner_id: owner.id,
            vehicle_id: v2.id,
            driver_id: driver2.id,
            origin_name: 'Jaipur, Rajasthan',
            origin_lat: 26.9124,
            origin_lng: 75.7873,
            destination_name: 'Delhi NCR',
            destination_lat: 28.7041,
            destination_lng: 77.1025,
            route_waypoints: [
                { name: 'Shahpura Toll', lat: 27.3892, lng: 75.9612 },
            ],
            departure_time: new Date(Date.now() + 3600000).toISOString(),
            estimated_arrival_time: new Date(Date.now() + 21600000).toISOString(),
            total_capacity_tons: 3.5,
            current_loaded_tons: 1.0,
            available_capacity_tons: 2.5,
            existing_cargo_category: 'packaged_consumer_goods',
            existing_cargo_description: '1 ton of lightweight plastic boxes',
            base_price_per_km_ton: 1.75,
            status: 'scheduled',
        },
        {
            owner_id: owner.id,
            vehicle_id: v3.id,
            driver_id: driver1.id,
            origin_name: 'Jaipur, Rajasthan',
            origin_lat: 26.9124,
            origin_lng: 75.7873,
            destination_name: 'Delhi NCR',
            destination_lat: 28.7041,
            destination_lng: 77.1025,
            route_waypoints: [],
            departure_time: new Date(Date.now() + 7200000).toISOString(),
            estimated_arrival_time: new Date(Date.now() + 25200000).toISOString(),
            total_capacity_tons: 12.0,
            current_loaded_tons: 8.0,
            available_capacity_tons: 4.0,
            existing_cargo_category: 'dry_packaged_goods',
            existing_cargo_description: 'Cartons of packaged tea bags',
            base_price_per_km_ton: 1.70,
            status: 'scheduled',
        },
        {
            owner_id: owner.id,
            vehicle_id: v4.id,
            driver_id: driver2.id,
            origin_name: 'Jaipur, Rajasthan',
            origin_lat: 26.9124,
            origin_lng: 75.7873,
            destination_name: 'Delhi NCR',
            destination_lat: 28.7041,
            destination_lng: 77.1025,
            route_waypoints: [],
            departure_time: new Date(Date.now() + 10800000).toISOString(),
            estimated_arrival_time: new Date(Date.now() + 28800000).toISOString(),
            total_capacity_tons: 7.5,
            current_loaded_tons: 0.0,
            available_capacity_tons: 7.5,
            existing_cargo_category: 'empty',
            existing_cargo_description: 'Completely empty open body truck',
            base_price_per_km_ton: 1.75,
            status: 'scheduled',
        },
    ];

    const { data: insertedTrips, error: tripsErr } = await supabaseAdmin
        .from('trips')
        .insert(tripsData)
        .select();

    if (tripsErr) {
        console.error('Failed to insert trips:', tripsErr.message);
    } else {
        console.log(`✅ Successfully seeded ${insertedTrips.length} live return trips in Supabase!`);
    }
}

seed().then(() => process.exit(0)).catch(console.error);
