import os
import uuid
from datetime import datetime
from pymongo import MongoClient

# Extract data directly inside python
MOCK_TRIPS = [
  {
    "id": 'TRP-20260421-001',
    "date": '2026-04-21',
    "time": '08:32 AM',
    "driverName": 'Ahmed Mostafa',
    "zone": 'Dokki',
    "streetName": 'Tahrir St.',
    "distanceKm": 4.7,
    "cracks": 12,
    "potholes": 5,
    "status": 'Analyzed',
    "severity": 'High',
    "lat": 30.0444,
    "lng": 31.2357,
    "defects": [
      { "time": '00:12', "type": 'Pothole', "severity": 'Critical', "confidence": 0.97, "lat": 30.0445, "lng": 31.2360 },
      { "time": '00:28', "type": 'Crack', "severity": 'Medium', "confidence": 0.89, "lat": 30.0447, "lng": 31.2365 },
      { "time": '00:45', "type": 'Crack', "severity": 'Low', "confidence": 0.78, "lat": 30.0450, "lng": 31.2370 },
      { "time": '01:03', "type": 'Pothole', "severity": 'High', "confidence": 0.94, "lat": 30.0452, "lng": 31.2375 },
      { "time": '01:22', "type": 'Crack', "severity": 'Medium', "confidence": 0.85, "lat": 30.0455, "lng": 31.2380 },
      { "time": '01:55', "type": 'Pothole', "severity": 'Critical', "confidence": 0.96, "lat": 30.0458, "lng": 31.2385 },
      { "time": '02:10', "type": 'Crack', "severity": 'High', "confidence": 0.91, "lat": 30.0460, "lng": 31.2388 },
    ],
  },
  {
    "id": 'TRP-20260421-002',
    "date": '2026-04-21',
    "time": '10:15 AM',
    "driverName": 'Sara El-Naggar',
    "zone": 'Nasr City',
    "streetName": 'Abbas El-Akkad',
    "distanceKm": 6.2,
    "cracks": 8,
    "potholes": 3,
    "status": 'Analyzed',
    "severity": 'Medium',
    "lat": 30.0511,
    "lng": 31.3400,
    "defects": [
      { "time": '00:20', "type": 'Crack', "severity": 'Low', "confidence": 0.82, "lat": 30.0513, "lng": 31.3405 },
      { "time": '00:55', "type": 'Pothole', "severity": 'High', "confidence": 0.93, "lat": 30.0516, "lng": 31.3410 },
      { "time": '01:30', "type": 'Crack', "severity": 'Medium', "confidence": 0.87, "lat": 30.0520, "lng": 31.3418 },
    ],
  },
  {
    "id": 'TRP-20260420-001',
    "date": '2026-04-20',
    "time": '02:45 PM',
    "driverName": 'Mohamed Fathy',
    "zone": 'Maadi',
    "streetName": 'Road 9',
    "distanceKm": 3.1,
    "cracks": 15,
    "potholes": 7,
    "status": 'Analyzed',
    "severity": 'Critical',
    "lat": 29.9602,
    "lng": 31.2569,
    "defects": [
      { "time": '00:08', "type": 'Pothole', "severity": 'Critical', "confidence": 0.98, "lat": 29.9605, "lng": 31.2572 },
      { "time": '00:33', "type": 'Pothole', "severity": 'Critical', "confidence": 0.95, "lat": 29.9610, "lng": 31.2578 },
      { "time": '00:50', "type": 'Crack', "severity": 'High', "confidence": 0.90, "lat": 29.9615, "lng": 31.2582 },
      { "time": '01:12', "type": 'Crack', "severity": 'Medium', "confidence": 0.84, "lat": 29.9618, "lng": 31.2586 },
      { "time": '01:40', "type": 'Pothole', "severity": 'High', "confidence": 0.92, "lat": 29.9622, "lng": 31.2590 },
    ],
  },
  {
    "id": 'TRP-20260420-002',
    "date": '2026-04-20',
    "time": '09:10 AM',
    "driverName": 'Nour Hassan',
    "zone": 'Heliopolis',
    "streetName": 'El-Merghani St.',
    "distanceKm": 5.5,
    "cracks": 6,
    "potholes": 2,
    "status": 'Analyzed',
    "severity": 'Low',
    "lat": 30.0866,
    "lng": 31.3222,
    "defects": [
      { "time": '00:40', "type": 'Crack', "severity": 'Low', "confidence": 0.76, "lat": 30.0870, "lng": 31.3228 },
      { "time": '02:15', "type": 'Pothole', "severity": 'Medium', "confidence": 0.88, "lat": 30.0880, "lng": 31.3240 },
    ],
  },
  {
    "id": 'TRP-20260419-001',
    "date": '2026-04-19',
    "time": '11:30 AM',
    "driverName": 'Ahmed Mostafa',
    "zone": '6th October',
    "streetName": 'Central Axis',
    "distanceKm": 8.9,
    "cracks": 20,
    "potholes": 9,
    "status": 'Analyzed',
    "severity": 'Critical',
    "lat": 29.9728,
    "lng": 30.9436,
    "defects": [
      { "time": '00:15', "type": 'Pothole', "severity": 'Critical', "confidence": 0.97, "lat": 29.9730, "lng": 30.9440 },
      { "time": '00:42', "type": 'Crack', "severity": 'High', "confidence": 0.91, "lat": 29.9735, "lng": 30.9448 },
      { "time": '01:10', "type": 'Pothole', "severity": 'High', "confidence": 0.93, "lat": 29.9740, "lng": 30.9455 },
      { "time": '02:05', "type": 'Crack', "severity": 'Medium', "confidence": 0.86, "lat": 29.9750, "lng": 30.9468 },
    ],
  },
  {
    "id": 'TRP-20260419-002',
    "date": '2026-04-19',
    "time": '04:20 PM',
    "driverName": 'Sara El-Naggar',
    "zone": 'Zamalek',
    "streetName": '26th July St.',
    "distanceKm": 2.3,
    "cracks": 3,
    "potholes": 1,
    "status": 'Pending',
    "severity": 'Low',
    "lat": 30.0609,
    "lng": 31.2194,
    "defects": [
      { "time": '00:30', "type": 'Crack', "severity": 'Low', "confidence": 0.74, "lat": 30.0612, "lng": 31.2198 },
    ],
  },
  {
    "id": 'TRP-20260418-001',
    "date": '2026-04-18',
    "time": '07:45 AM',
    "driverName": 'Mohamed Fathy',
    "zone": 'New Cairo',
    "streetName": 'Teseen St.',
    "distanceKm": 11.4,
    "cracks": 25,
    "potholes": 11,
    "status": 'Analyzed',
    "severity": 'Critical',
    "lat": 30.0194,
    "lng": 31.4722,
    "defects": [
      { "time": '00:05', "type": 'Pothole', "severity": 'Critical', "confidence": 0.99, "lat": 30.0196, "lng": 31.4726 },
      { "time": '00:50', "type": 'Crack', "severity": 'High', "confidence": 0.92, "lat": 30.0200, "lng": 31.4735 },
      { "time": '01:25', "type": 'Pothole', "severity": 'High', "confidence": 0.94, "lat": 30.0208, "lng": 31.4745 },
      { "time": '02:40', "type": 'Crack', "severity": 'Medium', "confidence": 0.83, "lat": 30.0215, "lng": 31.4760 },
      { "time": '03:10', "type": 'Pothole', "severity": 'Critical', "confidence": 0.96, "lat": 30.0220, "lng": 31.4770 },
      { "time": '04:00', "type": 'Crack', "severity": 'Low', "confidence": 0.77, "lat": 30.0228, "lng": 31.4780 },
    ],
  },
  {
    "id": 'TRP-20260418-002',
    "date": '2026-04-18',
    "time": '01:00 PM',
    "driverName": 'Nour Hassan',
    "zone": 'Giza',
    "streetName": 'Faisal St.',
    "distanceKm": 3.8,
    "cracks": 10,
    "potholes": 6,
    "status": 'Pending',
    "severity": 'High',
    "lat": 30.0131,
    "lng": 31.2089,
    "defects": [
      { "time": '00:18', "type": 'Pothole', "severity": 'High', "confidence": 0.91, "lat": 30.0134, "lng": 31.2093 },
      { "time": '00:55', "type": 'Crack', "severity": 'Medium', "confidence": 0.85, "lat": 30.0140, "lng": 31.2100 },
      { "time": '01:20', "type": 'Pothole', "severity": 'Critical', "confidence": 0.95, "lat": 30.0145, "lng": 31.2108 },
    ],
  },
]

def parse_time(date_str, time_str):
    # '2026-04-21' and '08:32 AM' -> ISO String
    raw = f"{date_str} {time_str}"
    dt = datetime.strptime(raw, "%Y-%m-%d %I:%M %p")
    return dt.isoformat() + "Z"

def seed_db():
    client = MongoClient("mongodb://localhost:27017")
    db = client["roadeye"]
    
    # Drop existing clear data
    db.trips.drop()
    db.defects.drop()
    
    for t in MOCK_TRIPS:
        trip_id = t["id"]
        status = "completed" if t["status"] == "Analyzed" else "processing"
        
        start_time = parse_time(t["date"], t["time"])
        
        # Build route from defect locations + base loc
        route = [[t["lng"], t["lat"]]]
        for d in t["defects"]:
            route.append([d["lng"], d["lat"]])
            
        trip_doc = {
            "trip_id": trip_id,
            "start_time": start_time,
            "end_time": None,
            "status": status,
            "progress": 100 if status == "completed" else 50,
            "route": route,
            "video_filename": f"{trip_id}.mp4",
            "metadata": {
                "driver": t["driverName"],
                "zone": t["zone"],
                "street": t["streetName"],
                "distance": f"{t['distanceKm']} km"
            },
            "analyzed_video_url": None
        }
        db.trips.insert_one(trip_doc)
        
        for d in t["defects"]:
            sev = "High" if d["severity"] == "Critical" else d["severity"]
            
            defect_doc = {
                "defect_id": str(uuid.uuid4()),
                "trip_id": trip_id,
                "defect_type": d["type"],
                "severity": sev,
                "confidence_score": d["confidence"],
                "detected_at": start_time, # Simplify by using start time
                "location": {
                    "type": "Point",
                    "coordinates": [d["lng"], d["lat"]]
                },
                "image_path": None
            }
            db.defects.insert_one(defect_doc)
            
    print(f"Successfully inserted {len(MOCK_TRIPS)} trips and all associated defects.")

if __name__ == "__main__":
    seed_db()
