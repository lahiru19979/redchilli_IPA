import React from 'react';
import {StatusBar} from 'react-native';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {C} from './src/utils/theme';
import {CartProvider} from './src/context/CartContext';

const App = () => {
  return (
    <AuthProvider>
      <StatusBar barStyle="light-content" backgroundColor={C.accent} />
      <AppNavigator />
    </AuthProvider>
  );
};

export default App;