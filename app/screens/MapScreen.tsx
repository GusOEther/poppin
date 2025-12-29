import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { FirebaseEventService } from '../services/FirebaseEventService';
import { Event } from '../types';
import EventDetailModal from '../components/EventDetailModal';

const INITIAL_REGION = {
    latitude: 52.268875,
    longitude: 10.526770, // Braunschweig City Center
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
};

// Simple dark mode style for Google Maps
const DARK_MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function MapScreen() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const eventService = new FirebaseEventService();

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

    const handleMarkerPress = (event: Event) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                initialRegion={INITIAL_REGION}
                customMapStyle={DARK_MAP_STYLE}
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
                        pinColor="#00F2FF"
                        onCalloutPress={() => handleMarkerPress(event)}
                    >
                        <Callout>
                            <View style={styles.callout}>
                                <Text style={styles.title}>{event.title}</Text>
                                <Text style={styles.time}>{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                <Text style={styles.category}>{event.category}</Text>
                                <Text style={styles.tapTip}>Tap for details</Text>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>

            <EventDetailModal
                event={selectedEvent}
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
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
    },
    tapTip: {
        fontSize: 9,
        color: '#999',
        fontStyle: 'italic',
        marginTop: 4,
        textAlign: 'right'
    }
});
