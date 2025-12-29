import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { FirebaseEventService } from '../services/FirebaseEventService';
import { Event } from '../types';
import EventDetailModal from '../components/EventDetailModal';

const INITIAL_REGION = {
    latitude: 52.268875,
    longitude: 10.526770,
};

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

    const handlePress = (event: Event) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.webHeader}>
                <Text style={styles.webTitle}>Map (Web Placeholder)</Text>
                <Text style={styles.webSubtitle}>Maps are disabled in browser view for this POC.</Text>
            </View>
            <ScrollView style={styles.scroll}>
                {events.map((event) => (
                    <TouchableOpacity
                        key={event.id}
                        style={styles.eventItem}
                        onPress={() => handlePress(event)}
                    >
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventInfo}>{event.category} • {new Date(event.startTime).toLocaleTimeString()}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

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
        backgroundColor: '#111',
        paddingTop: 40,
    },
    webHeader: {
        padding: 20,
        backgroundColor: '#222',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    webTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    webSubtitle: {
        color: '#888',
        fontSize: 14,
        marginTop: 4,
    },
    scroll: {
        flex: 1,
    },
    eventItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    eventTitle: {
        color: '#00F2FF',
        fontSize: 16,
        fontWeight: '600',
    },
    eventInfo: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
    }
});
