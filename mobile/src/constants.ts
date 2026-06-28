/**
 * RoadEye Mobile — App Constants
 * Centralized configuration for the mobile app.
 */

// ─── Backend API Configuration ─────────────────────────────────
// For Android Emulator: use 'http://10.0.2.2:8000'
// For iOS Simulator:    use 'http://localhost:8000'
// For Physical Device:  use your machine's LAN IP, e.g. 'http://192.168.1.x:8000'
export const API_BASE_URL = 'http://10.0.2.2:8000';

// ─── GPS Configuration ─────────────────────────────────────────
export const GPS_POLL_INTERVAL_MS = 1000; // 1 second between GPS captures
export const UPLOAD_TIMEOUT_MS = 120000;   // 2 minutes for video upload
