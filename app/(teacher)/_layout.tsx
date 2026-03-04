import React, { useEffect } from 'react';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs, router } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

function NativeTeacherTabs() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Dashboard</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="session">
        <Icon sf={{ default: 'qrcode', selected: 'qrcode' }} />
        <Label>Session</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTeacherTabs() {
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : Colors.card,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: Colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.card }]} />
          ) : null,
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: 'Session',
          tabBarIcon: ({ color }) => <Ionicons name="qr-code" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TeacherLayout() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'teacher') router.replace('/login');
  }, [user]);

  if (!user || user.role !== 'teacher') return null;

  if (isLiquidGlassAvailable()) return <NativeTeacherTabs />;
  return <ClassicTeacherTabs />;
}
