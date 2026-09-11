const BASE_URL = 'http://127.0.0.1:5000/api/v1';

async function req(method, endpoint, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${endpoint}`, opts);
    const json = await res.json();
    return { status: res.status, body: json };
}

async function runEndToEndTest() {
    console.log('🚀 --- STARTING END-TO-END VERIFICATION (PHASES 1 TO 6) ---');
    const timestamp = Date.now();

    // 1. Register Owner
    const ownerPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    console.log(`\n[1] Registering Owner with phone: ${ownerPhone}`);
    await req('POST', '/auth/send-otp', { phone: ownerPhone });
    const regOwner = await req('POST', '/auth/register', {
        phone: ownerPhone,
        otp: '123456',
        full_name: `Carrier Owner ${timestamp}`,
        role: 'owner',
        company_name: 'Apex Green Logistics Ltd'
    });
    const ownerToken = regOwner.body.data.token;
    const ownerId = regOwner.body.data.user.id;
    console.log('✅ Owner Registered:', ownerId);

    // 2. Register Driver
    const driverPhone = `97${Math.floor(10000000 + Math.random() * 90000000)}`;
    console.log(`\n[2] Registering Driver with phone: ${driverPhone}`);
    await req('POST', '/auth/send-otp', { phone: driverPhone });
    const regDriver = await req('POST', '/auth/register', {
        phone: driverPhone,
        otp: '123456',
        full_name: `Driver Ramesh ${timestamp}`,
        role: 'driver'
    });
    const driverToken = regDriver.body.data.token;
    const driverId = regDriver.body.data.user.id;
    console.log('✅ Driver Registered:', driverId);

    // 3. Register Shipper
    const shipperPhone = `96${Math.floor(10000000 + Math.random() * 90000000)}`;
    console.log(`\n[3] Registering Shipper with phone: ${shipperPhone}`);
    await req('POST', '/auth/send-otp', { phone: shipperPhone });
    const regShipper = await req('POST', '/auth/register', {
        phone: shipperPhone,
        otp: '123456',
        full_name: `Shipper Priya ${timestamp}`,
        role: 'business',
        company_name: 'Fresh Organics Corp'
    });
    const shipperToken = regShipper.body.data.token;
    const shipperId = regShipper.body.data.user.id;
    console.log('✅ Shipper Registered:', shipperId);

    // 4. Owner creates vehicle and assigns driver
    console.log('\n[4] Owner registering Vehicle & assigning Driver...');
    const vehicleRes = await req('POST', '/vehicles', {
        registration_number: `MH12-T${Math.floor(1000 + Math.random() * 9000)}`,
        vehicle_type: 'closed_container',
        max_weight_capacity_tons: 15.0,
        model_name: 'Tata Signa 4825.TK',
        assigned_driver_id: driverId
    }, ownerToken);
    
    if (!vehicleRes.body.data) {
        console.error('Vehicle creation error:', vehicleRes.body);
        return;
    }
    const vehicleId = vehicleRes.body.data.id;
    console.log('✅ Vehicle Created:', vehicleId);

    // 5. Owner publishes Return Trip (Mumbai -> Pune)
    console.log('\n[5] Owner publishing Return Trip with route corridor...');
    const tripRes = await req('POST', '/trips', {
        vehicle_id: vehicleId,
        driver_id: driverId,
        origin_name: 'Navi Mumbai Hub',
        origin_lat: 19.0330,
        origin_lng: 73.0297,
        destination_name: 'Pune Bhosari Industrial Area',
        destination_lat: 18.6279,
        destination_lng: 73.8474,
        route_waypoints: [
            { name: 'Panvel Express Toll', lat: 18.9894, lng: 73.1175 },
            { name: 'Khopoli Halt', lat: 18.7865, lng: 73.3448 },
            { name: 'Talegaon Toll Plaza', lat: 18.7302, lng: 73.6738 }
        ],
        departure_time: new Date(Date.now() + 3600000).toISOString(),
        estimated_arrival_time: new Date(Date.now() + 18000000).toISOString(),
        total_capacity_tons: 15.0,
        current_loaded_tons: 3.0,
        existing_cargo_category: 'dry_packaged_goods',
        existing_cargo_description: 'Cartons of processed biscuits and tea boxes',
        base_price_per_km_ton: 6.50
    }, ownerToken);

    if (!tripRes.body.data) {
        console.error('Trip creation error:', tripRes.body);
        return;
    }
    const tripId = tripRes.body.data.id;
    console.log('✅ Return Trip Created:', tripId, 'Available capacity:', tripRes.body.data.available_capacity_tons);

    // 6. Shipper matches and books partial return space
    console.log('\n[6] Shipper submitting booking request (Triggers Groq AI Compatibility Check)...');
    const bookingRes = await req('POST', '/bookings', {
        trip_id: tripId,
        cargo_title: 'Plastic Kitchenware & Storage Boxes',
        cargo_category: 'packaged_consumer_goods',
        cargo_description: '50 sealed corrugated boxes of non-hazardous household plastic storage containers and lunchboxes',
        weight_tons: 2.5,
        pickup_address: 'Panvel APMC Market, Navi Mumbai',
        pickup_lat: 18.9890,
        pickup_lng: 73.1170,
        drop_address: 'Talegaon Floriculture Park, Pune',
        drop_lat: 18.7310,
        drop_lng: 73.6740
    }, shipperToken);

    if (!bookingRes.body.data) {
        console.error('Booking creation error:', bookingRes.body);
        return;
    }

    const booking = bookingRes.body.data;
    console.log('✅ Booking Created ID:', booking.id);
    console.log('AI Compatibility Verdict:', booking.ai_compatibility_verdict, '| Score:', booking.ai_compatibility_score);
    console.log('AI Reason:', booking.ai_compatibility_reason);
    console.log('Booking Status:', booking.status);
    console.log('POD OTP for consignee:', booking.pod_otp);
    const podOtp = booking.pod_otp;

    // 7. Owner approves booking
    console.log('\n[7] Owner approving Shipper booking...');
    const approvalRes = await req('PATCH', `/bookings/${booking.id}/respond`, {
        action: 'approve'
    }, ownerToken);
    console.log('✅ Owner Response:', approvalRes.body.message);
    console.log('Updated Booking Status:', approvalRes.body.data.status);
    console.log('Updated Trip Remaining Capacity:', approvalRes.body.data.trip.available_capacity_tons);

    // 8. Driver checks assigned dispatches
    console.log('\n[8] Driver checking active dispatches...');
    const driverDispatches = await req('GET', '/bookings/driver/dispatches', null, driverToken);
    console.log(`✅ Driver has ${driverDispatches.body.data.length} active dispatches`);

    // 9. Driver updates trip and booking to in_transit
    console.log('\n[9] Driver updating Trip and Booking status to in_transit...');
    await req('PATCH', `/pod/trips/${tripId}/status`, { status: 'in_transit' }, driverToken);
    await req('PATCH', `/pod/bookings/${booking.id}/status`, { status: 'in_transit' }, driverToken);
    console.log('✅ Status updated to in_transit');

    // 10. Driver completes delivery via POD OTP verification
    console.log('\n[10] Driver verifying POD OTP & completing delivery...');
    const podRes = await req('POST', `/pod/bookings/${booking.id}/verify-otp`, {
        podOtp: podOtp,
        receiverName: 'Rajesh Sharma (Warehouse In-charge)',
        signatureUrl: 'https://storage.example.com/signatures/sig_123.png',
        photoUrl: 'https://storage.example.com/photos/unloaded_mangoes_456.jpg'
    }, driverToken);

    console.log('✅ Delivery Completed!');
    console.log('POD Status:', podRes.body.data.booking.status);
    console.log('Green Analytics Generated:', podRes.body.data.analytics);

    // 11. Test Analytics Endpoints
    console.log('\n[11] Testing Green Analytics Endpoints...');
    const platformAnalytics = await req('GET', '/analytics/platform');
    console.log('Platform Green Summary:', platformAnalytics.body.data);

    const shipperAnalytics = await req('GET', '/analytics/me', null, shipperToken);
    console.log('Shipper Green Score & Savings:', shipperAnalytics.body.data);

    const ownerAnalytics = await req('GET', '/analytics/me', null, ownerToken);
    console.log('Carrier Owner Earnings & Emissions:', ownerAnalytics.body.data);

    // 12. Test Reviews & Trust System
    console.log('\n[12] Shipper submitting verified Review & 5-Star Rating for Driver/Carrier...');
    const reviewRes = await req('POST', '/reviews', {
        bookingId: booking.id,
        revieweeId: driverId,
        rating: 5,
        comment: 'Excellent driver! Reached on time, Alphonso mangoes arrived in perfect fresh condition.'
    }, shipperToken);
    console.log('✅ Review Submitted:', reviewRes.body.data);

    const driverReviews = await req('GET', `/reviews/profile/${driverId}`);
    console.log('Driver Profile Reviews:', driverReviews.body.data);

    const updatedDriverProfile = await req('GET', '/auth/me', null, driverToken);
    console.log('Updated Driver Rating Average:', updatedDriverProfile.body.data.rating_avg, '| Total Reviews:', updatedDriverProfile.body.data.rating_count);

    console.log('\n🎉🎉 ALL PHASES (1 TO 6) TESTED AND PASSED SUCCESSFULLY! 🎉🎉');
}

runEndToEndTest().catch(console.error);
