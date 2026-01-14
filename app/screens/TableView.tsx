import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, FlatList, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FirebaseEventService } from '../services/FirebaseEventService';
import { Event } from '../types';
import EventDetailModal from '../components/EventDetailModal';

export default function TableView() {
    const [events, setEvents] = useState<Event[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // We can default to Braunschweig for now, or use location if available
    const eventService = new FirebaseEventService("Braunschweig");

    const loadEvents = async () => {
        // Just load for a default location/city for now
        // In a real app we might want to sync the city with BubbleView
        const data = await eventService.getEvents({
            latitude: 52.268875,
            longitude: 10.526770
        });
        // Sort by time
        data.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        setEvents(data);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadEvents();
        setRefreshing(false);
    };

    useEffect(() => {
        loadEvents();
    }, []);

    const handlePress = (event: Event) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    const renderItem = ({ item }: { item: Event }) => (
        <View style={styles.row}>
            <View style={styles.timeContainer}>
                <Text style={styles.timeText}>
                    {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.dateText}>
                    {new Date(item.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </Text>
            </View>
            <View style={styles.detailsContainer}>
                <Text style={styles.titleText}>{item.title}</Text>
                <Text style={styles.categoryText}>{item.category} • {item.location.address || 'Unknown Location'}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#050812', '#0C0E28', '#0A0A0A']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Events List</Text>
            </View>

            <FlatList
                contentContainerStyle={styles.listContent}
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FFF" />
                }
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

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
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(20, 20, 30, 0.8)',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
    },
    listContent: {
        paddingBottom: 40,
    },
    row: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
    },
    timeContainer: {
        width: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: 'rgba(255,255,255,0.1)',
        paddingRight: 10,
        marginRight: 15,
    },
    timeText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    dateText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    detailsContainer: {
        flex: 1,
    },
    titleText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 4,
    },
    categoryText: {
        fontSize: 14,
        color: '#AAA',
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginLeft: 105,
    }
});
