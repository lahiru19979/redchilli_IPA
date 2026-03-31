import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

// Screens
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import InvoiceScreen from '../screens/InvoiceScreen';
import InvoiceDetailScreen from '../screens/InvoiceDetailScreen';
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BarcodeScanScreen from '../screens/BarcodeScanScreen';
import CreateProductScreen from '../screens/CreateProductScreen';
import productsScreen from '../screens/productsScreen';
import InventoryScanScreen from '../screens/InventoryScanScreen';
import ScannedItemsScreen from '../screens/ScannedItemsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }) => {
  const icons = {
    Home: '🏠',
    Invoice: '📄',
    Product: '🛍️',
    Profile: '👤',
  };

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: 24 }}>{icons[name]}</Text>
    </View>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Invoice"
        component={InvoiceScreen}
        options={{ title: 'Invoices' }}
      />
      <Tab.Screen
        name="Product"
        component={productsScreen}
        options={{ title: 'Products' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner message="Initializing..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="InvoiceDetail"
              component={InvoiceDetailScreen}
              options={{ title: 'Invoice Details' }}
            />
            <Stack.Screen
              name="CreateInvoice"
              component={CreateInvoiceScreen}
              options={{ title: 'Create Invoice' }}
            />
            <Stack.Screen
              name="CreateProduct"
              component={CreateProductScreen}
              options={{ title: 'Create Product' }}
            />
            <Stack.Screen
              name="AllProduct"
              component={productsScreen}
              options={{ title: 'All Products' }}
            />
            <Stack.Screen
              name="BarcodeScan"
              component={BarcodeScanScreen}
              options={{
                headerShown: false,
                presentation: 'fullScreenModal',
              }}
            />
            <Stack.Screen
              name="InventoryScan"
              component={InventoryScanScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ScannedItems"
              component={ScannedItemsScreen}
              options={{ headerShown: false }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
