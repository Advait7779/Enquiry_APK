import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from './src/theme/colors';
import { notificationService } from './src/services/notificationService';
import { NotificationBanner } from './src/components/NotificationBanner';
import { NotificationsPanelModal } from './src/components/NotificationsPanelModal';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { NewEntryScreen } from './src/screens/NewEntryScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LoginScreen } from './src/screens/LoginScreen';
import {
  LobbyQueueSvg,
  NewClientSvg,
  RegisterSvg,
  SettingsSvg
} from './src/components/SvgIcons';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'web' ? 0 : Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 8);
  const tabHeight = 64 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: 'shift',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#0F1E36',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          lineHeight: 14,
          fontWeight: '700',
          marginTop: 3,
          marginBottom: 4,
        },
        tabBarItemStyle: { minHeight: 58 },
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'Lobby') {
            return <LobbyQueueSvg size={22} color={focused ? colors.primary : color} />;
          } else if (route.name === 'NewEntry') {
            return <NewClientSvg size={22} color={focused ? colors.accent : color} />;
          } else if (route.name === 'Register') {
            return <RegisterSvg size={22} color={focused ? colors.primary : color} />;
          } else if (route.name === 'Settings') {
            return <SettingsSvg size={22} color={focused ? colors.primary : color} />;
          }
          return null;
        },
      })}
    >
      <Tab.Screen
        name="Lobby"
        component={LobbyScreen}
        options={{ tabBarLabel: 'Lobby Queue' }}
      />
      <Tab.Screen
        name="NewEntry"
        component={NewEntryScreen}
        options={{
          tabBarLabel: 'New Client',
          tabBarActiveTintColor: colors.accent,
        }}
      />
      <Tab.Screen
        name="Register"
        component={RegisterScreen}
        options={{ tabBarLabel: 'All Records' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

function AuthenticatedApp() {
  return (
    <PreferencesProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 180,
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen
            name="Detail"
            component={DetailScreen}
            options={{
              animation: 'slide_from_right',
              animationDuration: 180,
              gestureEnabled: true,
            }}
          />
        </Stack.Navigator>
        <NotificationBanner />
        <NotificationsPanelModal />
      </NavigationContainer>
    </PreferencesProvider>
  );
}

function AppContent() {
  const { isReady, isAuthenticated } = useAuth();

  useEffect(() => {
    notificationService.initialize();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return isAuthenticated ? <AuthenticatedApp /> : <LoginScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
