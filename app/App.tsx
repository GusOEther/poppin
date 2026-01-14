import React, { useState } from 'react';
import { StyleSheet, View, Text, StatusBar } from 'react-native';
// import { BlurView } from 'expo-blur'; // Temporarily disabled for debugging
// import { Ionicons } from '@expo/vector-icons'; // Used in child components
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import BubbleView from './screens/BubbleView';
import TableView from './screens/TableView';
import HamburgerMenu from './components/HamburgerMenu';

type ViewType = 'main' | 'table';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('main');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case 'main':
        return <BubbleView isSearchVisible={isSearchVisible} onToggleSearch={() => setIsSearchVisible(!isSearchVisible)} />;
      case 'table':
        return <TableView />;
      default:
        return <BubbleView isSearchVisible={isSearchVisible} onToggleSearch={() => setIsSearchVisible(!isSearchVisible)} />;
    }
  };

  return (
    <View style={styles.container}>
      <ExpoStatusBar style="light" />

      {renderContent()}

      <HamburgerMenu
        currentView={currentView}
        onNavigate={setCurrentView}
        onSearchToggle={() => setIsSearchVisible(!isSearchVisible)}
        isSearchVisible={isSearchVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
