import { Paths, Directory, File } from 'expo-file-system';
import { GPSLogPoint } from '../services/locationSync';

// ─── Trips Directory (persistent) ───
export const getTripsDirectory = (): Directory => {
  const dir = new Directory(Paths.document, 'roadeye_trips');
  if (!dir.exists) {
    dir.create();
  }
  return dir;
};

export interface LocationPoint {
  timestamp_ms: number;
  latitude: number;
  longitude: number;
  speed: number;
}

export interface TripMeta {
  driverName: string;
  region: string;
  streetName: string;
}

// ─── Save CSV with driver info header ───
export const saveTripCSV = (
  points: LocationPoint[],
  fileName: string,
  meta?: TripMeta
): string => {
  const dir = getTripsDirectory();
  const file = new File(dir, fileName);

  let csv = '';
  if (meta) {
    csv += `# driver=${meta.driverName},region=${meta.region},street=${meta.streetName}\n`;
  }
  csv += 'timestamp_ms,latitude,longitude,speed\n';
  points.forEach((p) => {
    csv += `${p.timestamp_ms},${p.latitude},${p.longitude},${p.speed}\n`;
  });

  file.write(csv);
  return file.uri;
};

// ─── Move video from cache into trips dir ───
export const saveTripVideo = (sourceUri: string, fileName: string): string => {
  const dir = getTripsDirectory();
  const destFile = new File(dir, fileName);
  const sourceFile = new File(sourceUri);

  if (sourceFile.exists) {
    sourceFile.move(destFile);
  }
  return destFile.uri;
};

// ─── Save trip metadata JSON alongside mp4/csv ───
export const saveTripMetaJSON = (fileName: string, meta: TripMeta & { duration: number; pointCount: number; createdAt: string }): string => {
  const dir = getTripsDirectory();
  const file = new File(dir, fileName);
  file.write(JSON.stringify(meta, null, 2));
  return file.uri;
};

// ─── Save GPS log as JSON for backend upload ───
export const saveGpsLogJSON = (gpsLog: GPSLogPoint[], fileName: string): string => {
  const dir = getTripsDirectory();
  const file = new File(dir, fileName);
  file.write(JSON.stringify(gpsLog));
  return file.uri;
};

// ─── Trip model ───
export interface Trip {
  id: string;
  videoUri: string;
  csvUri: string;
  metaUri: string;
  gpsJsonUri: string;
  timestamp: string;
  dateFormatted: string;
  meta?: TripMeta & { duration?: number; pointCount?: number; createdAt?: string };
}

function parseTripDate(ts: string): string {
  if (ts.length !== 15) return ts;
  return `${ts.substring(0, 4)}-${ts.substring(4, 6)}-${ts.substring(6, 8)}  ${ts.substring(9, 11)}:${ts.substring(11, 13)}:${ts.substring(13, 15)}`;
}

// ─── List saved trips ───
export const getSavedTrips = (): Trip[] => {
  const dir = getTripsDirectory();
  const items = dir.list();

  const tripIds = new Set<string>();
  items.forEach((item) => {
    const n = item.name;
    if (n.startsWith('trip_') && (n.endsWith('.mp4') || n.endsWith('.csv') || n.endsWith('.json')) && !n.endsWith('.gps.json')) {
      tripIds.add(n.substring(0, n.lastIndexOf('.')));
    }
  });

  const trips: Trip[] = Array.from(tripIds).map((tripId) => {
    const ts = tripId.replace('trip_', '');
    const videoFile = new File(dir, tripId + '.mp4');
    const csvFile = new File(dir, tripId + '.csv');
    const metaFile = new File(dir, tripId + '.json');
    const gpsJsonFile = new File(dir, tripId + '.gps.json');

    let meta: Trip['meta'] = undefined;
    if (metaFile.exists) {
      try {
        meta = JSON.parse(metaFile.textSync());
      } catch {}
    }

    return {
      id: tripId,
      videoUri: videoFile.uri,
      csvUri: csvFile.uri,
      metaUri: metaFile.uri,
      gpsJsonUri: gpsJsonFile.uri,
      timestamp: ts,
      dateFormatted: parseTripDate(ts),
      meta,
    };
  });

  return trips.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
};

// ─── Update trip meta (e.g. rename street) ───
export const updateTripMeta = (tripId: string, updates: Partial<TripMeta>): void => {
  const dir = getTripsDirectory();
  const metaFile = new File(dir, tripId + '.json');

  let existing: any = {};
  if (metaFile.exists) {
    try {
      existing = JSON.parse(metaFile.textSync());
    } catch {}
  }

  const merged = { ...existing, ...updates };
  metaFile.write(JSON.stringify(merged, null, 2));
};

// ─── Delete trip ───
export const deleteTrip = (id: string): void => {
  const dir = getTripsDirectory();
  const exts = ['.mp4', '.csv', '.json', '.gps.json'];
  exts.forEach((ext) => {
    const f = new File(dir, id + ext);
    if (f.exists) {
      try { f.delete(); } catch {}
    }
  });
};
