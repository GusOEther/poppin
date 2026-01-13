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
    const minPadding = 15;
    // Dynamic spacing: fewer events = more space, more events = tighter packing
    const spacingBuffer = Math.max(10, Math.min(45, 50 - events.length * 1.5));

    // Collision check helper
    const checkOverlap = (x: number, y: number, size: number): boolean => {
        for (const b of bubbles) {
            const dx = b.x - x;
            const dy = b.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const minDist = (b.size + size) / 2 + spacingBuffer;
            if (dist < minDist) return true;
        }
        return false;
    };

    // --- FOREGROUND LAYER (Events) - JITTERED STAGGERED GRID ---
    const fgXPadding = 40;
    const fgYMin = startY + 20;

    // Dynamic grid dimensions based on event count
    const idealCellSize = 130; // Base space for 100px bubble + spacing
    const cols = Math.max(2, Math.floor((screenWidth - fgXPadding * 2) / idealCellSize));
    const rows = Math.ceil(events.length / cols) + 1;
    const cellWidth = (screenWidth - fgXPadding * 2) / cols;
    const cellHeight = 140; // Vertical spacing

    // Create a list of available grid slots
    const slots: { r: number, c: number }[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            slots.push({ r, c });
        }
    }

    // Sort slots Inside-Out (center first)
    const centerCol = (cols - 1) / 2;
    const centerRow = (rows - 1) / 2;
    slots.sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.c - centerCol, 2) + Math.pow(a.r - centerRow, 2));
        const distB = Math.sqrt(Math.pow(b.c - centerCol, 2) + Math.pow(b.r - centerRow, 2));
        return distA - distB;
    });

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const baseSize = 75 + Math.min(event.title.length * 1.2, 40);
        const size = baseSize + Math.random() * 15;
        let placed = false;

        // Try slots in order from center
        for (const slot of slots) {
            if (placed) break;

            const isStaggered = slot.r % 2 === 1;
            const rowOffset = isStaggered ? cellWidth / 2 : 0;

            // Base position in grid
            const baseX = fgXPadding + slot.c * cellWidth + cellWidth / 2 + rowOffset;
            const baseY = fgYMin + slot.r * cellHeight + cellHeight / 2;

            // Try multiple jitters within this slot
            for (let attempt = 0; attempt < 15; attempt++) {
                // High jitter (up to 40% of cell)
                const jitterX = (Math.random() - 0.5) * cellWidth * 0.8;
                const jitterY = (Math.random() - 0.5) * cellHeight * 0.8;

                const x = Math.max(size / 2 + 10, Math.min(screenWidth - size / 2 - 10, baseX + jitterX));
                const y = baseY + jitterY;

                if (!checkOverlap(x, y, size)) {
                    bubbles.push({
                        event: event,
                        x,
                        y,
                        size,
                        isPlaceholder: false,
                        config: BUBBLE_CONFIGS[i % BUBBLE_CONFIGS.length]
                    });
                    placed = true;
                    // Remove slot so it's not used again
                    slots.splice(slots.indexOf(slot), 1);
                    break;
                }
            }
        }
    }

    // --- BACKGROUND LAYER (Placeholders) - FILL AROUND EVENTS ---
    const bgCount = 45;
    const bgYMax = screenHeight - 50;

    for (let i = 0; i < bgCount; i++) {
        const size = 25 + Math.random() * 40;
        let placed = false;

        for (let attempt = 0; attempt < 50 && !placed; attempt++) {
            const x = minPadding + size / 2 + Math.random() * (screenWidth - minPadding * 2 - size);
            const y = startY + size / 2 + Math.random() * (bgYMax - startY - size);

            if (!checkOverlap(x, y, size)) {
                bubbles.push({
                    event: null,
                    x,
                    y,
                    size,
                    isPlaceholder: true,
                    config: BUBBLE_CONFIGS[Math.floor(Math.random() * BUBBLE_CONFIGS.length)]
                });
                placed = true;
            }
        }
        // Background bubbles are optional - skip if no space
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
            zIndex: activeBubbleIndex.value === index ? 999 : (item.isPlaceholder ? 0 : 10)
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
        ? Math.max(height, Math.max(...bubbleItems.map(i => i.y + i.size + 50)))
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
