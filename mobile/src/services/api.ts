import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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

  try {
    const uploadUrl = `${API_BASE_URL}/api/trips/upload`;
    console.log(`Starting stream upload to: ${uploadUrl}`);
    
    // ─── POST via Expo FileSystem to avoid memory limit crashes ───
    const uploadTask = FileSystem.createUploadTask(
      uploadUrl,
      videoUri,
      {
        uploadType: 1, // FileSystemUploadType.MULTIPART
        fieldName: 'video',
        mimeType: 'video/mp4',
        parameters: {
          gps_data: gpsDataString,
          metadata: JSON.stringify(meta),
        },
      },
      (progress) => {
        if (onProgress) {
          const pct = Math.round((progress.totalBytesSent * 100) / progress.totalBytesExpectedToSend);
          onProgress(pct);
        }
      }
    );

    const response = await uploadTask.uploadAsync();

    // ─── Detailed Error Logging & Interception ───
    if (!response || response.status !== 200) {
      let errorMsg = `Server returned status ${response?.status}`;
      try {
        if (response?.body) {
          const parsed = JSON.parse(response.body);
          errorMsg = parsed.detail || errorMsg;
        }
      } catch (e) {
        errorMsg = response?.body || errorMsg;
      }
      throw new Error(errorMsg);
    }

    return JSON.parse(response.body);
  } catch (err: any) {
    console.error('Detailed Upload Network Error:', err.message || err);
    throw new Error(`Upload failed: ${err.message || 'Network/Timeout Error'}`);
  }
};
