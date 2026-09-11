# Community Logistics Exchange Backend API

High-performance Express.js & Supabase (PostgreSQL) backend for **PS #7: Community Logistics Exchange for Empty Return Trips**.

---

## 🌟 Overview & Capabilities

- **In-House Phone OTP Authentication**: Passwordless phone number + one-time 6-digit OTP verification (logged to terminal during development, 100% free) + mandatory 7-day signed JWT tokens.
- **Role-Based Access Control (RBAC)**: Fine-grained authorization for `owner` (vehicle transporters), `driver` (truck drivers), `business` (cargo shippers), and `admin`.
- **Fleet & Vehicle Registry**: Multi-vehicle registry with capacity constraints (weight in tons, volume in CFT), vehicle types, and driver assignments.
- **Dynamic Return Trip Publishing**: Transporters publish return legs with origin, destination, corridor waypoints JSON, and loaded vs. available capacities auto-computed by PostgreSQL triggers.
- **AI Cargo Compatibility Engine**: Evaluates co-loading safety (chemical cross-reactions, aroma contamination, moisture, temperature mismatch) in real-time using Groq LLM (`openai/gpt-oss-120b`) with a local heuristic fallback.
- **Two-Tier Approval & Driver Dispatch Workflow**: Shippers book partial return space $\rightarrow$ AI safety validation $\rightarrow$ Owner reviews and approves/rejects $\rightarrow$ Instant driver dispatch with navigation waypoints and AI handling instructions.
- **Digital Proof of Delivery (POD)**: Consignee/receiver verifies cargo handover using a secure 6-digit POD OTP + optional receiver signature and photo URL.
- **Green Logistics & Economic Analytics**: Automatically computes **empty kilometers avoided**, **$\text{CO}_2$ emissions saved** (diesel conversion factor), carrier incremental revenue, and shipper logistics savings.
- **Dual-Sided Verified Reviews & Ratings**: Post-delivery rating (1–5 stars) and review system that continuously recalibrates carrier and driver credibility ratings on `profiles`.

---

## 🏗️ Project Architecture

```text
Backend/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── server.js
├── README.md
└── src/
    ├── app.js
    ├── config/
    │   └── env.js                     # Strongly typed environment configuration
    ├── db/
    │   ├── db.js                      # Supabase client wrapper & connectivity checker
    │   └── schema.sql                 # Complete PostgreSQL DDL (enums, tables, triggers, indexes)
    ├── middlewares/
    │   ├── auth.middleware.js         # Mandatory Bearer JWT verification & RBAC permissions
    │   ├── error.middleware.js        # Global error handler
    │   └── notFound.middleware.js     # Standardized 404 handler
    ├── modules/
    │   ├── index.js                   # Main API Router (/api/v1)
    │   ├── auth/                      # Phone OTP Auth & Profile Management
    │   │   ├── auth.service.js
    │   │   ├── auth.controller.js
    │   │   └── auth.routes.js
    │   ├── vehicles/                  # Fleet & Driver Assignment
    │   │   ├── vehicle.service.js
    │   │   ├── vehicle.controller.js
    │   │   └── vehicle.routes.js
    │   ├── trips/                     # Return Leg & Corridor Publishing
    │   │   ├── trip.service.js
    │   │   ├── trip.controller.js
    │   │   └── trip.routes.js
    │   ├── matching/                  # Groq AI Cargo Safety & Corridor Matcher
    │   │   ├── aiCompatibility.service.js
    │   │   ├── matching.service.js
    │   │   └── matching.routes.js
    │   ├── bookings/                  # Two-Tier Approval & Driver Dispatch
    │   │   ├── booking.service.js
    │   │   ├── booking.controller.js
    │   │   └── booking.routes.js
    │   ├── pod/                       # Execution, Transit Status & Digital POD Verification
    │   │   ├── pod.service.js
    │   │   ├── pod.controller.js
    │   │   └── pod.routes.js
    │   ├── analytics/                 # Green Metrics & Carbon Savings Engine
    │   │   ├── analytics.service.js
    │   │   ├── analytics.controller.js
    │   │   └── analytics.routes.js
    │   └── reviews/                   # Dual-Sided Post-Delivery Rating & Trust System
    │       ├── review.service.js
    │       ├── review.controller.js
    │       └── review.routes.js
    └── utils/
        ├── apiError.util.js           # Operational API error class
        ├── asyncHandler.util.js       # Higher-order async handler wrapper
        ├── distance.util.js           # Haversine, cross-track, and corridor trajectory projection
        ├── emissions.util.js          # Carbon emissions & green logistics calculation
        └── response.util.js           # Standardized response formatters
```

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file inside the `Backend/` directory:

```env
PORT=5000
NODE_ENV=development

# Supabase Credentials (from Project Settings -> API)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# AI & LLM Engine (Groq Model)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b

# Secret Keys
JWT_SECRET=your-secure-jwt-secret
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Apply Database Schema
1. Open your Supabase project dashboard.
2. Go to **SQL Editor** $\rightarrow$ **New query**.
3. Copy and run the entire contents of [`src/db/schema.sql`](file:///d:/dev/hackx/Backend/src/db/schema.sql).

### 3. Start Development Server
```bash
npm run dev
# or
npm start
```
Server runs at `http://localhost:5000`.

---

## 📡 API Documentation & Complete Route Reference

Base URL: `http://localhost:5000/api/v1`

Standard Success Response:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation description",
  "data": { ... }
}
```

Standard Error Response:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Error description",
  "errors": []
}
```

---

### 1. Authentication & Profile Endpoints (`/api/v1/auth`)

*Development Note: When an OTP is requested, the 6-digit code is generated and printed directly to the server terminal console with `console.log`.*

#### `POST /api/v1/auth/send-otp`
Request a one-time OTP code for registration or login.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "phone": "+919876543210"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "OTP sent for login (Printed in server terminal)",
    "data": {
      "phone": "+919876543210",
      "isRegistered": true,
      "message": "OTP sent for login (Printed in server terminal)"
    }
  }
  ```

#### `POST /api/v1/auth/register`
Register a new user account with phone, OTP, and profile details.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "phone": "+919876543210",
    "otp": "482915",
    "full_name": "Rajesh Kumar",
    "role": "owner",
    "company_name": "Rajesh Transporters",
    "gst_number": "08AAAAA0000A1Z5",
    "email": "rajesh@transporters.com"
  }
  ```
  *(Roles: `owner`, `driver`, `business`)*
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "User registered successfully",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "7b8e1a23-...",
        "phone": "+919876543210",
        "full_name": "Rajesh Kumar",
        "role": "owner",
        "company_name": "Rajesh Transporters",
        "gst_number": "08AAAAA0000A1Z5",
        "rating_avg": "5.00"
      },
      "isNewUser": true
    }
  }
  ```

#### `POST /api/v1/auth/login`
Log in an existing registered user using phone number and OTP.
- **Access**: Public
- **Request Body**:
  ```json
  {
    "phone": "+919876543210",
    "otp": "482915"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "7b8e1a23-...",
        "phone": "+919876543210",
        "full_name": "Rajesh Kumar",
        "role": "owner",
        "company_name": "Rajesh Transporters",
        "rating_avg": "5.00"
      },
      "isNewUser": false
    }
  }
  ```

#### `POST /api/v1/auth/verify-otp`
Unified verification endpoint (handles login if user is registered, or signs up if registration fields are provided).
- **Access**: Public
- **Request Body**:
  ```json
  {
    "phone": "+919876543210",
    "otp": "482915"
  }
  ```

#### `GET /api/v1/auth/me` (or `GET /api/v1/auth/getme`)
Retrieve currently authenticated user profile using mandatory JWT.
- **Access**: Protected (`Bearer <token>`)
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**: Returns profile object with role, GST, and ratings.

#### `PATCH /api/v1/auth/profile`
Update current user profile information.
- **Access**: Protected (`Bearer <token>`)
- **Request Body**:
  ```json
  {
    "full_name": "Rajesh K.",
    "company_name": "Rajesh Freight Lines",
    "gst_number": "08AAAAA0000A1Z5",
    "email": "rajesh@freight.com"
  }
  ```

---

### 2. Vehicle Fleet Endpoints (`/api/v1/vehicles`)

#### `POST /api/v1/vehicles`
Register a new commercial truck/vehicle.
- **Access**: Protected (Role: `owner`, `admin`)
- **Request Body**:
  ```json
  {
    "registration_number": "RJ14GB9821",
    "vehicle_type": "closed_container",
    "max_weight_capacity_tons": 10.0,
    "max_volume_capacity_cft": 1200,
    "model_name": "Tata Signa 2823.K",
    "assigned_driver_id": "optional-driver-uuid"
  }
  ```
  *(Vehicle types: `closed_container`, `open_body_truck`, `flatbed`, `refrigerated`, `tanker`, `mini_truck`, `other`)*
- **Response (201 Created)**: Returns created vehicle with driver details.

#### `GET /api/v1/vehicles`
List all active vehicles owned by the logged-in transporter.
- **Access**: Protected (Role: `owner`, `admin`)
- **Response (200 OK)**: Returns array of vehicles.

#### `GET /api/v1/vehicles/drivers/available`
List registered platform drivers available for vehicle assignment.
- **Access**: Protected (Role: `owner`, `admin`)
- **Response (200 OK)**: Array of driver profiles.

#### `GET /api/v1/vehicles/:id`
Get full details of a specific vehicle.
- **Access**: Protected (Role: `owner`, `driver`, `admin`)

#### `PATCH /api/v1/vehicles/:id`
Update vehicle specifications or assign/reassign driver.
- **Access**: Protected (Role: `owner`, `admin`)
- **Request Body**:
  ```json
  {
    "assigned_driver_id": "driver-uuid",
    "max_weight_capacity_tons": 12.0
  }
  ```

#### `DELETE /api/v1/vehicles/:id`
Deactivate a vehicle from active fleet.
- **Access**: Protected (Role: `owner`, `admin`)

---

### 3. Return Trip & Corridor Endpoints (`/api/v1/trips`)

#### `POST /api/v1/trips`
Publish an available return leg with spare capacity & route corridor.
- **Access**: Protected (Role: `owner`, `admin`)
- **Request Body**:
  ```json
  {
    "vehicle_id": "vehicle-uuid",
    "driver_id": "driver-uuid",
    "origin_name": "Jaipur, Rajasthan",
    "origin_lat": 26.9124,
    "origin_lng": 75.7873,
    "destination_name": "Delhi NCR",
    "destination_lat": 28.7041,
    "destination_lng": 77.1025,
    "departure_time": "2026-09-12T08:00:00Z",
    "estimated_arrival_time": "2026-09-12T14:00:00Z",
    "current_loaded_tons": 8.0,
    "existing_cargo_category": "Packaged Dry FMCG",
    "existing_cargo_description": "8 tons of sealed cardboard packaged dry wheat biscuits",
    "base_price_per_km_ton": 6.50,
    "route_waypoints": [
      {
        "name": "Kotputli Checkpoint",
        "lat": 27.7011,
        "lng": 76.1982,
        "eta": "2026-09-12T10:00:00Z"
      },
      {
        "name": "Gurgaon IFFCO Chowk",
        "lat": 28.4720,
        "lng": 77.0725,
        "eta": "2026-09-12T12:30:00Z"
      }
    ]
  }
  ```
- **Response (201 Created)**: Automatically calculates `available_capacity_tons: 2.0` and returns scheduled trip object.

#### `GET /api/v1/trips`
Search and list available return trips (supports query filters).
- **Access**: Public / Authenticated
- **Query Parameters**:
  - `origin` (optional string): filter by origin name
  - `destination` (optional string): filter by destination name
  - `minAvailableCapacity` (optional number in tons): e.g. `2.0`
  - `status` (optional, default `scheduled`): `scheduled`, `in_transit`, `completed`, `all`
  - `page` (default 1), `limit` (default 20)

#### `GET /api/v1/trips/:id`
Get detailed trip info including vehicle, driver, and waypoints.
- **Access**: Public / Authenticated

#### `GET /api/v1/trips/user/my-trips`
Get all trips associated with the authenticated Owner or Driver.
- **Access**: Protected (Role: `owner`, `driver`, `admin`)

#### `PATCH /api/v1/trips/:id/status`
Update trip lifecycle status.
- **Access**: Protected (Role: `owner`, `driver`, `admin`)
- **Request Body**:
  ```json
  {
    "status": "in_transit"
  }
  ```
  *(Status options: `scheduled`, `in_transit`, `completed`, `cancelled`)*

---

### 4. Smart Matching & AI Cargo Compatibility (`/api/v1/matching`)

#### `POST /api/v1/matching/search`
Search matching return trucks passing along a corridor with sufficient spare capacity and **Groq AI Cargo Compatibility** evaluation.
- **Access**: Public / Authenticated
- **Request Body**:
  ```json
  {
    "pickup_lat": 27.7011,
    "pickup_lng": 76.1982,
    "drop_lat": 28.4720,
    "drop_lng": 77.0725,
    "weight_tons": 2.0,
    "cargo_category": "Packaged Dry FMCG",
    "cargo_description": "2 tons of sealed dry tea packets in corrugated boxes",
    "max_detour_km": 25,
    "pickup_date": "2026-09-12"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Found 1 matching return trip(s)",
    "data": {
      "matches_found": 1,
      "direct_distance_km": 121.4,
      "trips": [
        {
          "trip_id": "98a123f4-...",
          "match_rank_score": 94,
          "vehicle": {
            "registration_number": "RJ14GB9821",
            "vehicle_type": "closed_container",
            "model_name": "Tata Signa"
          },
          "driver": {
            "full_name": "Harish Singh",
            "phone": "+919876543210",
            "rating_avg": "4.90"
          },
          "owner": {
            "full_name": "Rajesh Kumar",
            "company_name": "Rajesh Freight Lines"
          },
          "capacity": {
            "total_capacity_tons": 10.0,
            "current_loaded_tons": 8.0,
            "available_capacity_tons": 2.0,
            "requested_weight_tons": 2.0,
            "remaining_after_booking": 0.0
          },
          "corridor_metrics": {
            "pickup_distance_km": 4.2,
            "drop_distance_km": 6.8,
            "total_detour_km": 11.0,
            "shipment_distance_km": 128.5
          },
          "pricing": {
            "base_price_per_km_ton": 6.5,
            "discount_percentage": 15,
            "estimated_total_price": 1420,
            "currency": "INR"
          },
          "ai_compatibility": {
            "is_compatible": true,
            "compatibility_score": 95,
            "safety_level": "SAFE",
            "hazards_identified": [],
            "special_handling_instructions": "Ensure dry tea boxes are placed on elevated pallets separated from existing biscuit cartons.",
            "reasoning": "Both shipments are dry packaged non-hazardous grocery consumables with zero chemical reactivity or contamination risk."
          }
        }
      ]
    }
  }
  ```

#### `POST /api/v1/matching/check-compatibility`
Direct standalone AI Cargo Compatibility Checker powered by Groq LLM (`openai/gpt-oss-120b`).
- **Access**: Public / Authenticated
- **Request Body**:
  ```json
  {
    "existingCargo": {
      "category": "Food Consumables",
      "description": "6 tons of packaged wheat grain bags"
    },
    "newCargo": {
      "category": "Industrial Chemicals",
      "description": "2 tons of liquid pesticide drums",
      "weight_tons": 2.0
    }
  }
  ```
- **Response (200 OK - Hazardous Incompatible Example)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Cargo compatibility evaluated by AI",
    "data": {
      "is_compatible": false,
      "compatibility_score": 15,
      "safety_level": "HAZARDOUS",
      "hazards_identified": [
        "Severe toxicity and cross-contamination hazard between toxic pesticide chemicals and edible grain food products"
      ],
      "special_handling_instructions": "Strictly prohibited from co-loading. Requires dedicated hazardous materials transportation.",
      "reasoning": "Chemical fumes and liquid leakage risk from pesticide drums can contaminate consumable grains, violating food safety laws."
    }
  }
  ```

---

### 5. Bookings, Two-Tier Approval & Driver Dispatch (`/api/v1/bookings`)

#### `POST /api/v1/bookings`
Shipper submits a new booking request for an available return trip. Automatically triggers **Groq AI Cargo Compatibility** evaluation and generates a 6-digit delivery OTP.
- **Access**: Protected (Role: `business`, `admin`)
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "trip_id": "44abe058-a496-4391-b5ae-0783aee13c97",
    "cargo_title": "Packaged Tea Bags",
    "cargo_category": "Dry Packaged FMCG",
    "cargo_description": "2 tons of sealed dry tea in corrugated cartons",
    "weight_tons": 2.0,
    "volume_cft": 250,
    "pickup_address": "Shahpura Industrial Area, Jaipur Highway",
    "pickup_lat": 27.3892,
    "pickup_lng": 75.9612,
    "pickup_deadline": "2026-09-15T09:00:00Z",
    "drop_address": "Manesar IMT Logistics Park, Haryana",
    "drop_lat": 28.3512,
    "drop_lng": 76.9421,
    "drop_deadline": "2026-09-15T12:00:00Z"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Booking request submitted successfully. Awaiting vehicle owner approval.",
    "data": {
      "id": "e3a89012-...",
      "business_id": "...",
      "trip_id": "44abe058-...",
      "cargo_title": "Packaged Tea Bags",
      "weight_tons": "2.00",
      "price_calculated": "1031.00",
      "ai_compatibility_score": 92,
      "ai_compatibility_verdict": "SAFE",
      "ai_compatibility_reason": "Both cargo types are compatible dry freight with no chemical or aroma hazards.",
      "ai_handling_instructions": "Ensure tea cartons are strapped on elevated pallets.",
      "status": "pending_owner_approval",
      "pod_otp": "782910"
    }
  }
  ```

#### `PATCH /api/v1/bookings/:id/respond`
Vehicle Owner reviews and approves or rejects a booking request. Approving automatically reduces the trip's available capacity and dispatches the shipment to the assigned driver.
- **Access**: Protected (Role: `owner`, `admin`)
- **Headers**: `Authorization: Bearer <token>`
- **Request Body (Approve)**:
  ```json
  {
    "action": "approve"
  }
  ```
- **Request Body (Reject)**:
  ```json
  {
    "action": "reject",
    "rejection_reason": "Truck cargo hold reserved for full pallet load"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Booking approved successfully and dispatched to the vehicle driver",
    "data": {
      "id": "e3a89012-...",
      "status": "driver_dispatched",
      "trip": {
        "id": "44abe058-...",
        "current_loaded_tons": "10.00",
        "available_capacity_tons": "0.00",
        "driver": {
          "full_name": "Harish Singh",
          "phone": "+919876543210"
        }
      }
    }
  }
  ```

#### `GET /api/v1/bookings/my-bookings`
Retrieve list of bookings based on the user's role (`business` sees their bookings, `owner` sees fleet booking requests, `driver` sees assigned shipments).
- **Access**: Protected (`Bearer <token>`)
- **Query Parameters**:
  - `status` (optional): `pending_owner_approval`, `driver_dispatched`, `in_transit`, `delivered`, `rejected`, `all`
- **Response (200 OK)**: Array of booking objects.

#### `GET /api/v1/bookings/:id`
Get full details of a specific booking with vehicle, driver, owner, and Groq AI compatibility report.
- **Access**: Protected (Shipper, Carrier, Assigned Driver, or Admin)

#### `GET /api/v1/bookings/driver/dispatches`
Driver retrieves active dispatched loads with customer contact numbers, pickup/drop coordinates, and AI handling guidelines.
- **Access**: Protected (Role: `driver`, `admin`)
- **Response (200 OK)**: Array of dispatch orders.

#### `PATCH /api/v1/bookings/:id/cancel`
Shipper cancels their booking if not yet picked up. Automatically restores the vehicle's available capacity.
- **Access**: Protected (Role: `business`, `admin`)

---

### 6. Execution, Proof of Delivery (POD) & Transit Tracking (`/api/v1/pod`)

#### `PATCH /api/v1/pod/trips/:tripId/status`
Update trip execution status during active transit (`scheduled` $\rightarrow$ `in_transit` $\rightarrow$ `completed`). Automatically records `actual_departure_time` and `actual_arrival_time`.
- **Access**: Protected (Role: `driver`, `owner`, `admin`)
- **Request Body**:
  ```json
  {
    "status": "in_transit"
  }
  ```

#### `PATCH /api/v1/pod/bookings/:bookingId/status`
Update shipment transit status (`driver_dispatched` $\rightarrow$ `in_transit`).
- **Access**: Protected (Role: `driver`, `owner`, `admin`)
- **Request Body**:
  ```json
  {
    "status": "in_transit"
  }
  ```

#### `POST /api/v1/pod/bookings/:bookingId/verify-otp`
Driver submits the consignee's 6-digit Proof of Delivery (POD) OTP at destination.
- **Validation**: Verifies OTP matches consignee code.
- **Automation**: Marks shipment `delivered`, logs timestamp, and **instantly computes Green Logistics metrics** ($\text{CO}_2$ saved, empty km avoided, carrier revenue, shipper savings) stored into `trip_analytics`.
- **Access**: Protected (Role: `driver`, `owner`, `admin`)
- **Request Body**:
  ```json
  {
    "pod_otp": "610565",
    "receiver_name": "Rajesh Sharma (Warehouse In-charge)",
    "signature_url": "https://storage.example.com/signatures/sig_123.png",
    "photo_url": "https://storage.example.com/photos/unloaded_cargo_456.jpg"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Proof of Delivery verified and delivery marked as completed!",
    "data": {
      "booking": {
        "id": "c37ecb31-...",
        "status": "delivered",
        "pod_completed_at": "2026-09-12T14:30:00.000Z",
        "pod_receiver_name": "Rajesh Sharma (Warehouse In-charge)",
        "pod_signature_url": "https://storage.example.com/signatures/sig_123.png"
      },
      "analytics": {
        "empty_km_avoided": 68.1,
        "co2_kg_saved": 49.03,
        "carrier_earnings": 941.00,
        "shipper_cost_saved": 329.35
      }
    }
  }
  ```

#### `GET /api/v1/pod/bookings/:bookingId`
Retrieve Proof of Delivery (POD) certificate document.
- **Access**: Protected (Shipper, Driver, Owner, or Admin)

---

### 7. Green Logistics & Carbon Savings Analytics (`/api/v1/analytics`)

#### `GET /api/v1/analytics/platform`
Platform-wide aggregated green impact metrics for public counters and dashboard hero banners.
- **Access**: Public / Authenticated
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Platform green metrics retrieved successfully",
    "data": {
      "total_co2_kg_saved": 4820.50,
      "total_co2_metric_tons_saved": 4.821,
      "total_empty_km_avoided": 6695.14,
      "total_carrier_earnings": 92450.00,
      "total_shipper_cost_saved": 32357.50,
      "completed_deliveries": 42,
      "total_trips_published": 58,
      "active_fleet_count": 24,
      "diesel_liters_conserved": 1809.5
    }
  }
  ```

#### `GET /api/v1/analytics/me`
Personalized green metrics, cost savings, and earnings for the logged-in user.
- **Access**: Protected (`Bearer <token>`)
- **Shipper Profile Response**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "role": "business",
      "total_shipment_requests": 3,
      "delivered_shipments": 3,
      "total_freight_spent": 2823.00,
      "total_cost_saved": 988.05,
      "total_co2_kg_saved": 147.09,
      "total_empty_km_avoided": 204.30,
      "green_score": 75
    }
  }
  ```
- **Carrier / Transporter Response**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "role": "owner",
      "total_trips_published": 5,
      "active_trips": 1,
      "completed_trips": 4,
      "total_incremental_earnings": 12850.00,
      "total_co2_kg_saved": 670.40,
      "total_empty_km_avoided": 931.10,
      "average_load_factor_percent": 82.4
    }
  }
  ```

#### `GET /api/v1/analytics/trips/:tripId`
Detailed consolidated green & financial breakdown for a specific trip and its partial loads.
- **Access**: Protected (`Bearer <token>`)

---

### 8. Ratings, Reviews & Trust System (`/api/v1/reviews`)

#### `POST /api/v1/reviews`
Submit a verified 1-to-5 star rating and feedback review after successful cargo delivery. Automatically recalculates and updates `rating_avg` and `rating_count` on the reviewee's `profiles` record.
- **Access**: Protected (`Bearer <token>`) - Shipper reviewing Driver/Owner OR Carrier reviewing Shipper
- **Request Body**:
  ```json
  {
    "booking_id": "c37ecb31-16f8-46f4-bf58-949a116c2173",
    "reviewee_id": "2cfcc050-d5ef-4735-ba14-48f724d26e62",
    "rating": 5,
    "comment": "Exceptional driver! Punctual pickup, careful handling of fragile cargo, smooth delivery."
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Review submitted successfully",
    "data": {
      "id": "1e0de766-...",
      "booking_id": "c37ecb31-...",
      "reviewer_id": "...",
      "reviewee_id": "2cfcc050-...",
      "rating": 5,
      "comment": "Exceptional driver! Punctual pickup, careful handling of fragile cargo, smooth delivery.",
      "created_at": "2026-09-12T15:00:00.000Z"
    }
  }
  ```

#### `GET /api/v1/reviews/profile/:profileId`
Retrieve all verified reviews and ratings received by a specific user profile (transporter, driver, or shipper).
- **Access**: Public / Authenticated
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "1e0de766-...",
        "rating": 5,
        "comment": "Exceptional driver! Punctual pickup, careful handling of fragile cargo, smooth delivery.",
        "created_at": "2026-09-12T15:00:00.000Z",
        "reviewer": {
          "id": "...",
          "full_name": "Priya Sharma",
          "company_name": "Fresh Organics Corp",
          "role": "business"
        }
      }
    ]
  }
  ```

#### `GET /api/v1/reviews/booking/:bookingId`
Get all reviews exchanged for a specific shipment booking.
- **Access**: Protected (`Bearer <token>`)

---

## 🧪 Comprehensive Automated Testing

Run the automated test suite covering the entire lifecycle:

```bash
node scratch/test_phase5_phase6.js
```

### Verified Test Flow:
1. **Transporter, Driver & Shipper Registration** via in-house OTP & JWT token creation.
2. **Vehicle Creation** (`Tata Signa 4825.TK`, 15 tons) & Driver Assignment.
3. **Return Trip Publishing** (Navi Mumbai $\rightarrow$ Pune with intermediate corridor waypoints).
4. **AI Compatibility Evaluation** via Groq API (`openai/gpt-oss-120b`).
5. **Two-Tier Booking & Owner Approval** $\rightarrow$ automated capacity deduction.
6. **Driver Dispatch & Transit Status Updates** (`scheduled` $\rightarrow$ `in_transit`).
7. **Digital Proof of Delivery Verification** with secure 6-digit consignee OTP.
8. **Green Logistics Analytics Computation** ($\text{CO}_2$ saved, empty km avoided, cost savings).
9. **Dual-Sided 5-Star Review Submission** & Profile Rating Recalculation.
