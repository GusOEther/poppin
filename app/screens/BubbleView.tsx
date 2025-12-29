import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { FirebaseEventService } from '../services/FirebaseEventService';
import { Event } from '../types';
import EventDetailModal from '../components/EventDetailModal';

const { width, height } = Dimensions.get('window');

const BUBBLE_COLORS = ['#00F2FF', '#FF00FF', '#7000FF', '#00FF41', '#FFD700'];

const Bubble = ({ event, color, onPress }: { event: Event, color: string, onPress: (event: Event) => void }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animation
        Animated.spring(scale, {
            toValue: 1,
            tension: 20,
            friction: 7,
            useNativeDriver: true,
            delay: Math.random() * 1000,
        }).start();

        // Floating animation
        const floatAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(translateY, {
                    toValue: -15,
                    duration: 2000 + Math.random() * 1000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 2000 + Math.random() * 1000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );
        floatAnimation.start();
    }, []);

    // Random position within screen bounds
    const left = useRef(Math.random() * (width - 120)).current;
    const top = useRef(Math.random() * (height - 300) + 120).current;
    const size = useRef(85 + Math.random() * 45).current;

    return (
        <Animated.View
            style={[
                styles.bubbleContainer,
                {
                    left,
                    top,
                    transform: [{ scale }, { translateY }],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onPress(event)}
                style={[
                    styles.bubble,
                    {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        backgroundColor: color,
                        shadowColor: color,
                    },
                ]}
            >
                <Text style={styles.bubbleText} numberOfLines={2}>
                    {event.title}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function BubbleView() {
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const eventService = new FirebaseEventService();

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        const data = await eventService.getEvents({
            latitude: 52.268875,
            longitude: 10.526770
        });
        setEvents(data);
    };

    const handlePress = (event: Event) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>What's Poppin'?</Text>
                <Text style={styles.headerSubtitle}>Braunschweig</Text>
            </View>
            <View style={styles.content}>
                {events.map((event, index) => (
                    <Bubble
                        key={event.id}
                        event={event}
                        color={BUBBLE_COLORS[index % BUBBLE_COLORS.length]}
                        onPress={handlePress}
                    />
                ))}
            </View>

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
        backgroundColor: '#0A0A0A', // Deep Black
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 1,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#00F2FF',
        marginTop: 5,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    content: {
        flex: 1,
        position: 'relative',
    },
    bubbleContainer: {
        position: 'absolute',
    },
    bubble: {
        justifyContent: 'center',
        padding: 10,
        elevation: 10,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    bubbleText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
    },
});
