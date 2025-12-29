import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { FirebaseEventService } from '../services/FirebaseEventService';
import { Event } from '../types';
import EventDetailModal from '../components/EventDetailModal';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    useDerivedValue,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    runOnJS,
    useAnimatedReaction,
    SharedValue,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

const BUBBLE_CONFIGS = [
    { colors: ['#FF1B6B', '#45CAFF'], shadow: '#FF1B6B' },
    { colors: ['#FF00FF', '#7000FF'], shadow: '#FF00FF' },
    { colors: ['#FFD700', '#FF8C00'], shadow: '#FFD700' },
    { colors: ['#00F2FF', '#007AFF'], shadow: '#00F2FF' },
    { colors: ['#FF5F6D', '#FFC371'], shadow: '#FF5F6D' },
];

const generateBubblePositions = (events: Event[], screenWidth: number, screenHeight: number) => {
    const bubbles: {
        event: Event | null;
        x: number;
        y: number;
        size: number;
        isPlaceholder: boolean;
        config: any
    }[] = [];

    const startY = 180;
    const endY = screenHeight - 110;
    const availableHeight = endY - startY;
    const rowHeight = 120;
    const numRows = Math.floor(availableHeight / rowHeight);
    let eventIndex = 0;

    for (let row = 0; row < numRows; row++) {
        const isStaggered = row % 2 === 1;
        const colsInRow = isStaggered ? 2 : 3;
        const cellWidth = screenWidth / (colsInRow + (isStaggered ? 1 : 0));
        const rowOffset = isStaggered ? cellWidth : cellWidth / 2;

        for (let col = 0; col < colsInRow; col++) {
            const remainingEvents = events.length - eventIndex;
            const isPatternPlaceholder = (row * 3 + col) % 5 === 3;
            const slotsRemaining = (numRows * 2.5) - (bubbles.length + 1);
            const canSkip = remainingEvents < slotsRemaining;
            const isEventSlot = remainingEvents > 0 && (!isPatternPlaceholder || !canSkip);
            const isPlaceholder = !isEventSlot;

            let x = rowOffset + col * cellWidth;
            let y = startY + row * rowHeight + rowHeight / 2;

            x += (Math.random() - 0.5) * cellWidth * 0.4;
            y += (Math.random() - 0.5) * rowHeight * 0.4;

            const size = isPlaceholder
                ? 50 + Math.random() * 40
                : 95 + Math.random() * 35;

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

const Bubble = ({
    item,
    index,
    positions,
    activeBubbleIndex,
    onPress
}: {
    item: any,
    index: number,
    positions: SharedValue<any[]>,
    activeBubbleIndex: SharedValue<number>,
    onPress: (e: any) => void
}) => {
    // Current dynamic position
    // We strictly separate the "Anchor" (item.x/y), the "User Drag" (positions.value selection), and "Physics" (local reaction)
    const activeIdx = activeBubbleIndex;

    // Physics displacement (local to this bubble, transient)
    const displacementX = useSharedValue(0);
    const displacementY = useSharedValue(0);

    const scale = useSharedValue(0);
    const floatY = useSharedValue(0);

    // Context for gesture
    const ctx = useSharedValue({ x: 0, y: 0 });

    useEffect(() => {
        scale.value = withSpring(1);
        floatY.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 2000 + Math.random() * 1000 }),
                withTiming(0, { duration: 2000 })
            ), -1, true
        );
    }, []);

    // Reactive Physics: 
    // If ANY bubble is active (being dragged), calculate force on ME.
    useAnimatedReaction(
        () => {
            const idx = activeBubbleIndex.value;
            if (idx !== -1 && idx !== index) {
                return positions.value[idx]; // user-controlled position of the active bubble
            }
            return null;
        },
        (activePos, previous) => {
            if (activePos && activeBubbleIndex.value !== -1) {
                const myX = item.x; // Anchor X
                const myY = item.y; // Anchor Y

                // Distance from Active Bubble to My Anchor
                const dx = myX - activePos.x;
                const dy = myY - activePos.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = (item.size + activePos.size) / 2 + 25; // larger field of influence

                if (dist < minDist && dist > 0) {
                    const angle = Math.atan2(dy, dx);
                    const push = minDist - dist;

                    // Push away comfortably
                    // We spring to this new offset
                    displacementX.value = withSpring(Math.cos(angle) * push, { damping: 15, stiffness: 100 });
                    displacementY.value = withSpring(Math.sin(angle) * push, { damping: 15, stiffness: 100 });
                } else {
                    // Return to 0 if out of range
                    if (displacementX.value !== 0 || displacementY.value !== 0) {
                        displacementX.value = withSpring(0);
                        displacementY.value = withSpring(0);
                    }
                }
            } else {
                // No active bubble? Return to home.
                if (displacementX.value !== 0 || displacementY.value !== 0) {
                    displacementX.value = withSpring(0);
                    displacementY.value = withSpring(0);
                }
            }
        }
    );

    // RE-RE-DESIGNED gesture for smooth return:
    // We drive `translateX` and `translateY` shared values directly.
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Sync `positions.value` with our movement so others can see us
    useDerivedValue(() => {
        if (activeBubbleIndex.value === index) {
            // We are active. Update global map.
            // Note: Mutating shared value array in derived callback is tricky.
            // We use useAnimatedReaction for this usually?
            // Actually, we can just do nothing here and let Gesture Update loop do it.
        }
    });

    const smoothGesture = Gesture.Pan()
        .onStart(() => {
            ctx.value = { x: translateX.value, y: translateY.value };
            scale.value = withSpring(1.1);
            activeBubbleIndex.value = index;
            // Reset displacement
            displacementX.value = withTiming(0);
            displacementY.value = withTiming(0);
        })
        .onUpdate((e) => {
            translateX.value = ctx.value.x + e.translationX;
            translateY.value = ctx.value.y + e.translationY;

            // Sync to global for others
            const absX = item.x + translateX.value;
            const absY = item.y + translateY.value;

            // We should debounce/throttle this or just do it? 
            // Array copy every frame is heavy.
            // Optim: Only update a simpler shared value?
            // For now, assume < 50 items is okay.
            const newPositions = [...positions.value];
            newPositions[index] = { x: absX, y: absY, size: item.size };
            positions.value = newPositions;
        })
        .onEnd(() => {
            scale.value = withSpring(1);
            activeBubbleIndex.value = -1;

            // Spring home!
            translateX.value = withSpring(0, { damping: 12, stiffness: 80 });
            translateY.value = withSpring(0, { damping: 12, stiffness: 80 });

            // We also need to reset the global position for this index eventually
            // so next time drag starts correct.
            // But immediate reset might cause jump in others? 
            // Others read `positions.value`. If we snap `positions.value` to home, others relax immediately.
            // Ideally we animate `positions.value`? 
            // We can just rely on the loop: `others` react to `positions.value`. 
            // If we animate `translateX`, we should animate `positions.value` too?
            // Since we can't easily animate the array content, let's just leave the array "dirty" at last pos?
            // No, then others stay displaced.
            // We need to continuously update `positions.value` during the spring back?
            // Using `useDerivedValue` to update `positions.value` is risky/infinite loop.

            // COMPROMISE: On release, we don't update `positions.value` anymore.
            // This means others stop "feeling" us immediately and spring back. 
            // This is actually GOOD for "natural distribution".
            // The dragged bubble goes home, others go home. Everyone happy.
        });

    const tap = Gesture.Tap().onEnd(() => {
        if (item.event && onPress) {
            runOnJS(onPress)(item.event);
        }
    });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { translateX: displacementX.value },
                { translateY: displacementY.value },
                { translateY: floatY.value },
                { scale: scale.value }
            ],
            zIndex: activeBubbleIndex.value === index ? 999 : 1
        };
    });

    return (
        <GestureDetector gesture={Gesture.Race(smoothGesture, tap)}>
            <Animated.View style={[
                styles.bubbleContainer,
                { left: item.x - item.size / 2, top: item.y - item.size / 2 },
                animatedStyle
            ]}>
                <View
                    style={[
                        styles.outerRing,
                        {
                            width: item.size + 20,
                            height: item.size + 20,
                            borderRadius: (item.size + 20) / 2,
                            opacity: item.isPlaceholder ? 0.3 : 1,
                        }
                    ]}
                >
                    <LinearGradient
                        colors={item.config.colors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.bubble,
                            {
                                width: item.size,
                                height: item.size,
                                borderRadius: item.size / 2,
                                shadowColor: item.config.shadow,
                            },
                        ]}
                    >
                        {!item.isPlaceholder && item.event && (
                            <Text style={styles.bubbleText} numberOfLines={2}>
                                {item.event.title}
                            </Text>
                        )}
                    </LinearGradient>
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

const BubbleList = ({ items, onPress }: { items: any[], onPress: (event: Event) => void }) => {
    // Shared value holding ALL positions.
    // Initialized from the items prop.
    const positions = useSharedValue(items.map(i => ({ x: i.x, y: i.y, size: i.size })));
    const activeBubbleIndex = useSharedValue(-1);

    return (
        <>
            {items.map((item, index) => (
                <Bubble
                    key={index}
                    index={index}
                    item={item}
                    positions={positions}
                    activeBubbleIndex={activeBubbleIndex}
                    onPress={onPress}
                />
            ))}
        </>
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
        const items = generateBubblePositions(data, width, height);
        setBubbleItems(items);
    };

    const handlePress = (event: Event) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    return (
        <GestureHandlerRootView style={styles.container}>
            <LinearGradient
                colors={['#050812', '#0C0E28', '#0A0A0A']}
                style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
                {bubbleItems.length > 0 && (
                    <BubbleList items={bubbleItems} onPress={handlePress} />
                )}
            </View>

            <View style={styles.header} pointerEvents="none">
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
        </GestureHandlerRootView>
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
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10
    },
    titleContainer: {
        paddingHorizontal: 25,
        paddingTop: 80,
        position: 'absolute',
        zIndex: 5
    },
    headerTitle: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        lineHeight: 52,
    },
    content: {
        flex: 1,
    },
    bubbleContainer: {
        position: 'absolute',
        left: 0,
        top: 0,
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
