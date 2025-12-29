# Task: Poppin Project

- [x] Analyze current project state
- [x] Recover detailed implementation plan from previous session
- [x] Create persistent backup of plan and tasks in WSL
- [x] Backend Setup (Python 2nd Gen)
    - [x] Setup Firebase Project & Blaze Plan verification
    - [x] Initialize Python Cloud Functions environment
    - [x] Configure Firestore with `/cities` and `/events` skeletons
    - [x] Implement Unit Tests (pytest verified ✓)
- [x] Core Logic Implementation
    - [x] Implement GeoNames Discovery (findNearby_cities)
    - [x] Implement Gemini Fetch (Search Grounding) for Braunschweig
    - [x] Implement City-Snapping algorithm
- [x] Verification
    - [x] Test Braunschweig fetch manually
    - [x] Verify Firestore population

- [x] Frontend Development (Expo / React Native)
    - [x] Initialize Expo Project (TypeScript, Blank Template)
    - [x] Setup Architecture (Services/API Layer)
        - [x] Create `EventService` Interface
        - [x] Implement `MockEventService` (UI Dev)
        - [x] Implement `FirebaseEventService` (Prod)
    - [x] Implement UI (Mock-Mode)
        - [x] Map View Component
        - [x] Design Bubble View (Neon Nights Selected)
        - [x] Bubble View Component (The "Poppin" Style)
        - [x] View Switcher (Toggle between Map/Bubbles)
        - [x] Event Detail Modal
    - [x] Integrate Real Backend
        - [x] Implement `FirebaseEventService` (Prod)
        - [x] Switch UI to use `FirebaseEventService`
    - [x] Final Polish
        - [x] Event Detail Modal
        - [x] Smooth transitions between Map/Bubbles
        - [x] Web compatibility placeholder (MapScreen.web.tsx)

- [x] Auto-Discovery Flow
    - [x] Update `get_events_v1` to trigger Gemini fetch if no events exist
    - [x] Update `FirebaseEventService` to call Cloud Function if Firestore is empty
    - [x] Deploy and test (Full backend sync verified ✓)

- [x] UI Refinement (Neon Nights Mockup Match)
    - [x] Install `expo-linear-gradient`
    - [x] Refine `BubbleView.tsx` (Gradients, Glassmorphism, Header)
    - [x] Refine `App.tsx` (Glassmorphic Tab Bar, Icons)
    - [x] Verify visual match with mockup (User confirmed ✓)

- [ ] Focus: Bubble Experience & Search
    - [ ] Implement manual City Search (to trigger auto-discovery for any location)
    - [ ] Optimize Bubble animations (physics/interactions)
    - [ ] Refine Web-Mobile parity for Bubbles (interactions) 

> **Note:** Map View features are deprioritized.
> **Note:** Update backups in `docs/` folder periodically!
