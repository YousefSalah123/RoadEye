import * as Location from 'expo-location';

export interface LocationPoint {
  timestamp_ms: number;
  latitude: number;
  longitude: number;
  speed: number;
}

/**
 * GPS log point format matching the backend's expected schema.
 * Uses time_offset_sec (seconds since recording started) instead of absolute timestamps.
 */
export interface GPSLogPoint {
  time_offset_sec: number;
  lat: number;
  lng: number;
}


export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
};

export const getCurrentLocationPoint = async (): Promise<LocationPoint | null> => {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      timestamp_ms: Date.now(),
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      speed: loc.coords.speed !== null && loc.coords.speed >= 0 ? loc.coords.speed : 0,
    };
  } catch {
    return null;
  }
};
