import React from 'react';
import {StatusBar} from 'react-native';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {CartProvider} from './src/context/CartContext';

const App = () => {
  return (
    <AuthProvider>
      {/* Transparent, not coloured: the header draws behind it, so the
          clock and battery sit on the header instead of on a band of
          their own. */}
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;