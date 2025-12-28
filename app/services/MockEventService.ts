import { IEventService } from './EventService';
import { Event, GeoPoint } from '../types';

export class MockEventService implements IEventService {
    async getEvents(location: GeoPoint, radiusKm: number = 10): Promise<Event[]> {
        console.log("MockEventService: Fetching events for", location);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        return [
            {
                id: '1',
                title: 'Nils Wogram & Mathias Claus | Weihnachtsjazz',
                description: 'A classic Christmas jazz event.',
                category: 'Jazz, Music',
                startTime: '2025-12-29T20:30:00.000Z',
                location: { latitude: 52.260, longitude: 10.520 },
                address: 'Lindenhof-Theater, Braunschweig',
                city: 'Braunschweig',
                sourceUrl: 'https://example.com/event1'
            },
            {
                id: '2',
                title: 'Basketball Löwen Braunschweig - FC Bayern München Basketball',
                description: 'Basketball match in the Volkswagen Halle.',
                category: 'Sport, Basketball',
                startTime: '2026-01-04T18:00:00.000Z',
                location: { latitude: 52.253, longitude: 10.522 },
                address: 'Volkswagen Halle, Braunschweig',
                city: 'Braunschweig',
                sourceUrl: 'https://example.com/event2'
            },
            {
                id: '3',
                title: 'New Year\'s Eve Party',
                description: 'Celebrate the new year with us!',
                category: 'Party',
                startTime: '2025-12-31T22:00:00.000Z',
                location: { latitude: 52.264, longitude: 10.526 },
                address: 'Schlossplatz, Braunschweig',
                city: 'Braunschweig'
            }
        ];
    }
}
