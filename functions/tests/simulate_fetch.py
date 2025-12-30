import os
import json
from google import genai

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def fetch_simulation(city_name):
    load_env()
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        print("Error: GEMINI_API_KEY not found in .env")
        return

    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    Find upcoming events in {city_name} for the next 7 days.
    Include: Title, Date, Location, Category, and a short Description.
    Return the result ONLY as a JSON list of objects.
    Keys: 'title', 'description', 'category', 'startTime', 'address'.
    """
    
    print(f"--- Simulating Fetch for: {city_name} ---")
    print(f"Model: gemini-2.5-flash")
    print(f"Grounding: Google Search enabled")
    print("------------------------------------------\n")

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={
                'tools': [{'google_search': {}}]
            }
        )
        
        # Extract JSON
        raw_text = response.text
        json_str = raw_text
        if "```json" in raw_text:
            json_str = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            json_str = raw_text.split("```")[1].split("```")[0].strip()
            
        try:
            data = json.loads(json_str)
            print(json.dumps(data, indent=2, ensure_ascii=False))
            print(f"\n--- Success: Found {len(data)} events ---")
        except:
            print("Response was not valid JSON. Raw output:")
            print(raw_text)
            
    except Exception as e:
        print(f"Error during Gemini call: {e}")

if __name__ == "__main__":
    import sys
    city = sys.argv[1] if len(sys.argv) > 1 else "Hannover"
    fetch_simulation(city)
