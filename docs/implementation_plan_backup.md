# Implementation Plan: Auto-Discovery Flow

When the app requests events for a city that has no data, the system should automatically trigger a fetch from the Gemini API, save the results, and return them to the UI.

### [Backend] Cloud Functions (Python)
- **`get_events_v1`**: API endpoint with auto-discovery (Gemini-fetch if zero results). Correctly handles CORS for web.
- **`fetch_events_via_gemini`**: Core logic for event search with grounding.
- **`process_and_save_events`**: Parses and stores events in Firestore.

### [Frontend] Expo Web & Mobile
- **`BubbleView.tsx`**: Interactive floating bubbles with "Neon Nights" design.
- **`MapScreen.tsx`**: Map view for mobile (native) and list-placeholder for web.
- **`EventDetailModal.tsx`**: Unified detail view for both mobile and web.
- **`FirebaseEventService.ts`**: Handles Firestore data and triggers auto-discovery API.

#### [MODIFY] [main.py](file:///home/mark/projects/poppin/functions/main.py)

Update `get_events_v1` to:
1. Accept `city` parameter (or resolve it from lat/lng via GeoNames).
2. Check if events exist for that city.
3. If **no events found**: Synchronously call `fetch_events_via_gemini()` and `process_and_save_events()`.
4. Return the newly fetched (or existing) events to the caller.

```diff
@https_fn.on_request()
def get_events_v1(req: https_fn.Request) -> https_fn.Response:
    city = req.args.get("city", "Braunschweig")  # Default for POC
    
    # Check for existing events
    events_ref = get_db().collection("events").where("city", "==", city)
    docs = list(events_ref.stream())
    
    if not docs:
        # No events found -> trigger discovery
        raw_response = fetch_events_via_gemini(city)
        process_and_save_events(city, raw_response)
        # Re-fetch after saving
        docs = list(events_ref.stream())
    
    events = [doc.to_dict() for doc in docs]
    return https_fn.Response(json.dumps(events, default=str), mimetype="application/json")
```

---

### [Component] [Frontend - Services]

#### [MODIFY] [FirebaseEventService.ts](file:///home/mark/projects/poppin/app/services/FirebaseEventService.ts)

Update to:
1. Accept a `city` parameter.
2. If Firestore returns **zero results**, call the Cloud Functions API endpoint to trigger discovery.
3. Return the newly fetched events.

---

## Proposed UI Refinement (Neon Nights)

### [Component] [Frontend - Dependencies]
- [NEW] Install `expo-linear-gradient` for bubble gradients.
- [NEW] Ensure `@expo/vector-icons` is available for the tab bar.

### [Component] [Frontend - BubbleView.tsx]
- [MODIFY] Update header: Bold "What's poppin'", add search icon.
- [MODIFY] Update Bubble:
  - Add `LinearGradient` background.
  - Add semi-transparent frosted glass border (outer ring).
  - Use bolder typography.
- [MODIFY] Background: Add deep dark gradient.

### [Component] [Frontend - App.tsx]
- [MODIFY] Update Tab Bar:
  - Implement frosted glass effect (blur/semi-transparency).
  - Use icons instead of text.
  - Add active state glow.

## Verification Plan

### Manual Verification
1. Compare the UI in the app with the provided mockup image.
2. Verify that gradients, typography, and glassmorphism effects match.
3. Check the tab bar icons and active states.
