# The Cloud Functions for Firebase SDK to create Cloud Functions and set up triggers.
from firebase_functions import https_fn, options, scheduler_fn, pubsub_fn
from firebase_admin import initialize_app, firestore
from google import genai
import datetime
import json
import requests
import os

# Global app initialization done once
initialize_app()

def get_db():
    return firestore.client()

# --- Config ---
GEONAMES_USER = os.environ.get("GEONAMES_USER", "poppin") 
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") # Set this in your .env file

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
    Find upcoming events in {city_name} for the next 7 days.
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

@https_fn.on_request()
def get_events_v1(req: https_fn.Request) -> https_fn.Response:
    """
    API Endpoint: Returns events for a location. 
    Triggers discovery if city has no events.
    """
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
    
    # AUTO-DISCOVERY: If no events found, trigger Gemini fetch
    if not docs:
        print(f"Auto-Discovery v2: No events for '{city}'. Fetching via Gemini...")
        raw_response = fetch_events_via_gemini(city)
        count = process_and_save_events(city, raw_response)
        print(f"Auto-Discovery: Saved {count} events for '{city}'.")
        # Re-fetch after saving
        docs = list(events_ref.stream())
    
    events = [doc.to_dict() for doc in docs]
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
    """
    try:
        data = event.data.message.json
        city_name = data.get("city")
        if not city_name:
            return
            
        raw_response = fetch_events_via_gemini(city_name)
        count = process_and_save_events(city_name, raw_response)
        print(f"Successfully saved {count} events for {city_name}.")
        
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
