import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

/**
 * Send an image to the YOLOv8 backend for crack/pothole detection.
 * @param {File|Blob} imageFile - The image file or blob to analyse.
 * @returns {Promise<{ detections: Array<{ class_id: number, confidence_score: number, bounding_box: { x_min: number, y_min: number, x_max: number, y_max: number } }> }>}
 */
export const detectImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await apiClient.post('/detect/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};

export default apiClient;
