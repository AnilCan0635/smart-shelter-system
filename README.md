# 🐾 Smart Shelter System

> **An End-to-End, AI & IoT-Powered Autonomous Animal Care Ecosystem**

![C++](https://img.shields.io/badge/C++-ESP32_Firmware-00599C?style=flat-square&logo=c%2B%2B&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-Backend-000000?style=flat-square&logo=express&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-Cross--Platform-02569B?style=flat-square&logo=flutter&logoColor=white)
![React](https://img.shields.io/badge/React_19-Admin_Panel-61DAFB?style=flat-square&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Geospatial_2dsphere-47A248?style=flat-square&logo=mongodb&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_Vision-8E75C2?style=flat-square&logo=googlegemini&logoColor=white)

---

## 📌 Overview

**Smart Shelter System** is a distributed, full-stack IoT platform engineered to monitor, service, and audit autonomous street animal shelters in urban environments. The system synchronizes embedded sensor telemetry, computer vision validation, geospatial anti-fraud mechanisms, and citizen gamification across four core layers:

1. **Embedded IoT Firmware (`firmware/`):** Dual HX711 load-cell scale measurement, periodic UART bridge with ESP32-CAM, and HTTP telemetry transmission.
2. **Backend & AI Engine (`backend/`):** Node.js/Express REST API featuring Haversine GPS geofencing, MongoDB 2dsphere indexing, and Google Gemini 2.5 Flash multimodal image verification.
3. **Operations Hub (`admin-panel/`):** React 19 administrative command center for real-time telemetry analytics, manual overrides, and system diagnostics.
4. **Volunteer Mobile Client (`smart_shelter_app/`):** Cross-platform Flutter app with Google Maps integration, live navigation routing, and photo-proof gamification.

---

## 🏛️ Ecosystem Architecture

- **ESP32 Telemetry Station (`firmware/`)**
  - Dual HX711 Load Cell Modules (Food & Water Weight)
  - ESP32-CAM Frame Ingestion via Hardware Serial (UART)
  - Base64 Buffer Encoding & HTTP Telemetry JSON Dispatch
- **Node.js / Express Core (`backend/`)**
  - Security: JWT Authentication & Role-Based Access Control (RBAC)
  - Geospatial Engine: Haversine Anti-Fraud Geofencing (50m boundary threshold)
  - AI Pipeline: Google Gemini 2.5 Flash Multimodal Vision with Load Cell Fallback
  - Data Storage: MongoDB GeoJSON `$near` Spatial Indexing
- **Operations Hub (`admin-panel/`)**
  - Live Station Health Metrics, Capacity Gauges & Telemetry Logs
- **Volunteer Mobile Client (`smart_shelter_app/`)**
  - Interactive Map Markers, GPS Turn-by-Turn Routing & Proof Capture

---

## 🔬 Core Engineering Highlights

### 1. Embedded Telemetry & UART Camera Bridge
- Dual **HX711 load cells** capture calibrated gram and milliliter metrics for food and water reserves.
- Inter-chip **UART communication** links the primary controller with an **ESP32-CAM module**, buffering image bytes via dynamic memory allocation (`malloc`) and encoding frames directly to Base64 payloads.

### 2. Multimodal AI Vision & Telemetry Fallback
- Volunteer submissions are evaluated against contextual system prompts using **Google Gemini 2.5 Flash** to inspect food texture, container geometry, and water clarity.
- **Failover Mode:** In case of upstream AI outages (HTTP 503 / timeouts), the system falls back to physical telemetry verification, validating contributions through weight differential thresholds (`Δw >= 100g/ml`).

### 3. Haversine GPS Geofencing & Fraud Prevention
- Calculates spherical distance between user coordinates and station GeoJSON locations using the **Haversine formula** ($R = 6371\text{ km}$). Submissions outside the allowable radius are rejected prior to triggering AI inference.
- Enforces a **2-hour locking cooldown** on stations following successful submissions to eliminate spam and preserve leaderboard integrity.

### 4. Dynamic State Machine & Community Gamification
- Shelter status transitions dynamically:
  - **CRITICAL:** Food or water capacity $\le 20\%$
  - **WARNING:** Food or water capacity $\le 50\%$
  - **FULL:** All storage levels $> 50\%$
- Volunteers earn merit points (**+50 pts** per verified action) and advance through community tiers:
  - **Aday Gönüllü:** < 200 pts
  - **Gönüllü Besleyici:** 200+ pts
  - **Aktif Saha Görevlisi:** 600+ pts
  - **Kıdemli Hayvan Koruyucu:** 1,200+ pts
  - **Doğa ve Can Dostu Bilge 👑:** 2,000+ pts

---

## 📁 Repository Structure

```text
smart-shelter-system/
├── firmware/
│   └── smart_shelter_firmware.ino # ESP32 dual HX711 & UART camera bridge
│
├── backend/
│   ├── middleware/                # JWT verifyToken and isAdmin filters
│   ├── models/                    # Mongoose schemas (Shelter, User, FeedAction, ShelterLog)
│   ├── server.js                  # Express API, Gemini pipeline, and Haversine routing
│   ├── .env.example               # Environment variable configuration template
│   └── package.json
│
├── admin-panel/
│   ├── src/                       # React 19 administration dashboard views
│   ├── index.html                 # Single-page application root
│   ├── vite.config.js             # Vite build configuration
│   └── package.json
│
└── smart_shelter_app/
    ├── lib/                       # Flutter screens (main, home, map, register)
    ├── ios/Runner/Info.plist      # iOS camera, location, and network permissions
    ├── android/app/src/main/      # Android permissions and manifest declarations
    └── pubspec.yaml               # Flutter package dependencies
```

---

## 📡 API Specification

### 🛰️ Station & Telemetry Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/shelters` | Bearer Token | Retrieves all stations with current capacity metrics |
| `GET` | `/api/shelters/nearby` | Public | Discovers stations within radius using `$near` index |
| `POST` | `/api/shelters` | Admin | Registers a new physical station with coordinates |
| `POST` | `/api/hardware/update` | Hardware MAC | Ingests sensor data (load cell, battery, camera) |
| `GET` | `/api/shelters/:id/history` | Bearer Token | Retrieves historical telemetry logs |

### 👥 Volunteer & Verification Endpoints

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Registers a new volunteer account |
| `POST` | `/api/auth/login` | Public | Authenticates credentials and issues JWT token |
| `POST` | `/api/feed-actions` | Bearer Token | Evaluates photo proof and GPS coordinates |
| `GET` | `/api/users/leaderboard` | Bearer Token | Returns ranked community leaderboard |

---

## 🛠️ Tech Stack

- **Firmware:** C++, ESP32 Core, HX711, HTTPClient, WiFi, Base64
- **Backend:** Node.js, Express.js, MongoDB, Mongoose, Axios
- **Artificial Intelligence:** Google Gemini Multimodal Vision API (`gemini-2.5-flash`)
- **Admin Dashboard:** React 19, Vite, Material UI (MUI), React Router v7
- **Mobile Client:** Flutter, Dart SDK, `google_maps_flutter`, `geolocator`, `image_picker`
- **Security & Standards:** JSON Web Tokens (JWT), Bcrypt, GeoJSON (RFC 7946)

---

## ⚙️ Environment Configuration

Create a `.env` file inside `/backend` based on the template below:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart-shelter
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🚀 Getting Started

### 1. 🔌 Firmware Setup (ESP32)
1. Open `firmware/smart_shelter_firmware.ino` in Arduino IDE.
2. Install `HX711` and `base64` libraries.
3. Configure `ssid`, `password`, and your local backend IP.
4. Select **ESP32 Dev Module** and flash the board.

### 2. 🖥️ Backend Service
```bash
cd backend
npm install
npm run dev
```

### 3. 📊 Admin Dashboard
```bash
cd admin-panel
npm install
npm run dev
```

### 4. 📱 Flutter Mobile Client
```bash
cd smart_shelter_app
flutter pub get
flutter run
```

---

## 🔒 Security Best Practices

- Real credentials, API keys, and local Wi-Fi passwords are stripped from version control and managed via environment variables.
- Role-based authorization (`verifyToken`, `isAdmin`) protects administrative mutation endpoints.
- Payload limits on JSON parsing prevent memory exhaustion during Base64 image ingestion.