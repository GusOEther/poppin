import os
import json
import datetime
from google import genai
import firebase_admin
from firebase_admin import credentials, firestore

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def clean_sweep_hannover():
    load_env()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found")
        return

    # Initialize Firebase
    try:
        firebase_admin.initialize_app()
    except ValueError:
        pass # Already initialized
    
    db = firestore.client()
    city = "Hannover"

    # 1. Delete old events
    print(f"Deleting old events for {city}...")
    docs = db.collection("events").where("city", "==", city).stream()
    count_deleted = 0
    batch = db.batch()
    for doc in docs:
        batch.delete(doc.reference)
        count_deleted += 1
    if count_deleted > 0:
        batch.commit()
    print(f"Deleted {count_deleted} events.")

    # 2. Fetch new events
    client = genai.Client(api_key=api_key)
    prompt = f"""
    Find upcoming events in {city} for the next 7 days.
    Include: Title, Date, Location, Category, and a short Description.
    Return the result ONLY as a JSON list of objects.
    Keys: 'title', 'description', 'category', 'startTime', 'address'.
    """
    
    print(f"Fetching new events via Gemini...")
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={'tools': [{'google_search': {}}]}
    )
    
    raw_text = response.text
    json_str = raw_text
    if "```json" in raw_text:
        json_str = raw_text.split("```json")[1].split("```")[0].strip()
    elif "```" in raw_text:
        json_str = raw_text.split("```")[1].split("```")[0].strip()
    
    events = json.loads(json_str)

    # 3. Save new events
    print(f"Saving {len(events)} new events to Firestore...")
    batch = db.batch()
    for event_data in events:
        title = event_data.get('title', 'Unknown')
        address = event_data.get('address', 'Unknown')
        event_id = f"{city}_{title}_{address}".replace(" ", "_").replace("/", "_")
        doc_ref = db.collection("events").document(event_id)
        
        event_data["city"] = city
        event_data["fetchedAt"] = datetime.datetime.now(datetime.timezone.utc)
        batch.set(doc_ref, event_data, merge=True)
    
    batch.commit()
    print("Done! Hannover is now up-to-date.")

if __name__ == "__main__":
    clean_sweep_hannover()
