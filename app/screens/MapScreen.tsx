import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { MockEventService } from '../services/MockEventService';
import { Event } from '../types';

const INITIAL_REGION = {
    latitude: 52.268875,
    longitude: 10.526770, // Braunschweig City Center
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

export default function MapScreen() {
    const [events, setEvents] = useState<Event[]>([]);
    const eventService = new MockEventService();

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        const data = await eventService.getEvents({
            latitude: INITIAL_REGION.latitude,
            longitude: INITIAL_REGION.longitude
        });
        setEvents(data);
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={INITIAL_REGION}
                showsUserLocation
                showsMyLocationButton
            >
                {events.map((event) => (
                    <Marker
                        key={event.id}
                        coordinate={{
                            latitude: event.location.latitude,
                            longitude: event.location.longitude,
                        }}
                        pinColor="blue" // Poppin brand color candidate
                    >
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={styles.title}>{event.title}</Text>
                                <Text style={styles.time}>{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                <Text style={styles.category}>{event.category}</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        width: '100%',
        height: '100%',
    },
    callout: {
        padding: 5,
        minWidth: 150,
        maxWidth: 250
    },
    title: {
        fontWeight: 'bold',
        fontSize: 14,
        marginBottom: 2
    },
    time: {
        fontSize: 12,
        color: '#666'
    },
    category: {
        fontSize: 10,
        color: '#007AFF',
        marginTop: 2
    }
});
