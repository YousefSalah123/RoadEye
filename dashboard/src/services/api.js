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

export default apiClient;
