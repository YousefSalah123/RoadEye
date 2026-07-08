"""
RoadEye — MongoDB Connection Module

Manages the async MongoDB connection lifecycle using Motor.
Provides singleton access to the 'roadeye' database and its collections.
"""

import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ─── MongoDB Configuration ──────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

# ─── Singleton Client & Database ────────────────────────────────
_client: AsyncIOMotorClient = AsyncIOMotorClient(MONGO_URI)
db = _client["roadeye"]
trips_collection = db["trips"]
defects_collection = db["defects"]


async def connect_db() -> None:
    """
    Verify the MongoDB connection and set up collections/indexes.
    Called once during FastAPI startup.
    """
    logger.info("Connecting to MongoDB Atlas...")

    # Verify the connection is alive
    try:
        await _client.admin.command("ping")
        logger.info("✅ MongoDB Atlas connection verified.")
    except Exception as e:
        logger.error(f"❌ MongoDB connection failed: {e}")
        raise

    # Create a 2dsphere index on defect locations for geospatial queries
    await defects_collection.create_index([("location", "2dsphere")])
    logger.info("MongoDB collections and indexes initialized.")


def close_db() -> None:
    """Close the MongoDB connection. Called during FastAPI shutdown."""
    global _client
    if _client is not None:
        _client.close()
        logger.info("MongoDB connection closed.")
