# Implementation Plan: Stale-While-Revalidate & Live Updates

Implement a "Stale-While-Revalidate" strategy to ensure instant page loads with background refreshing for events.

## Strategy
1.  **Frontend (Read)**: Subscribe to Firestore changes (`onSnapshot`) instead of one-time fetching.
2.  **Backend (Read)**:
    - If data exists: Return immediately (fast).
    - If data is "stale" (> 24h): Trigger a background refresh (Pub/Sub) but still return old data to unblock the UI.
    - If no data: Sync fetch (loading state).
3.  **Backend (Write)**: Background worker fetches new data, clears old events for the city, and writes new ones.
4.  **Frontend (Update)**: Firestore listener detects the write, updates the UI, and resets the view (closes modals).

## Proposed Changes

### [Backend] Cloud Functions
#### [MODIFY] [requirements.txt](file:///home/mark/projects/poppin/functions/requirements.txt)
- Add `google-cloud-pubsub` to allow publishing messages.

#### [MODIFY] [main.py](file:///home/mark/projects/poppin/functions/main.py)
- **New Helper**: `is_cache_stale(events)` function.
- **Update endpoint**: `get_events_v1` checks for staleness.
  - If stale -> `publisher.publish(topic, city)` -> return `events`.
- **Refine Pub/Sub**: Update `fetch_events_for_city_pubsub_v1` to perform cleanup (delete old events) before saving new ones.

### [Frontend] App
#### [MODIFY] [FirebaseEventService.ts](file:///home/mark/projects/poppin/app/services/FirebaseEventService.ts)
- Add `subscribeToEvents(location, onUpdate)` method using `onSnapshot`.
- Deprecate or modify `getEvents` to support the initial HTTP trigger call.

#### [MODIFY] [BubbleView.tsx](file:///home/mark/projects/poppin/app/screens/BubbleView.tsx)
- Use `useEffect` to call `eventService.subscribeToEvents`.
- In the subscription callback:
  - `setEvents(newEvents)`
  - `setModalVisible(false)` (Reset to main screen on update).

## Verification Plan
1.  **Search existing city**: Should load *instantly*.
2.  **Background Update**: Wait 10-20s. Console should show "PubSub triggered".
3.  **Live Refresh**: UI should blink/refresh with new bubbles automatically.
