import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'roadeye_profile';

export interface UserProfile {
  driverName: string;
  region: string;
  defaultStreet: string;
}

const DEFAULT_PROFILE: UserProfile = {
  driverName: '',
  region: '',
  defaultStreet: '',
};

export const getProfile = async (): Promise<UserProfile> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_PROFILE;
};

export const saveProfile = async (profile: UserProfile): Promise<void> => {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};
