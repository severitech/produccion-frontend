import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/auth/LoginScreen';
import PasajeroWalletScreen from './src/screens/passenger/WalletScreen';
import ConductorScanScreen from './src/screens/conductor/ScanScreen';
import MapScreen from './src/screens/common/MapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const PasajeroTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName = '';
        if (route.name === 'Billetera') iconName = 'wallet';
        else if (route.name === 'Mapa') iconName = 'map';
        else if (route.name === 'Perfil') iconName = 'person';
        return <Ionicons name={focused ? iconName : `${iconName}-outline`} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#00d992',
      tabBarInactiveTintColor: '#8b949e',
      tabBarStyle: { backgroundColor: '#050507', borderTopColor: '#3d3a39' },
    })}
  >
    <Tab.Screen name="Billetera" component={PasajeroWalletScreen} />
    <Tab.Screen name="Mapa" component={MapScreen} />
  </Tab.Navigator>
);

const ConductorTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName = '';
        if (route.name === 'Escanear') iconName = 'qr-code';
        else if (route.name === 'Mapa') iconName = 'map';
        else if (route.name === 'Perfil') iconName = 'person';
        return <Ionicons name={focused ? iconName : `${iconName}-outline`} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#00d992',
      tabBarInactiveTintColor: '#8b949e',
      tabBarStyle: { backgroundColor: '#050507', borderTopColor: '#3d3a39' },
    })}
  >
    <Tab.Screen name="Escanear" component={ConductorScanScreen} />
    <Tab.Screen name="Mapa" component={MapScreen} />
  </Tab.Navigator>
);

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const verificarToken = async () => {
      try {
        const t = await SecureStore.getItemAsync('token');
        const r = await SecureStore.getItemAsync('rol');
        if (t && r) {
          setToken(t);
          setRol(r);
        }
      } catch (e) {
        console.log('Error cargando token:', e);
      } finally {
        setCargando(false);
      }
    };
    verificarToken();
  }, []);

  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050507' }}>
        <ActivityIndicator size="large" color="#00d992" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : rol === 'CONDUCTOR' ? (
          <Stack.Screen name="ConductorApp" component={ConductorTabs} />
        ) : (
          <Stack.Screen name="PasajeroApp" component={PasajeroTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
