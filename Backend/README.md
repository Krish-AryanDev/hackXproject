# Community Logistics Exchange Backend API

High-performance Express.js & Supabase (PostgreSQL) backend for **PS #7: Community Logistics Exchange for Empty Return Trips**.

---

## 🌟 Overview & Capabilities

- **Phone OTP Authentication**: Passwordless phone number + SMS OTP verification powered by Supabase Auth with automatic role-based profile provisioning (`owner`, `driver`, `business`).
- **Role-Based Access Control (RBAC)**: Fine-grained endpoint authorization protecting carrier, driver, and business operations.
- **Fleet & Vehicle Management**: Full vehicle registry with capacity constraints (weight in tons, volume in CFT), vehicle types, and driver assignments.
- **Dynamic Return Trip Publishing**: Carriers publish return corridors with origin, destination, intermediate corridor waypoints, estimated timings, and partial load availability.
- **AI Compatibility Ready**: Prepared fields and data pipelines for Groq LLM cargo compatibility evaluation.

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
    │   └── env.js                 # Strongly typed environment configuration
    ├── db/
    │   ├── db.js                  # Supabase client wrapper & connectivity checker
    │   └── schema.sql             # Complete PostgreSQL DDL (enums, tables, triggers, indexes)
    ├── middlewares/
    │   ├── auth.middleware.js     # JWT verification & RBAC permissions
    │   ├── error.middleware.js    # Global error handler
    │   └── notFound.middleware.js # Standardized 404 handler
    ├── modules/
    │   ├── index.js               # Main API Router (/api/v1)
    │   ├── auth/                  # Phone OTP Auth & Profile Management
    │   │   ├── auth.service.js
    │   │   ├── auth.controller.js
    │   │   └── auth.routes.js
    │   ├── vehicles/              # Fleet & Driver Assignment
    │   │   ├── vehicle.service.js
    │   │   ├── vehicle.controller.js
    │   │   └── vehicle.routes.js
    │   └── trips/                 # Return Leg & Corridor Publishing
    │       ├── trip.service.js
    │       ├── trip.controller.js
    │       └── trip.routes.js
    └── utils/
        ├── apiError.util.js       # Operational API error class
        ├── asyncHandler.util.js   # Higher-order async handler wrapper
        └── response.util.js       # Standardized response formatters
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

## 📡 API Documentation & Route Reference

Base URL: `http://localhost:5000/api/v1`

Standard Success Response Envelope:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation description",
  "data": { ... }
}
```

Standard Error Response Envelope:
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
- **Response (200 OK)**: Returns profile object with role and ratings.

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
Search and list available return trips (supports query parameters).
- **Access**: Public / Authenticated
- **Query Parameters**:
  - `origin` (optional string): filter by origin name
  - `destination` (optional string): filter by destination name
  - `minAvailableCapacity` (optional number in tons): e.g. `2.0`
  - `status` (optional, default `scheduled`): `scheduled`, `active`, `completed`, `all`
  - `page` (default 1), `limit` (default 20)
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "items": [ ... ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "totalItems": 1,
        "totalPages": 1
      }
    }
  }
  ```

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
    "status": "active"
  }
  ```
  *(Status options: `scheduled`, `active`, `completed`, `cancelled`)*

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
          "route": {
            "origin_name": "Jaipur, Rajasthan",
            "destination_name": "Delhi NCR",
            "departure_time": "2026-09-12T08:00:00Z"
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
Direct standalone AI Cargo Compatibility Checker powered by Groq LLM.
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

