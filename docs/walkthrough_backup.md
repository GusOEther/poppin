# Poppin Walkthrough: Auto-Discovery & Web Support

The Poppin MVP is now significantly more robust with the addition of automatic event discovery and browser compatibility.

## Core Features Implemented

### 1. Auto-Discovery Flow (Gemini + Firestore)
When a user requests events for a city that isn't in our database yet (or has no events), the system automatically triggers an AI-powered search.
- **How it works**: If `get_events_v1` finds 0 results, it calls Gemini 1.5 with Search Grounding to find real-time events, stores them in Firestore, and returns them to the user in a single request.
- **Proof of Work**: Tested with Braunschweig (existing data) and triggered for new locations.

### 2. Dual-Platform Support (Web & Mobile)
The app now runs both on mobile (Expo Go) and in the browser.
- **Web**: Accessible via tunnel URL. Includes a `MapScreen.web.tsx` placeholder to avoid native map dependencies while keeping the core "Bubble View" interactive.
- **Mobile**: Full map integration with "Neon Nights" dark mode.

### 3. Interactive UI (Neon Nights Final)
- **Bubble View**: Implemented rich color gradients, outer frosted glass rings, and fluid floating animations.
- **Glassmorphic Tab Bar**: Floating bottom navigation with icons (Home, Search, Calendar, Profile), background blur, and active-state glow effects.
- **Visual Polish**: Unified the app with a deep dark gradient background and bold typography.

## Technical Verification
- **Unit Tests**: All 4 backend tests passing.
- **Live Preview**: Verified on both mobile (Expo Go) and web (Tunnel URL).

## Next Steps
- Real-time location snapping for users.
- Improved error handling for AI-fetching edge cases.
- Production-ready styling for the web map placeholder.
