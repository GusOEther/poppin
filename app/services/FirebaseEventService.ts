import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import { IEventService } from './EventService';
import { Event, GeoPoint } from '../types';

const CLOUD_FUNCTION_URL = 'https://get-events-v1-ogyftm4hgq-uc.a.run.app';

export class FirebaseEventService implements IEventService {
    private city: string;

    constructor(city: string = 'Braunschweig') {
        this.city = city;
    }

    async getEvents(location: GeoPoint, radiusKm: number = 10): Promise<Event[]> {
        console.log(`FirebaseEventService: Fetching events for ${this.city}`);

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
            console.error("Error fetching from Cloud Function:", error);
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
