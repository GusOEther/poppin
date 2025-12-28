export interface GeoPoint {
    latitude: number;
    longitude: number;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    category: string;
    startTime: string; // ISO String
    endTime?: string;
    location: GeoPoint;
    address: string;
    city: string;
    sourceUrl?: string;
}

export interface City {
    id: string;
    name: string;
    location: GeoPoint;
    radiusKm: number;
    status: 'active' | 'pending' | 'disabled';
}
