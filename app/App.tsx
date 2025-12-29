import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import MapScreen from './screens/MapScreen';
import BubbleView from './screens/BubbleView';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [viewMode, setViewMode] = useState<'map' | 'bubble'>('bubble');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style={viewMode === 'bubble' ? 'light' : 'dark'} />

      {viewMode === 'map' ? <MapScreen /> : <BubbleView />}

      <View style={styles.tabBar}>
        <TouchableOpacity
          onPress={() => setViewMode('map')}
          style={[styles.tabButton, viewMode === 'map' && styles.activeTab]}
        >
          <Text style={[styles.tabText, viewMode === 'map' && styles.activeTabText]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('bubble')}
          style={[styles.tabButton, viewMode === 'bubble' && styles.activeTab]}
        >
          <Text style={[styles.tabText, viewMode === 'bubble' && styles.activeTabText]}>Bubbles</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderTopWidth: 1,
    borderTopColor: '#333',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#333',
  },
  tabText: {
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00F2FF',
  },
});
