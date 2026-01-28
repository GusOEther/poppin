import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { IEventService } from './EventService';
import { Event, GeoPoint } from '../types';

import { USE_EMULATOR, getEmulatorUrl } from './env';

const CLOUD_FUNCTION_URL = USE_EMULATOR
    ? `${getEmulatorUrl(5001)}/poppin-80886/us-central1/get_events_v1`
    : 'https://us-central1-poppin-80886.cloudfunctions.net/get_events_v1';

console.log(`[FirebaseEventService] Mode: ${USE_EMULATOR ? 'EMULATOR' : 'PRODUCTION'}`);

export class FirebaseEventService implements IEventService {
    private city: string;

    constructor(city: string = 'Braunschweig') {
        this.city = city;
    }

    setCity(city: string) {
        this.city = city;
    }

    private lastFetchTrigger: Map<string, number> = new Map();

    // Live Subscription (SWR)
    subscribeToEvents(location: GeoPoint, onUpdate: (events: Event[]) => void): () => void {

        // Trigger the "Stale Check" / Auto-Discovery via HTTP if needed
        // Debounce: Only trigger if we haven't checked for this city in the last 5 seconds
        const now = Date.now();
        const lastTrigger = this.lastFetchTrigger.get(this.city) || 0;

        if (now - lastTrigger > 5000) {
            this.fetchFromCloudFunction().catch(err => console.error("SWR Trigger failed", err));
            this.lastFetchTrigger.set(this.city, now);
        }

        const eventsRef = collection(db, 'events');
        const q = query(
            eventsRef,
            where('city', '==', this.city)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const events = this.parseEvents(snapshot);
            onUpdate(events);
        }, (error) => {
            console.error(`FirebaseEventService: Firestore subscription error for ${this.city}:`, error);
        });

        return unsubscribe;
    }

    async getEvents(location: GeoPoint, radiusKm: number = 10): Promise<Event[]> {

        try {
            // First, try to get events from Firestore
            const eventsRef = collection(db, 'events');
            const q = query(
                eventsRef,
                where('city', '==', this.city)
            );

            let querySnapshot = await getDocs(q);

            // AUTO-DISCOVERY: If no events in Firestore, call Cloud Function to trigger fetch
            if (querySnapshot.empty) {
                console.log(`No events for ${this.city} in Firestore. Triggering auto-discovery...`);
                // If direct fetch is needed without subscription
                const events = await this.fetchFromCloudFunction();
                return events;
            }

            return this.parseEvents(querySnapshot);
        } catch (error) {
            console.error("Error fetching events from Firebase:", error);
            // Fallback to Cloud Function if Firestore fails
            return this.fetchFromCloudFunction();
        }
    }

    private async fetchFromCloudFunction(): Promise<Event[]> {
        try {
            const url = `${CLOUD_FUNCTION_URL}?city=${encodeURIComponent(this.city)}`;
            console.log(`Calling Cloud Function: ${url}`);

            const response = await fetch(url);
            const data = await response.json();

            return data.map((item: any, index: number) => ({
                id: item.id || `cf-${index}`,
                title: item.title || 'Untitled',
                description: item.description || '',
                category: item.category || 'General',
                startTime: item.startTime || new Date().toISOString(),
                location: {
                    latitude: item.location?.latitude || 0,
                    longitude: item.location?.longitude || 0,
                },
                address: item.address || '',
                city: item.city || this.city,
                sourceUrl: item.sourceUrl
            }));
        } catch (error) {
            console.error(`Error fetching ${this.city} from Cloud Function (${CLOUD_FUNCTION_URL}):`, error);
            // If it's a network error (like Connection Refused), response won't exist
            // but we can at least log that it's a network-level issue.
            if (error instanceof Error) {
                console.error("Error message:", error.message);
            }
            return [];
        }
    }

    private parseEvents(querySnapshot: any): Event[] {
        const events: Event[] = [];
        querySnapshot.forEach((doc: any) => {
            const data = doc.data();
            events.push({
                id: doc.id,
                title: data.title || 'Untitled',
                description: data.description || '',
                category: data.category || 'General',
                startTime: data.startTime || new Date().toISOString(),
                location: {
                    latitude: data.location?.latitude || 0,
                    longitude: data.location?.longitude || 0,
                },
                address: data.address || '',
                city: data.city || '',
                sourceUrl: data.sourceUrl
            });
        });
        // Sort by startTime
        events.sort((a, b) => a.startTime.localeCompare(b.startTime));
        return events;
    }
}
