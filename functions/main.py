# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn, options, scheduler_fn, pubsub_fn
from firebase_admin import initialize_app, firestore
from google import genai
from google.cloud import pubsub_v1
import datetime
import json
import requests
import os

# Global app initialization done once
initialize_app()

# Global Pub/Sub Publisher (Initialized lazily)
_publisher = None
PROJECT_ID = os.environ.get("GCLOUD_PROJECT", "poppin-80886")
TOPIC_ID = "fetch-events"

def get_publisher():
    global _publisher
    if _publisher is None:
        _publisher = pubsub_v1.PublisherClient()
    return _publisher

def get_topic_path():
    return get_publisher().topic_path(PROJECT_ID, TOPIC_ID)

def get_db():
    return firestore.client()

# --- Config ---
GEONAMES_USER = os.environ.get("GEONAMES_USER", "poppin") 
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") # Set this in your .env file

def is_cache_stale(events):
    """
    Checks if the events are older than 24 hours.
    Assumes events come from Firestore and have 'fetchedAt'.
    """
    if not events:
        return True
        
    # Check the first event (assuming all batch fetched at same time)
    fetched_at = events[0].get("fetchedAt")
    if not fetched_at:
        return True # Treat missing timestamp as stale
        
    # Handle both string (JSON) and datetime object (direct DB)
    if isinstance(fetched_at, str):
        try:
            fetched_at = datetime.datetime.fromisoformat(fetched_at)
        except ValueError:
            return True

    # Ensure UTC awareness
    if fetched_at.tzinfo is None:
        fetched_at = fetched_at.replace(tzinfo=datetime.timezone.utc)
        
    now = datetime.datetime.now(datetime.timezone.utc)
    delta = now - fetched_at
    
    # Stale if older than 24h
    return delta.total_seconds() > 86400

def find_nearby_cities(lat, lng, radius_km=50):
    """
    Queries GeoNames for cities > 15k inhabitants.
    """
    url = "http://api.geonames.org/findNearbyPlaceNameJSON"
    params = {
        "lat": lat,
        "lng": lng,
        "radius": radius_km,
        "maxRows": 5,
        "cities": "cities15000",
        "username": GEONAMES_USER
    }
    try:
        response = requests.get(url, params=params)
        return response.json().get("geonames", [])
    except Exception as e:
        print(f"GeoNames Error: {e}")
        return []

def fetch_events_via_gemini(city_name):
    """
    Uses Gemini 1.5 with Search Grounding to find events using the new google.genai library.
    """
    if not GEMINI_API_KEY:
        return {"error": "GEMINI_API_KEY not set"}
    
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    prompt = f"""
    Find as many upcoming events as possible in {city_name} for the next 7 days.
    Aim for at least 30 events if available.
    Include: Title, Date, Location, Category, and a short Description.
    Return the result ONLY as a JSON list of objects.
    Keys: 'title', 'description', 'category', 'startTime', 'address'.
    """
    
    try:
        # Try with Google Search Grounding using the working model found
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                'tools': [{'google_search': {}}]
            }
        )
        return response.text
    except Exception as e:
        print(f"Gemini (with tools) Error: {e}. Retrying without tools...")
        try:
            # Fallback without tools if grounding fails
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e2:
            print(f"Gemini (no tools) Error: {e2}")
            return str(e2)

# Track topic existence to avoid redundant creation attempts
_topic_checked = False

@https_fn.on_request()
def get_events_v1(req: https_fn.Request) -> https_fn.Response:
    """
    API Endpoint: Returns events for a location. 
    Implements Stale-While-Revalidate (SWR).
    """
    global _topic_checked
    
    # Accept city directly or fall back to lat/lng lookup
    city = req.args.get("city")
    lat = req.args.get("lat")
    lng = req.args.get("lng")
    
    # If no city provided, try to resolve from coordinates via GeoNames
    if not city:
        if lat and lng:
            nearby = find_nearby_cities(float(lat), float(lng), radius_km=30)
            if nearby:
                city = nearby[0].get("name", "Braunschweig")
            else:
                city = "Braunschweig"  # Default fallback
        else:
            city = "Braunschweig"  # Default for POC
    
    # Query for existing events
    events_ref = get_db().collection("events").where("city", "==", city)
    docs = list(events_ref.stream())
    
    events = [doc.to_dict() for doc in docs]
    
    # SWR Strategy:
    # 1. No Data OR Force Refresh -> Synchronous Fetch (Wait)
    # 2. Data Exists but Stale -> Background Fetch (Trigger PubSub) + Return Stale Data
    # 3. Data Fresh -> Return Data
    
    force_refresh = req.args.get("force") == "true"
    
    if not docs or force_refresh:
        print(f"SWR: Fetching fresh events for '{city}' (Force: {force_refresh})...")
        raw_response = fetch_events_via_gemini(city)
        count = process_and_save_events(city, raw_response)
        print(f"SWR: Saved {count} events via sync fetch.")
        # Re-fetch after saving
        docs = list(events_ref.stream())
        events = [doc.to_dict() for doc in docs]
    
    elif is_cache_stale(events):
        print(f"SWR: Data for '{city}' is stale. Triggering background update...")
        try:
            # Ensure topic exists before publishing (lazy creation, once per instance)
            if not _topic_checked:
                try:
                    get_publisher().create_topic(request={"name": get_topic_path()})
                    print(f"SWR: Created Pub/Sub topic: {TOPIC_ID}")
                except Exception:
                    # Topic likely already exists
                    pass
                _topic_checked = True

            message_json = json.dumps({"city": city}).encode("utf-8")
            future = get_publisher().publish(get_topic_path(), message_json)
            # future.result() # Do not wait for result to keep API fast
        except Exception as e:
            print(f"SWR PubSub Error: {e}")
            
    events.sort(key=lambda x: str(x.get("startTime", "0")))
        
    return https_fn.Response(
        json.dumps(events, default=str),
        mimetype="application/json",
        headers={"Access-Control-Allow-Origin": "*"}  # CORS for frontend
    )

def process_and_save_events(city_name, raw_response):
    """
    Parses Gemini response and saves structured events to Firestore.
    """
    # Simple extraction of JSON from Markdown (Gemini often wraps in ```json)
    json_str = raw_response
    if "```json" in raw_response:
        json_str = raw_response.split("```json")[1].split("```")[0].strip()
    elif "```" in raw_response:
        json_str = raw_response.split("```")[1].split("```")[0].strip()
        
    try:
        events = json.loads(json_str)
    except Exception as e:
        print(f"JSON Parse Error: {e}. Raw: {raw_response[:200]}")
        return 0
        
    batch = get_db().batch()
    for event_data in events:
        # Create a unique ID based on title and address to avoid simple duplicates
        title = event_data.get('title', 'Unknown')
        address = event_data.get('address', 'Unknown')
        event_id = f"{city_name}_{title}_{address}".replace(" ", "_").replace("/", "_")
        doc_ref = get_db().collection("events").document(event_id)
        
        event_data["city"] = city_name
        event_data["fetchedAt"] = datetime.datetime.now(datetime.timezone.utc)
        
        batch.set(doc_ref, event_data, merge=True)
        
    batch.commit()
    return len(events)

@pubsub_fn.on_message_published(topic="fetch-events")
def fetch_events_for_city_pubsub_v1(event: pubsub_fn.CloudEvent[pubsub_fn.MessagePublishedData]) -> None:
    """
    Triggered via Pub/Sub to fetch events for a specific city.
    Performs a 'clean sweep': Deletes old events -> Fetches new -> Saves new.
    """
    try:
        data = event.data.message.json
        city_name = data.get("city")
        if not city_name:
            return
            
        print(f"PubSub: Starting background update for {city_name}...")
        
        # 1. Delete all existing events for this city to prevent duplicates/stale data
        events_ref = get_db().collection("events").where("city", "==", city_name)
        docs = list(events_ref.stream())
        
        if docs:
            batch = get_db().batch()
            for doc in docs:
                batch.delete(doc.reference)
            batch.commit()
            print(f"PubSub: Deleted {len(docs)} old events for {city_name}.")
            
        # 2. Fetch fresh data
        raw_response = fetch_events_via_gemini(city_name)
        count = process_and_save_events(city_name, raw_response)
        print(f"PubSub: Successfully saved {count} NEW events for {city_name}.")
        
    except Exception as e:
        print(f"PubSub Error: {e}")

@https_fn.on_call()
def trigger_fetch_v1(req: https_fn.CallableRequest) -> dict:
    """
    Manually trigger a fetch and SAVE for a city (for debugging/POC).
    """
    city_name = req.data.get("city", "Braunschweig")
    
    try:
        raw_response = fetch_events_via_gemini(city_name)
        count = process_and_save_events(city_name, raw_response)
        return {
            "city": city_name, 
            "count": count,
            "raw_response": raw_response[:500] + "..." # Truncate for response
        }
    except Exception as e:
        return {"error": str(e)}

@scheduler_fn.on_schedule(schedule="every 6 hours")
def scheduled_event_fetch_v1(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Runs every 6 hours and triggers a fetch for 'active' cities.
    """
    cities_ref = get_db().collection("cities").where("status", "==", "active")
    for city_doc in cities_ref.stream():
        city_name = city_doc.to_dict().get("name")
        print(f"Scheduled fetch triggered for {city_name}")
