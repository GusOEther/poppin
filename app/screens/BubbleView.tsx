import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, Dimensions, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
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
    const rowHeight = 110;
    const paddingHorizontal = 40;
    const contentWidth = screenWidth - paddingHorizontal * 2;

    // Determine how many rows we need. We want to fit at least all events + some placeholders.
    const eventsPerRow = 2.5; // Average
    const neededRows = Math.max(7, Math.ceil(events.length / 1.5)); // More rows than strictly needed for spacing

    let eventIndex = 0;

    for (let row = 0; row < neededRows; row++) {
        const isStaggered = row % 2 === 1;
        const colsInRow = isStaggered ? 2 : 3;
        const cellWidth = contentWidth / (colsInRow);
        const rowXOffset = paddingHorizontal + (isStaggered ? cellWidth / 2 : 0);

        for (let col = 0; col < colsInRow; col++) {
            const remainingEvents = events.length - eventIndex;

            // Randomly decide if this slot is an event or placeholder
            // Higher chance for event if we have many left
            const isEventSlot = remainingEvents > 0 && (Math.random() > 0.3 || remainingEvents > (neededRows - row) * 2);
            const isPlaceholder = !isEventSlot;

            let x = rowXOffset + col * cellWidth;
            let y = startY + row * rowHeight + rowHeight / 2;

            // Add some jitter
            x += (Math.random() - 0.5) * cellWidth * 0.3;
            y += (Math.random() - 0.5) * rowHeight * 0.3;

            const size = isPlaceholder
                ? 40 + Math.random() * 30
                : 90 + Math.random() * 30;

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
    const [searchVisible, setSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentCity, setCurrentCity] = useState('Braunschweig');
    const [filterDate, setFilterDate] = useState<'today' | 'tomorrow' | 'weekend' | 'all'>('all');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const eventService = useRef(new FirebaseEventService(currentCity)).current;

    // Filter logic
    useEffect(() => {
        if (events.length === 0) {
            setBubbleItems([]);
            return;
        }

        let filtered = events;

        // Date Filter
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const tomorrow = today + 86400000;
        const dayAfter = tomorrow + 86400000;
        const nextWeek = today + 7 * 86400000;

        if (filterDate === 'today') {
            filtered = filtered.filter(e => {
                const t = new Date(e.startTime).getTime();
                return t >= today && t < tomorrow;
            });
        } else if (filterDate === 'tomorrow') {
            filtered = filtered.filter(e => {
                const t = new Date(e.startTime).getTime();
                return t >= tomorrow && t < dayAfter;
            });
        } else if (filterDate === 'weekend') {
            // Simplified weekend logic: Friday 5pm to Sunday night
            // For now, let's just say "next 3 days" or specific weekend logic if needed.
            // Let's us "This Weekend" as "Fri-Sun".
            // Finding next Friday:
            const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
            const distToFriday = (5 + 7 - dayOfWeek) % 7;
            const nextFriday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distToFriday);
            nextFriday.setHours(17, 0, 0, 0); // 5 PM
            const nextSunday = new Date(nextFriday);
            nextSunday.setDate(nextSunday.getDate() + 2);
            nextSunday.setHours(23, 59, 59, 999);

            // If today is Sat/Sun, "This Weekend" implies today/tomorrow until Sun night.
            const weekendStart = (dayOfWeek === 6 || dayOfWeek === 0) ? today : nextFriday.getTime();
            const weekendEnd = nextSunday.getTime();

            filtered = filtered.filter(e => {
                const t = new Date(e.startTime).getTime();
                return t >= weekendStart && t <= weekendEnd;
            });
        }

        // Category Filter
        if (filterCategory) {
            filtered = filtered.filter(e => {
                // Fuzzy match or exact? Let's check if category string includes our key
                return e.category.toLowerCase().includes(filterCategory.toLowerCase());
            });
        }

        const items = generateBubblePositions(filtered, width, height);
        setBubbleItems(items);

    }, [events, filterDate, filterCategory]);

    useEffect(() => {
        // Clear previous state immediately to avoid showing stale data from previous city
        setEvents([]);
        setLoading(true);
        let initialLoad = true;

        // Subscribe to real-time updates for the current city
        const unsubscribe = eventService.subscribeToEvents(
            { latitude: 52.268875, longitude: 10.526770 },
            (newEvents) => {
                setEvents(newEvents);
                setLoading(false);
                initialLoad = false;
            }
        );

        // Safety timeout for loading state
        const timer = setTimeout(() => {
            if (initialLoad) {
                console.log('BubbleView: Loading timeout reached');
                setLoading(false);
            }
        }, 8000);

        return () => {
            unsubscribe();
            clearTimeout(timer);
        };
    }, [currentCity, eventService]); // Added eventService to dependency array

    const loadEvents = (city?: string) => {
        if (city) {
            eventService.setCity(city);
            setCurrentCity(city);
        }
        // The useEffect [currentCity] will handle the re-subscription
    };

    const handleSearch = () => {
        if (searchQuery.trim()) {
            loadEvents(searchQuery.trim());
            setSearchVisible(false);
            setSearchQuery('');
        }
    };

    const handlePress = (event: Event) => {
        setSelectedEvent(event);
        setModalVisible(true);
    };

    const contentHeight = bubbleItems.length > 0
        ? Math.max(height, Math.max(...bubbleItems.map(i => i.y + i.size))) + 150
        : height;

    return (
        <GestureHandlerRootView style={styles.container}>
            <LinearGradient
                colors={['#050812', '#0C0E28', '#0A0A0A']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ height: contentHeight }}
                showsVerticalScrollIndicator={false}
                decelerationRate="normal"
            >
                {bubbleItems.length > 0 ? (
                    <BubbleList key={currentCity} items={bubbleItems} onPress={handlePress} />
                ) : (
                    !loading && (
                        <View style={styles.emptyStateContainer}>
                            <Text style={styles.emptyStateText}>No events poppin' in</Text>
                            <Text style={styles.emptyStateCity}>{currentCity}</Text>
                        </View>
                    )
                )}
            </ScrollView>

            <View style={[styles.titleContainer, { pointerEvents: "none" }]}>
                <Text style={styles.headerTitle}>{loading ? 'Poppin\'' : 'What\'s'}</Text>
                <Text style={styles.headerTitle}>{loading ? '...' : 'poppin\''}</Text>
                {!loading && <Text style={styles.citySubtitle}>{currentCity}</Text>}
            </View>

            {searchVisible && (
                <View style={styles.searchBarContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search city..."
                        placeholderTextColor="rgba(255,255,255,0.5)"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        autoFocus
                    />
                    <TouchableOpacity onPress={handleSearch} style={styles.searchSubmitButton}>
                        <Ionicons name="arrow-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                </View>
            )}



            {/* Filter Bar */}
            <View style={[styles.filterBarContainer, { pointerEvents: modalVisible ? 'none' : 'auto' }]}>
                {/* Date Segments */}
                <View style={styles.dateSegmentContainer}>
                    <View style={styles.dateSegmentDecor} />
                    {(['today', 'tomorrow', 'weekend'] as const).map((mode) => {
                        const isActive = filterDate === mode;
                        return (
                            <TouchableOpacity
                                key={mode}
                                onPress={() => setFilterDate(isActive ? 'all' : mode)}
                                style={styles.dateSegmentButton}
                            >
                                {isActive && (
                                    <LinearGradient
                                        colors={['#45CAFF', '#FF1B6B']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                )}
                                <Text style={[
                                    styles.dateSegmentText,
                                    isActive && styles.dateSegmentTextActive
                                ]}>
                                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Category Icons */}
                <View style={styles.categoryContainer}>
                    {[
                        { id: 'Music', icon: 'musical-notes' },
                        { id: 'Party', icon: 'wine' },
                        { id: 'Art', icon: 'color-palette' },
                    ].map((cat) => {
                        const isActive = filterCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                onPress={() => setFilterCategory(isActive ? null : cat.id)}
                                style={[
                                    styles.categoryButton,
                                    isActive && styles.categoryButtonActive
                                ]}
                            >
                                <Ionicons
                                    name={cat.icon as any}
                                    size={20}
                                    color={isActive ? '#FFF' : '#AAA'}
                                />
                                {isActive && (
                                    <View style={styles.categoryGlow} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={[styles.header, { pointerEvents: modalVisible ? 'none' : 'auto' }]}>
                <TouchableOpacity onPress={() => { }}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSearchVisible(!searchVisible)}>
                    <Ionicons name={searchVisible ? "close" : "search"} size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <EventDetailModal
                event={selectedEvent}
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </GestureHandlerRootView >
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
        // boxShadow: '0 0 20px rgba(0,0,0,0.6)', // React Native Web / 0.75+ support
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
        // textShadow: '0 1px 3px rgba(0,0,0,0.3)',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    citySubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 5,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    searchBarContainer: {
        position: 'absolute',
        top: 100,
        left: 25,
        right: 25,
        height: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        zIndex: 20,
        backdropFilter: 'blur(10px)',
    } as any,
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 18,
        fontWeight: '500',
    },
    searchSubmitButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyStateText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    emptyStateCity: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 10,
        textTransform: 'uppercase',
    },
    filterBarContainer: {
        position: 'absolute',
        bottom: 120, // Just above the tab bar (which is 90 + margin)
        left: 20,
        right: 20,
        height: 60,
        backgroundColor: 'rgba(20, 20, 30, 0.6)',
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(15px)', // Works on web
        zIndex: 20,
        justifyContent: 'space-between'
    } as any,
    dateSegmentContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 15,
        overflow: 'hidden',
        height: 40,
        alignItems: 'center',
    },
    dateSegmentDecor: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 15,
    },
    dateSegmentButton: {
        paddingHorizontal: 12,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateSegmentText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
    },
    dateSegmentTextActive: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    categoryContainer: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 10
    },
    categoryButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    categoryButtonActive: {
        borderColor: '#45CAFF',
        shadowColor: '#45CAFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
    },
    categoryGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        backgroundColor: 'rgba(69, 202, 255, 0.1)',
    }
});
