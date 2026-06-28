import axios from 'axios';
import { Platform } from 'react-native';
import { Paths, File as ExpoFile } from 'expo-file-system';
import { TripMeta } from '../utils/fileManager';
import { API_BASE_URL, UPLOAD_TIMEOUT_MS } from '../constants';

/**
 * Upload a trip (video + GPS data) to the RoadEye backend for AI analysis.
 *
 * Sends a multipart FormData POST to /api/trips/upload containing:
 *  - video:    the .mp4 recording file
 *  - gps_data: JSON string of [{time_offset_sec, lat, lng}, ...]
 *  - metadata: JSON string of {driverName, region, streetName}
 */
export const uploadTrip = async (
  videoUri: string,
  gpsJsonUri: string,
  meta: TripMeta,
  onProgress?: (pct: number) => void
) => {
  const formData = new FormData();

  // ─── Attach video file ───
  const videoName = videoUri.split('/').pop() || 'video.mp4';
  formData.append('video', {
    uri: Platform.OS === 'android' ? videoUri : videoUri.replace('file://', ''),
    type: 'video/mp4',
    name: videoName,
  } as any);

  // ─── Read GPS JSON and attach as a string field ───
  let gpsDataString = '[]';
  try {
    const gpsFile = new ExpoFile(gpsJsonUri);
    if (gpsFile.exists) {
      gpsDataString = gpsFile.textSync();
    }
  } catch (err) {
    console.warn('Could not read GPS JSON file, sending empty array:', err);
  }
  formData.append('gps_data', gpsDataString);

  // ─── Attach trip metadata ───
  formData.append('metadata', JSON.stringify(meta));

  // ─── POST to the backend pipeline endpoint ───
  const response = await axios.post(`${API_BASE_URL}/api/trips/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT_MS,
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

  return response.data;
};
