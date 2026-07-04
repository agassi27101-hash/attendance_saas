import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const scheme = useColorScheme();
  const currentColors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.teal,
        tabBarInactiveTintColor: Colors.slate,
        tabBarStyle: {
          backgroundColor: currentColors.card,
          borderTopWidth: 1,
          borderTopColor: currentColors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.bodyMedium,
          fontSize: 12,
        },
        headerStyle: {
          backgroundColor: currentColors.card,
          borderBottomWidth: 1,
          borderBottomColor: currentColors.border,
          elevation: 0, // remove shadow on Android
          shadowOpacity: 0, // remove shadow on iOS
        },
        headerTitleStyle: {
          fontFamily: Fonts.heading,
          fontSize: 20,
          color: currentColors.text,
        },
        headerTitleAlign: 'center',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'Attendance',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'My Logs',
          headerTitle: 'Attendance History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="payslips"
        options={{
          title: 'Payslips',
          headerTitle: 'My Payslips',
          tabBarLabel: 'Payslips',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
