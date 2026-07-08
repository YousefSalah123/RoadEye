import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // Infinite timeout for heavy video AI processing
});

/**
 * Send an image to the YOLOv8 backend for crack/pothole detection.
 * @param {File|Blob} imageFile - The image file or blob to analyse.
 * @returns {Promise<{ detections: Array<{ class_id: number, confidence_score: number, bounding_box: { x_min: number, y_min: number, x_max: number, y_max: number } }> }>}
 */
export const detectImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);

  const response = await apiClient.post('/detect/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

/**
 * Send a video to the YOLOv8 backend for crack/pothole detection.
 * Uses native fetch() instead of Axios to avoid timeout/caching issues
 * with large binary responses.
 * @param {File|Blob} videoFile - The video file or blob to analyse.
 */
export const detectVideo = async (videoFile) => {
  const formData = new FormData();
  formData.append('file', videoFile);

  const response = await fetch(`${API_BASE_URL}/detect/video`, {
    method: 'POST',
    body: formData,
    // Note: Do NOT set Content-Type — browser sets it automatically with boundary
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${response.status}`);
  }

  return await response.blob();
};

// ═══════════════════════════════════════════════════════════════
// Trip & Defect Pipeline API (for Dashboard data)
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all detected defects from the backend.
 * @param {string} [tripId] - Optional trip ID to filter defects.
 * @returns {Promise<{defects: Array}>}
 */
export const getDefects = async (tripId) => {
  const url = tripId
    ? `${API_BASE_URL}/api/defects/${tripId}`
    : `${API_BASE_URL}/api/defects`;
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch defects');
  return response.json();
};

/**
 * Fetch all trips from the backend.
 * @returns {Promise<{trips: Array}>}
 */
export const getTrips = async () => {
  const response = await fetch(`${API_BASE_URL}/api/trips`);
  if (!response.ok) throw new Error('Failed to fetch trips');
  return response.json();
};

/**
 * Fetch aggregated statistics.
 * @returns {Promise<Object>}
 */
export const getStats = async () => {
  const response = await fetch(`${API_BASE_URL}/api/stats`);
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

/**
 * Fetch a specific trip by ID.
 * @param {string} tripId
 * @returns {Promise<Object>}
 */
export const getTripById = async (tripId) => {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}`);
  if (!response.ok) throw new Error('Failed to fetch trip');
  return response.json();
};

/**
 * Upload a video from the dashboard, mimicking the mobile app pipeline.
 * @param {File} videoFile 
 */
export const uploadTripDashboard = async (videoFile) => {
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('gps_data', '[]'); // Empty mock GPS for dashboard upload
  const response = await fetch(`${API_BASE_URL}/api/trips/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Server error: ${response.status}`);
  }
  return response.json();
};

/**
 * Get processing status for a trip
 */
export const getTripStatus = async (tripId) => {
  const response = await fetch(`${API_BASE_URL}/api/trips/${tripId}/status`);
  if (!response.ok) throw new Error('Failed to fetch status');
  return response.json();
};

export default apiClient;
