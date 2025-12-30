# Walkthrough: City Search & Security Hardening

We have successfully implemented the manual city search and secured the backend against future API key leaks.

## Key Accomplishments

### 1. Manual City Search
- **Search UI**: Added a toggleable search bar in the header of the `BubbleView`.
- **Dynamic Fetching**: Searching for a new city triggers the "Poppin'..." loading state and calls the backend auto-discovery flow.
- **Auto-Discovery**: Verified that the backend successfully uses Gemini to find events for new cities (e.g., Hannover).

### 2. Security Hardening
- **Key Removal**: Removed the hardcoded (and leaked) API key from `main.py`.
- **Environment Variables**: The backend now securely reads the `GEMINI_API_KEY` from a `.env` file, which is ignored by Git.
- **Stability**: Updated the Gemini model to `gemini-2.0-flash` for better reliability and performance.

### 3. UI Refinements
- **State Management**: Fixed an issue where bubbles from previous cities would linger after a new search.
- **Memory Safety**: Fixed potential memory leaks by correctly managing the `eventService` dependency in React hooks.
- **Lazy Initialization**: Refactored the backend Pub/Sub client to initialize lazily, preventing deployment timeouts and authentication errors during build time.
- **Empty States**: Added a clean "No events" message for cities where no data is found.

### 7. Deployment
The updated backend has been successfully deployed to Firebase. All functions are active and the SWR logic is live.
- **Function URL**: `https://get-events-v1-ogyftm4hgq-uc.a.run.app`
- **Pub/Sub Trigger**: Automatically handles background refreshes for stale cities.

## Verification Results

### Backend Test (Hannover)
The following events were successfully fetched and saved:
- *HCC Silvester Party*
- *Master Self Healing*
- *Ü20 Socialmatch*

> [!NOTE]
> You can now test any city in the web app under http://localhost:8081.
