-- =============================================================================
-- Community Logistics Exchange for Empty Return Trips (PS #7)
-- Complete Database Schema (PostgreSQL / Supabase DDL)
-- 100% Idempotent, Safe to Run & Re-run in Supabase SQL Editor
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS & CUSTOM TYPES
-- =============================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('owner', 'driver', 'business', 'admin');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_status') THEN
        CREATE TYPE trip_status AS ENUM ('scheduled', 'active', 'completed', 'cancelled');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'pending_ai',
            'pending_owner_approval',
            'approved',
            'driver_dispatched',
            'in_transit',
            'delivered',
            'rejected',
            'cancelled'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_type_enum') THEN
        CREATE TYPE vehicle_type_enum AS ENUM (
            'closed_container',
            'open_body_truck',
            'flatbed',
            'refrigerated',
            'tanker',
            'mini_truck',
            'other'
        );
    END IF;
END $$;

-- =============================================================================
-- 2. HELPER FUNCTIONS FOR AUTOMATIC TIMESTAMPS & CAPACITY CALCULATION
-- =============================================================================

-- Timestamp update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-calculate available capacity and safeguard consistency
CREATE OR REPLACE FUNCTION compute_trip_available_capacity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_loaded_tons IS NULL THEN
        NEW.current_loaded_tons := 0.00;
    END IF;
    NEW.available_capacity_tons := NEW.total_capacity_tons - NEW.current_loaded_tons;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. PROFILES / USERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    full_name VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'business',
    company_name VARCHAR(255),
    gst_number VARCHAR(50),
    profile_photo_url TEXT,
    rating_avg NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating_avg >= 0.00 AND rating_avg <= 5.00),
    rating_count INT DEFAULT 0 CHECK (rating_count >= 0),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON profiles;
CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 4. VEHICLES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type vehicle_type_enum NOT NULL DEFAULT 'closed_container',
    max_weight_capacity_tons NUMERIC(6, 2) NOT NULL CHECK (max_weight_capacity_tons > 0),
    max_volume_capacity_cft NUMERIC(8, 2) CHECK (max_volume_capacity_cft > 0),
    model_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_vehicles_updated_at ON vehicles;
CREATE TRIGGER set_vehicles_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. TRIPS (Return Legs & Route Corridors)
-- =============================================================================

CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Origin & Destination
    origin_name VARCHAR(255) NOT NULL,
    origin_lat NUMERIC(10, 7) NOT NULL,
    origin_lng NUMERIC(10, 7) NOT NULL,
    destination_name VARCHAR(255) NOT NULL,
    destination_lat NUMERIC(10, 7) NOT NULL,
    destination_lng NUMERIC(10, 7) NOT NULL,
    
    -- Waypoints Corridor: JSON array of [{ name, lat, lng, eta }]
    route_waypoints JSONB DEFAULT '[]'::jsonb,
    
    -- Timings
    departure_time TIMESTAMPTZ NOT NULL,
    estimated_arrival_time TIMESTAMPTZ NOT NULL,
    actual_departure_time TIMESTAMPTZ,
    actual_arrival_time TIMESTAMPTZ,
    
    -- Capacities
    total_capacity_tons NUMERIC(6, 2) NOT NULL,
    current_loaded_tons NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    available_capacity_tons NUMERIC(6, 2) NOT NULL,
    
    -- Baseline cargo in the truck for Groq AI compatibility checks
    existing_cargo_category VARCHAR(100),
    existing_cargo_description TEXT,
    
    -- Pricing & Status
    base_price_per_km_ton NUMERIC(8, 2) DEFAULT 5.00,
    status trip_status NOT NULL DEFAULT 'scheduled',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT chk_trip_capacity CHECK (
        current_loaded_tons <= total_capacity_tons AND
        available_capacity_tons >= 0
    )
);

DROP TRIGGER IF EXISTS set_trips_updated_at ON trips;
CREATE TRIGGER set_trips_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_trips_capacity_calc ON trips;
CREATE TRIGGER set_trips_capacity_calc
BEFORE INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION compute_trip_available_capacity();

-- =============================================================================
-- 6. SHIPMENT REQUESTS & BOOKINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS shipment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    
    -- Cargo Specifications
    cargo_title VARCHAR(255) NOT NULL,
    cargo_category VARCHAR(100) NOT NULL,
    cargo_description TEXT,
    weight_tons NUMERIC(6, 2) NOT NULL CHECK (weight_tons > 0),
    volume_cft NUMERIC(8, 2),
    
    -- Pickup & Drop Details
    pickup_address TEXT NOT NULL,
    pickup_lat NUMERIC(10, 7) NOT NULL,
    pickup_lng NUMERIC(10, 7) NOT NULL,
    pickup_deadline TIMESTAMPTZ,
    
    drop_address TEXT NOT NULL,
    drop_lat NUMERIC(10, 7) NOT NULL,
    drop_lng NUMERIC(10, 7) NOT NULL,
    drop_deadline TIMESTAMPTZ,
    
    -- Calculated Distance & Pricing
    estimated_distance_km NUMERIC(8, 2),
    price_calculated NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- AI Cargo Compatibility Analysis (Groq LLM Engine)
    ai_compatibility_score INT CHECK (ai_compatibility_score >= 0 AND ai_compatibility_score <= 100),
    ai_compatibility_verdict VARCHAR(50), -- e.g., 'SAFE', 'RESTRICTED', 'HAZARDOUS'
    ai_compatibility_reason TEXT,
    ai_handling_instructions TEXT,
    ai_evaluated_at TIMESTAMPTZ,
    
    -- Lifecycle & Approval State
    status booking_status NOT NULL DEFAULT 'pending_ai',
    owner_rejection_reason TEXT,
    
    -- Proof of Delivery (POD)
    pod_otp VARCHAR(6),
    pod_completed_at TIMESTAMPTZ,
    pod_signature_url TEXT,
    pod_photo_url TEXT,
    pod_receiver_name VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_shipment_requests_updated_at ON shipment_requests;
CREATE TRIGGER set_shipment_requests_updated_at
BEFORE UPDATE ON shipment_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 7. TRIP ANALYTICS (Green Logistics & Efficiency Metrics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS trip_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES shipment_requests(id) ON DELETE CASCADE,
    
    empty_km_avoided NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    co2_kg_saved NUMERIC(8, 2) NOT NULL DEFAULT 0.00, -- Diesel factor (~2.68 kg CO2 / liter)
    carrier_earnings NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    shipper_cost_saved NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. REVIEWS & RATINGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES shipment_requests(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_booking_review UNIQUE (booking_id, reviewer_id, reviewee_id)
);

-- =============================================================================
-- 9. PERFORMANCE & GEOSPATIAL INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_vehicles_owner ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_departure ON trips(departure_time);
CREATE INDEX IF NOT EXISTS idx_trips_available_capacity ON trips(available_capacity_tons);
CREATE INDEX IF NOT EXISTS idx_trips_origin_coords ON trips(origin_lat, origin_lng);
CREATE INDEX IF NOT EXISTS idx_trips_dest_coords ON trips(destination_lat, destination_lng);
CREATE INDEX IF NOT EXISTS idx_shipments_business ON shipment_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_shipments_trip ON shipment_requests(trip_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipment_requests(status);
CREATE INDEX IF NOT EXISTS idx_shipments_pickup_coords ON shipment_requests(pickup_lat, pickup_lng);
CREATE INDEX IF NOT EXISTS idx_shipments_drop_coords ON shipment_requests(drop_lat, drop_lng);
CREATE INDEX IF NOT EXISTS idx_analytics_trip ON trip_analytics(trip_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- =============================================================================
-- 10. ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow service read/write') THEN
        CREATE POLICY "Allow service read/write" ON profiles FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Allow service read/write') THEN
        CREATE POLICY "Allow service read/write" ON vehicles FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trips' AND policyname = 'Allow service read/write') THEN
        CREATE POLICY "Allow service read/write" ON trips FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shipment_requests' AND policyname = 'Allow service read/write') THEN
        CREATE POLICY "Allow service read/write" ON shipment_requests FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_analytics' AND policyname = 'Allow service read/write') THEN
        CREATE POLICY "Allow service read/write" ON trip_analytics FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Allow service read/write') THEN
        CREATE POLICY "Allow service read/write" ON reviews FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
