import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

type ViewType = 'main' | 'table';

interface HamburgerMenuProps {
    currentView: ViewType;
    onNavigate: (view: ViewType) => void;
    onSearchToggle: () => void;
    isSearchVisible: boolean;
}

export default function HamburgerMenu({ currentView, onNavigate, onSearchToggle, isSearchVisible }: HamburgerMenuProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleNavigate = (view: ViewType) => {
        onNavigate(view);
        setIsOpen(false);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.menuButton, { marginRight: 10 }]}
                onPress={onSearchToggle}
            >
                <Ionicons name={isSearchVisible ? "close" : "search"} size={24} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setIsOpen(true)}
            >
                <Ionicons name="menu" size={32} color="#FFF" />
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent
                animationType="fade"
                onRequestClose={() => setIsOpen(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
                    <View style={styles.overlay}>
                        <View style={styles.menuContainer}>
                            {/* Close Button or Just Header area */}
                            <View style={styles.menuHeader}>
                                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                                    <Ionicons name="close" size={28} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.menuItem, currentView === 'main' && styles.activeItem]}
                                onPress={() => handleNavigate('main')}
                            >
                                <Ionicons name="apps" size={24} color={currentView === 'main' ? '#FFF' : '#AAA'} />
                                <Text style={[styles.menuText, currentView === 'main' && styles.activeText]}>Haupt View</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.menuItem, currentView === 'table' && styles.activeItem]}
                                onPress={() => handleNavigate('table')}
                            >
                                <Ionicons name="list" size={24} color={currentView === 'table' ? '#FFF' : '#AAA'} />
                                <Text style={[styles.menuText, currentView === 'table' && styles.activeText]}>Tabellen View</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50, // Align with typical status bar / header height
        right: 20,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(20,20,30,0.6)',
        borderRadius: 22,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
    },
    menuContainer: {
        marginTop: 60,
        marginRight: 20,
        width: 200,
        backgroundColor: 'rgba(20, 20, 30, 0.95)',
        borderRadius: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    menuHeader: {
        alignItems: 'flex-end',
        paddingRight: 10,
        marginBottom: 5,
    },
    closeButton: {
        padding: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        gap: 12,
    },
    activeItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuText: {
        color: '#AAA',
        fontSize: 16,
        fontWeight: '500',
    },
    activeText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
});
