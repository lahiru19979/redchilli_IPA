import React from 'react';
import {StatusBar} from 'react-native';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {CartProvider} from './src/context/CartContext';

const App = () => {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;