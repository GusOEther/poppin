import { Event, GeoPoint } from '../types';

export interface IEventService {
    getEvents(location: GeoPoint, radiusKm?: number): Promise<Event[]>;
}
