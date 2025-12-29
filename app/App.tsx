import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView, Dimensions } from 'react-native';
// import { BlurView } from 'expo-blur'; // Temporarily disabled for debugging
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import MapScreen from './screens/MapScreen';
import BubbleView from './screens/BubbleView';

const { width } = Dimensions.get('window');

type TabType = 'bubble' | 'search' | 'calendar' | 'profile' | 'map';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('bubble');

  const renderContent = () => {
    switch (activeTab) {
      case 'bubble':
        return <BubbleView />;
      case 'map':
        return <MapScreen />;
      default:
        return <BubbleView />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {renderContent()}

      {/* Replaced BlurView with View for Android compatibility */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setActiveTab('bubble')}
          style={styles.tabButton}
        >
          <Ionicons
            name="home"
            size={28}
            color={activeTab === 'bubble' ? '#FFF' : 'rgba(255,255,255,0.4)'}
          />
          {activeTab === 'bubble' && <View style={styles.activeGlow} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('map')}
          style={styles.tabButton}
        >
          <Ionicons
            name="map-outline"
            size={28}
            color={activeTab === 'map' ? '#FFF' : 'rgba(255,255,255,0.4)'}
          />
          {activeTab === 'map' && <View style={styles.activeGlow} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { }} // Placeholder
          style={styles.tabButton}
        >
          <Ionicons
            name="calendar-outline"
            size={28}
            color="rgba(255,255,255,0.4)"
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { }} // Placeholder
          style={styles.tabButton}
        >
          <Ionicons
            name="person-outline"
            size={28}
            color="rgba(255,255,255,0.4)"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabBar: {
    flexDirection: 'row',
    height: 90,
    paddingBottom: 25,
    paddingHorizontal: 20,
    position: 'absolute',
    bottom: 25,
    left: 20,
    right: 20,
    borderRadius: 35,
    justifyContent: 'space-around',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(20, 20, 30, 0.9)', // Added for non-blur fallback
  },
  tabButton: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGlow: {
    position: 'absolute',
    bottom: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
});
