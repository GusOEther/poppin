import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView, Dimensions, Linking } from 'react-native';
import { Event } from '../types';

interface EventDetailModalProps {
    event: Event | null;
    visible: boolean;
    onClose: () => void;
}

const { height } = Dimensions.get('window');

export default function EventDetailModal({ event, visible, onClose }: EventDetailModalProps) {
    if (!event) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.handle} />

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        <Text style={styles.category}>{event.category}</Text>
                        <Text style={styles.title}>{event.title}</Text>

                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Time:</Text>
                            <Text style={styles.value}>
                                {new Date(event.startTime).toLocaleDateString('de-DE', {
                                    weekday: 'long',
                                    day: '2-digit',
                                    month: 'long',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>

                        <View style={styles.infoRow}>
                            <Text style={styles.label}>Location:</Text>
                            <Text style={styles.value}>{event.address || event.city}</Text>
                        </View>

                        <Text style={styles.descriptionHeader}>About this event:</Text>
                        <Text style={styles.description}>{event.description}</Text>

                        {event.sourceUrl && (
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => Linking.openURL(event.sourceUrl!)}
                            >
                                <Text style={styles.buttonText}>View Source</Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalView: {
        backgroundColor: '#1A1A1A',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 20,
        height: height * 0.7,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: '#333',
        borderRadius: 5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    scrollView: {
        flex: 1,
    },
    category: {
        color: '#00F2FF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    label: {
        color: '#888',
        width: 80,
        fontSize: 14,
    },
    value: {
        color: '#DDD',
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
    descriptionHeader: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 10,
    },
    description: {
        color: '#AAA',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 30,
    },
    button: {
        backgroundColor: '#7000FF',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 10,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    closeButton: {
        marginTop: 10,
        padding: 15,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#666',
        fontSize: 14,
    },
});
