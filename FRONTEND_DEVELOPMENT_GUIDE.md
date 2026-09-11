# 🚛 GreenHaul Exchange: Complete Frontend Blueprint & Engineering Specification
**Project:** PS #7 Community Logistics Exchange for Empty Return Trips  
**Target:** Frontend Engineers & UI/UX Designers  
**Backend API Base URL:** `http://localhost:5000/api/v1`  
**Document Purpose:** Complete single-file master specification containing system vision, screen-by-screen UX wireframes, Google Maps/GPS integration guides, state management architecture, and exact API contract recipes to build a 100% functional, end-to-end working prototype.

---

## 🌟 1. System Vision & Product Philosophy

The Indian freight economy suffers from a massive **40%+ empty return haulage (deadhead)** crisis. Commercial trucks return from deliveries completely empty, burning fuel, emitting tons of $\text{CO}_2$, and generating ₹0 revenue.

**GreenHaul Exchange** is a high-performance, dual-sided logistics web/mobile application that bridges this gap:
1. **Transporters & Drivers (Carrier Experience):** Monetize empty backhaul legs by publishing available corridor space with waypoint flexibility.
2. **MSMEs & Enterprise Shippers (Business Experience):** Search trucks already moving along their highway corridor and book partial loads (LTL) at a **25%–35% discount** with sub-second **Groq AI Cargo Safety Validation**.
3. **Green Sustainability (ESG Impact):** Live calculation and visualization of $\text{CO}_2$ emissions avoided, diesel conserved, and Scope 3 carbon reduction.

---

## 🎨 2. Visual Design System & Aesthetic Guidelines

### Theme & Palette (Modern Logistics + Eco-Green)
- **Primary / Emerald Accent:** `#10B981` (Tailwind `emerald-500`) – Action buttons, verified badges, green savings.
- **Deep Navy / Background:** `#0B0F19` (Dark surface) or `#F8FAFC` (Slate 50 clean light mode).
- **Secondary / Cyber Blue:** `#3B82F6` (Waypoints, route polylines, driver dispatch).
- **Warning / Amber:** `#F59E0B` (Restricted cargo, pending owner approvals).
- **Hazard / Crimson:** `#EF4444` (Incompatible hazardous cargo, cancellation).
- **Card Surfaces:** Glassmorphism backdrop blur `bg-slate-900/80 backdrop-blur-md border border-slate-800`.
- **Typography:** `Inter`, `Outfit`, or `Plus Jakarta Sans` for sleek readability.

---

## 🗺️ 3. Google Maps & Live GPS Integration Architecture

The frontend must feature rich, interactive Google Maps (`@react-google-maps/api` or Leaflet / Mapbox GL) to visualize return trip corridors and real-time tracking.

### A. Core Map Components
1. **Highway Corridor Polyline:**
   - Origin Marker (Green Pin 🟢) $\rightarrow$ Intermediate Waypoints (Blue Dots 🔵) $\rightarrow$ Destination (Red Pin 🔴).
   - Draw smooth route polyline via Google Directions API or encoded route points.
2. **Shipper Pickup & Drop Overlay:**
   - Shipper Pickup Pin (Yellow Pin 🟡) and Dropoff Pin (Purple Pin 🟣).
   - Draw dashed perpendicular detour lines from highway corridor to shipper points showing proximity ($< 25\text{ km}$).
3. **Live Driver GPS Marker:**
   - Custom animated truck icon (`🚚`) rotating according to vehicle heading.
   - Smooth marker animation interpolating simulated driver GPS coordinates during `in_transit` state.
4. **Google Places Autocomplete:**
   - For all address input fields (Origin, Destination, Waypoints, Pickup Address, Drop Address) capturing `{ address, lat, lng }`.

---

## 📱 4. Role-Based Navigation & Information Architecture

The application operates with three distinct user roles managed via JWT claims:

```text
                                  ┌─────────────────────────────┐
                                  │      Login / Signup         │
                                  │   (Phone OTP Modal)         │
                                  └──────────────┬──────────────┘
                                                 │
                     ┌───────────────────────────┼───────────────────────────┐
                     ▼                           ▼                           ▼
       ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
       │   Transporter (Owner)     │ │     Driver Portal         │ │   Shipper (Business)      │
       │   - Fleet Registry        │ │   - Active Dispatches     │ │   - Corridor Search (Map) │
       │   - Publish Return Trips  │ │   - Route Navigation      │ │   - AI Safety Verdicts    │
       │   - Booking Approvals     │ │   - Status Switcher       │ │   - Book Partial Loads    │
       │   - Live Fleet Tracker    │ │   - 6-Digit OTP POD       │ │   - Live Shipment Tracker │
       │   - Revenue & Earnings    │ │   - Driver Ratings        │ │   - Green Impact Certs    │
       └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
```

---

## 🖥️ 5. Screen-by-Screen Detailed Specifications

---

### SCREEN 1: Authentication & Phone OTP Modal
- **Visuals:** Minimalist modal with phone number input (+91), 6-digit OTP boxes, and Role Selector cards (`Shipper / Business`, `Fleet Transporter`, `Truck Driver`).
- **Dev Mode Feature:** An alert banner at the bottom: *"🧪 Development Mode: Check your terminal console for the OTP, or enter `123456`."*
- **State & Action Flow:**
  1. User enters phone $\rightarrow$ calls `POST /api/v1/auth/send-otp`.
  2. If user exists $\rightarrow$ enters OTP $\rightarrow$ calls `POST /api/v1/auth/login` $\rightarrow$ saves JWT to `localStorage`.
  3. If new user $\rightarrow$ enters OTP + Full Name + Role + Company Name $\rightarrow$ calls `POST /api/v1/auth/register` $\rightarrow$ redirects to role-specific dashboard.

---

### SCREEN 2: Transporter (Owner) Dashboard
**URL:** `/dashboard/owner`
1. **Fleet Status Cards:** Total trucks registered, active return trips, incremental revenue earned (₹), and capacity utilization gauge (%).
2. **Vehicle Registry Tab:**
   - Table of fleet trucks with registration number, vehicle type (`closed_container`, `flatbed`, etc.), max weight capacity (Tons), and assigned driver name.
   - **"Add Vehicle" Button:** Modal to register truck & assign from available drivers (`GET /api/v1/vehicles/drivers/available`).
3. **"Publish Return Trip" Flow (Core Feature):**
   - **Form Fields:**
     - Vehicle Selector (dropdown of owner's vehicles).
     - Origin & Destination (Google Autocomplete).
     - Intermediate Waypoints (Dynamic "+ Add Waypoint" list with ETA).
     - Departure & Estimated Arrival Timestamps.
     - Total Truck Capacity vs. Already Loaded Cargo (Auto-calculates available tons).
     - Baseline Loaded Cargo Description (e.g. *"3 tons of packaged dry tea & biscuits"*).
     - Base Freight Rate (₹ per ton-km).
   - **Interactive Route Preview Map:** Updates route line and waypoints dynamically as inputs change.
   - **Submit:** Calls `POST /api/v1/trips`.
4. **Pending Booking Requests Drawer:**
   - Real-time badge counter of pending bookings.
   - Displays Shipper name, requested weight, price, pickup/drop coordinates, and the **Groq AI Safety Badge** (`SAFE` / `RESTRICTED`).
   - Two action buttons: **[Approve & Dispatch Driver]** (`action: "approve"`) vs **[Reject]** (`action: "reject"`).

---

### SCREEN 3: Shipper (Business) Portal & Smart Corridor Matcher
**URL:** `/shipper/search`
1. **Corridor Search Bar (Floating over Map):**
   - Pickup Location & Dropoff Location (Google Autocomplete).
   - Weight (Tons) & Cargo Category dropdown (`dry_packaged_goods`, `fresh_produce`, `industrial_chemicals`, `electronics`, etc.).
   - Cargo Description input (e.g., *"50 cartons of plastic storage boxes"*).
   - Pickup Date & Max Detour slider (default $25\text{ km}$).
   - **"Find Return Trucks" Button:** Calls `POST /api/v1/matching/search`.
2. **Split Screen View (Map on Right, Results on Left):**
   - **Interactive Map:** Displays available return truck routes. Hovering a card highlights the truck's polyline and detour pickup point.
   - **Matching Truck Cards:**
     - Transporter Company & Driver Star Rating (`⭐ 4.9 (24 reviews)`).
     - Vehicle Type & Available Capacity remaining.
     - Corridor Proximity: Pickup Detour ($\text{km}$) + Dropoff Detour ($\text{km}$).
     - **Dynamic Price Breakdown:** Return-trip discounted rate (e.g., ₹941) vs standard dedicated spot rate (₹1,320) showing **"You Save 29%"**.
     - **Groq AI Compatibility Verdict Card:**
       - Green / Yellow Badge: `SAFE (Score: 85/100)` or `RESTRICTED (Score: 70/100)`.
       - AI Reason: *"Both shipments are dry packaged goods with zero chemical or moisture reactivity."*
       - Special Handling Guidelines: *"Keep pallets elevated and segregated."*
3. **One-Click Booking Checkout Modal:**
   - Summarizes load details, pickup/drop deadlines, price, and terms.
   - **"Confirm Booking" Button:** Calls `POST /api/v1/bookings`.
   - Displays instantaneous confirmation with the generated **Secret 6-Digit Consignee POD OTP** (to be shared with the receiver at destination).

---

### SCREEN 4: Driver Mobile-First Execution Portal
**URL:** `/driver/dispatches` (Optimized for Mobile/PWA viewport)
1. **Active Trip Banner:**
   - Route: Mumbai Hub $\rightarrow$ Pune Industrial Area.
   - Current Status Badge: `Scheduled` / `In Transit` / `Completed`.
   - Large One-Tap Status Toggle: **[Start Trip / Mark In Transit]** (Calls `PATCH /api/v1/pod/trips/:tripId/status`).
2. **Assigned Shipment Dispatches List:**
   - Card for each consolidated shipper load.
   - Shipper Name & 1-Click Call button (`tel:+919876543210`).
   - Pickup Address $\rightarrow$ Drop Address with **"Open in Google Maps Navigation"** button (`https://www.google.com/maps/dir/?api=1&destination=lat,lng`).
   - AI Handling Instructions alert box (e.g. *"Fragile: do not double stack"*).
3. **Digital Proof of Delivery (POD) Terminal:**
   - When reaching destination, driver clicks **"Complete Delivery & Verify POD"**.
   - **POD Modal:**
     - Consignee Name input.
     - **6-Digit Receiver OTP Input:** (Driver asks receiver for the code).
     - Digital Signature Canvas Pad (HTML5 Canvas signature capture).
     - Photo Capture / Upload (Cargo unloaded at dock).
     - **"Verify & Complete" Button:** Calls `POST /api/v1/pod/bookings/:bookingId/verify-otp`.
   - On success: Confetti celebration animation showing instant $\text{CO}_2$ saved and revenue credited!

---

### SCREEN 5: Green Logistics & ESG Impact Dashboard
**URL:** `/analytics` (Public Leaderboard & Private User View)
1. **Hero Carbon Counter (Live Animated Numbers):**
   - 🌿 **Total $\text{CO}_2$ Saved (kg / Metric Tons):** Real-time odometer counter.
   - ⛽ **Diesel Liters Conserved:** e.g., $1,800+\text{ Liters}$.
   - 🛣️ **Empty Kilometers Avoided:** e.g., $6,700+\text{ km}$.
   - 💰 **Economic Value Created:** Carrier Earnings (₹) + Shipper Cost Savings (₹).
2. **User-Specific Green Score:**
   - Shipper ESG Badge (Gold / Silver / Bronze) based on percentage of freight moved via return trips.
   - **"Download Scope 3 Carbon Reduction Certificate" Button** (Generates clean PDF certificate for corporate sustainability reporting).
3. **Trip-Level Green Breakdown Table:**
   - List of all completed return trips with individual emissions saved and fuel efficiency metrics.

---

### SCREEN 6: Post-Delivery Reviews & Ratings Modal
- Triggers automatically for Shipper after successful POD verification.
- 5-Star interactive star rating selector.
- Text feedback / comment box.
- Submits to `POST /api/v1/reviews`.
- Profile ratings dynamically update in real time (`rating_avg`, `rating_count`).

---

## 🔌 6. Complete API Client & State Management Recipes

Below are the exact frontend service functions to integrate with the backend API.

### `src/services/api.js` (Axios / Fetch Wrapper)
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Automatic JWT Bearer token attachment
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('greenhaul_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Core API Endpoints Reference Table

| Feature / Screen | HTTP Method & Endpoint | Auth Required | Request Payload Summary |
| :--- | :--- | :---: | :--- |
| **Request Phone OTP** | `POST /auth/send-otp` | No | `{ phone: "+919876543210" }` |
| **Register User** | `POST /auth/register` | No | `{ phone, otp, full_name, role, company_name }` |
| **Login User** | `POST /auth/login` | No | `{ phone, otp }` |
| **Current Profile** | `GET /auth/me` | Yes | Bearer Header |
| **Register Vehicle** | `POST /vehicles` | Yes (`owner`) | `{ registration_number, vehicle_type, max_weight_capacity_tons, assigned_driver_id }` |
| **List My Fleet** | `GET /vehicles` | Yes (`owner`) | – |
| **Available Drivers** | `GET /vehicles/drivers/available` | Yes (`owner`) | – |
| **Publish Return Trip** | `POST /trips` | Yes (`owner`) | `{ vehicle_id, driver_id, origin_name, origin_lat, origin_lng, destination_name, destination_lat, destination_lng, route_waypoints, departure_time, estimated_arrival_time, current_loaded_tons, existing_cargo_category, existing_cargo_description, base_price_per_km_ton }` |
| **Search Corridor & AI Match** | `POST /matching/search` | No / Yes | `{ pickup_lat, pickup_lng, drop_lat, drop_lng, weight_tons, cargo_category, cargo_description, max_detour_km }` |
| **Direct AI Safety Check** | `POST /matching/check-compatibility` | No / Yes | `{ existingCargo: { category, description }, newCargo: { category, description } }` |
| **Create Booking** | `POST /bookings` | Yes (`business`) | `{ trip_id, cargo_title, cargo_category, cargo_description, weight_tons, pickup_address, pickup_lat, pickup_lng, drop_address, drop_lat, drop_lng }` |
| **Owner Approve/Reject** | `PATCH /bookings/:id/respond` | Yes (`owner`) | `{ action: "approve" \| "reject", rejection_reason?: "" }` |
| **Driver Dispatches** | `GET /bookings/driver/dispatches` | Yes (`driver`) | – |
| **Update Trip Status** | `PATCH /pod/trips/:tripId/status` | Yes (`driver`/`owner`) | `{ status: "in_transit" \| "completed" }` |
| **Verify POD (Deliver)** | `POST /pod/bookings/:bookingId/verify-otp` | Yes (`driver`/`owner`) | `{ pod_otp, receiver_name, signature_url, photo_url }` |
| **Platform Green Stats** | `GET /analytics/platform` | No | – |
| **My Carbon Analytics** | `GET /analytics/me` | Yes | – |
| **Submit Review** | `POST /reviews` | Yes | `{ booking_id, reviewee_id, rating: 5, comment: "" }` |

---

## ⚡ 7. Recommended Frontend Tech Stack

- **Framework:** Next.js 14+ (App Router) or React + Vite.
- **Styling:** TailwindCSS + Shadcn UI / Radix UI + Lucide React icons.
- **Maps:** `@react-google-maps/api` or `maplibre-gl` with Google Directions service.
- **State Management:** Zustand or React Query (`@tanstack/react-query`) for seamless caching and background refetching.
- **Animations:** Framer Motion (page transitions, glowing AI cards, odometer green counters).
- **Signature Pad:** `react-signature-canvas` for the digital POD signature capture.

---

## 🏁 8. Quick Start Verification Sequence (Demo Readiness)

To demonstrate the full end-to-end prototype to hackathon judges:
1. **Login as Transporter (Owner):** Publish a return trip from *Navi Mumbai* $\rightarrow$ *Pune* carrying biscuits with 12 tons spare space.
2. **Switch to Shipper Window:** Search corridor for *Panvel* $\rightarrow$ *Talegaon* carrying *Plastic Storage Crates*.
3. **Show Groq AI Card:** Point out the live `SAFE (Score: 85)` compatibility verdict generated by `openai/gpt-oss-120b`.
4. **Book & Approve:** Shipper submits $\rightarrow$ Transporter clicks Approve $\rightarrow$ truck available capacity auto-decrements.
5. **Switch to Driver View:** Driver marks trip `in_transit`, navigates via map, and completes delivery by entering Shipper's 6-digit POD OTP (`610565`).
6. **Show Green ESG Impact:** Watch the platform carbon counter increment by $+49.03\text{ kg CO}_2$ saved and submit a 5-star review!
