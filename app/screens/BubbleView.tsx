import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, Easing, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseEventService } from '../services/FirebaseEventService';
import { Event } from '../types';
import EventDetailModal from '../components/EventDetailModal';

const { width, height } = Dimensions.get('window');

const BUBBLE_CONFIGS = [
    { colors: ['#FF1B6B', '#45CAFF'], shadow: '#FF1B6B' },
    { colors: ['#FF00FF', '#7000FF'], shadow: '#FF00FF' },
    { colors: ['#FFD700', '#FF8C00'], shadow: '#FFD700' },
    { colors: ['#00F2FF', '#007AFF'], shadow: '#00F2FF' },
    { colors: ['#FF5F6D', '#FFC371'], shadow: '#FF5F6D' },
];

const Bubble = ({ event, config, onPress }: { event: Event, config: any, onPress: (event: Event) => void }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: 1,
            tension: 15,
            friction: 6,
            useNativeDriver: true,
            delay: Math.random() * 800,
        }).start();

        const floatAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(translateY, {
                    toValue: -20,
                    duration: 2500 + Math.random() * 1500,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: 2500 + Math.random() * 1500,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );
        floatAnimation.start();
    }, []);

    const left = useRef(Math.random() * (width - 140) + 10).current;
    const top = useRef(Math.random() * (height - 400) + 150).current;
    const size = useRef(100 + Math.random() * 60).current;

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
                activeOpacity={0.9}
                onPress={() => onPress(event)}
                style={[
                    styles.outerRing,
                    {
                        width: size + 24,
                        height: size + 24,
                        borderRadius: (size + 24) / 2,
                    }
                ]}
            >
                <LinearGradient
                    colors={config.colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.bubble,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            shadowColor: config.shadow,
                        },
                    ]}
                >
                    <Text style={styles.bubbleText} numberOfLines={2}>
                        {event.title}
                    </Text>
                </LinearGradient>
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
            <LinearGradient
                colors={['#050812', '#0C0E28', '#0A0A0A']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.header}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
                <Ionicons name="search" size={24} color="#FFF" />
            </View>

            <View style={styles.titleContainer}>
                <Text style={styles.headerTitle}>What's</Text>
                <Text style={styles.headerTitle}>poppin'</Text>
            </View>

            <View style={styles.content}>
                {events.map((event, index) => (
                    <Bubble
                        key={event.id}
                        event={event}
                        config={BUBBLE_CONFIGS[index % BUBBLE_CONFIGS.length]}
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
        backgroundColor: '#0A0A0A',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 50,
        paddingHorizontal: 25,
    },
    titleContainer: {
        paddingHorizontal: 25,
        paddingTop: 20,
    },
    headerTitle: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        lineHeight: 52,
    },
    content: {
        flex: 1,
        position: 'relative',
    },
    bubbleContainer: {
        position: 'absolute',
    },
    outerRing: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    bubble: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 10,
    },
    bubbleText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});
