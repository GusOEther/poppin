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




// Helper function to generate balanced bubble positions in a staggered layout
const generateBubblePositions = (events: Event[], screenWidth: number, screenHeight: number) => {
    const bubbles: {
        event: Event | null;
        x: number;
        y: number;
        size: number;
        isPlaceholder: boolean;
        config: any
    }[] = [];

    // Start BELOW the header/title area
    const startY = 180; // Moved up slightly to use more space
    const endY = screenHeight - 110;
    const availableHeight = endY - startY;

    // Fixed row height
    const rowHeight = 120; // Slightly tighter packing
    const numRows = Math.floor(availableHeight / rowHeight);

    let eventIndex = 0;

    for (let row = 0; row < numRows; row++) {
        const isStaggered = row % 2 === 1;
        const colsInRow = isStaggered ? 2 : 3;
        const cellWidth = screenWidth / (colsInRow + (isStaggered ? 1 : 0));
        const rowOffset = isStaggered ? cellWidth : cellWidth / 2;

        for (let col = 0; col < colsInRow; col++) {
            // Determine if this specific slot should be a placeholder
            // We want to intersperse them, but prioritize showing all events
            const remainingEvents = events.length - eventIndex;

            // Logic:
            // 1. If we have no events left, it MUST be a placeholder
            // 2. If we have plenty of events, we can afford to skip a slot occasionally for aesthetics
            // 3. We use a predictable pattern to create "gaps" (placeholders)

            const isPatternPlaceholder = (row * 3 + col) % 5 === 3; // Every 5th bubbles is a placeholder effectively

            // Should this be an event?
            // Yes, if we have events, UNLESS it's a pattern placeholder AND we have enough slots left for the remaining events
            const slotsRemaining = (numRows * 2.5) - (bubbles.length + 1); // rough estimate
            const canSkip = remainingEvents < slotsRemaining;

            const isEventSlot = remainingEvents > 0 && (!isPatternPlaceholder || !canSkip);

            const isPlaceholder = !isEventSlot;

            // Base position
            let x = rowOffset + col * cellWidth;
            let y = startY + row * rowHeight + rowHeight / 2;

            // Controlled jitter - more organic
            x += (Math.random() - 0.5) * cellWidth * 0.4;
            y += (Math.random() - 0.5) * rowHeight * 0.4;

            // Size
            const size = isPlaceholder
                ? 50 + Math.random() * 40 // Placeholders: 50-90
                : 95 + Math.random() * 35; // Events: 95-130

            // Configuration for colors
            const configIndex = (row * 3 + col) % BUBBLE_CONFIGS.length;
            const config = BUBBLE_CONFIGS[configIndex];

            if (isEventSlot) {
                bubbles.push({
                    event: events[eventIndex],
                    x,
                    y,
                    size,
                    isPlaceholder: false,
                    config
                });
                eventIndex++;
            } else {
                bubbles.push({
                    event: null,
                    x,
                    y,
                    size,
                    isPlaceholder: true,
                    config
                });
            }
        }
    }

    return bubbles;
};

const Bubble = ({ item, onPress }: {
    item: { event: Event | null; x: number; y: number; size: number; isPlaceholder: boolean; config: any },
    onPress: ((event: Event) => void) | null
}) => {
    const scale = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: 1,
            tension: 20,
            friction: 7,
            useNativeDriver: true,
            delay: Math.random() * 500,
        }).start();

        const floatDuration = 3000 + Math.random() * 2000;
        const floatDistance = 15 + Math.random() * 15;

        const floatAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(translateY, {
                    toValue: -floatDistance,
                    duration: floatDuration,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(translateY, {
                    toValue: 0,
                    duration: floatDuration,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
            ])
        );
        floatAnimation.start();
    }, []);

    const { isPlaceholder, size, config, event, x, y } = item;

    return (
        <Animated.View
            style={[
                styles.bubbleContainer,
                {
                    left: x - size / 2,
                    top: y - size / 2,
                    transform: [{ scale }, { translateY }],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={isPlaceholder ? 1 : 0.8}
                onPress={isPlaceholder ? undefined : () => onPress?.(event!)}
                style={[
                    styles.outerRing,
                    {
                        width: size + 20,
                        height: size + 20,
                        borderRadius: (size + 20) / 2,
                        opacity: isPlaceholder ? 0.3 : 1,
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
                    {!isPlaceholder && event && (
                        <Text style={styles.bubbleText} numberOfLines={2}>
                            {event.title}
                        </Text>
                    )}
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function BubbleView() {
    const [events, setEvents] = useState<Event[]>([]);
    const [bubbleItems, setBubbleItems] = useState<any[]>([]);
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

        // Generate full layout mapping
        const items = generateBubblePositions(data, width, height);
        setBubbleItems(items);
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

            {/* Background Bubbles layer - first in tree means bottom of stack */}
            <View style={styles.content}>
                {bubbleItems.map((item, index) => (
                    <Bubble
                        key={index}
                        item={item}
                        onPress={handlePress}
                    />
                ))}
            </View>

            <View style={styles.header}>
                <Ionicons name="arrow-back" size={24} color="#FFF" />
                <Ionicons name="search" size={24} color="#FFF" />
            </View>

            <View style={styles.titleContainer} pointerEvents="none">
                <Text style={styles.headerTitle}>What's</Text>
                <Text style={styles.headerTitle}>poppin'!</Text>
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
        ...StyleSheet.absoluteFillObject,
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
