import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Circle, Line, Path, Rect, Svg } from 'react-native-svg';
import { copy, usePreferences } from '@/hooks/usePreferences';

type TabIconName = 'church' | 'broadcast' | 'calendar' | 'book' | 'more';

function TabIcon({ name, color }: { name: TabIconName; color: string }) {
  const common = {
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <Svg width={23} height={23} viewBox="0 0 24 24" fill="none">
      {name === 'church' ? (
        <>
          <Path d="M12 3v4M9.5 5h5M5 10l7-4 7 4v10H5V10Z" {...common} />
          <Path d="M9 20v-5h6v5M7 10h10" {...common} />
        </>
      ) : name === 'broadcast' ? (
        <>
          <Circle cx="12" cy="12" r="2" {...common} />
          <Path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" {...common} />
          <Path d="M4.8 4.8a10 10 0 0 0 0 14.4M19.2 4.8a10 10 0 0 1 0 14.4" {...common} />
        </>
      ) : name === 'calendar' ? (
        <>
          <Rect x="3.5" y="5" width="17" height="16" rx="2" {...common} />
          <Line x1="3.5" y1="9" x2="20.5" y2="9" {...common} />
          <Line x1="8" y1="3.5" x2="8" y2="7" {...common} />
          <Line x1="16" y1="3.5" x2="16" y2="7" {...common} />
          <Circle cx="8" cy="13" r="0.8" fill={color} />
          <Circle cx="12" cy="13" r="0.8" fill={color} />
          <Circle cx="16" cy="13" r="0.8" fill={color} />
        </>
      ) : name === 'book' ? (
        <>
          <Path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12H8a3 3 0 0 1-3-3V4.5Z" {...common} />
          <Path d="M8 20a3 3 0 0 1 3-3h8M12 8v5M9.5 10.5h5" {...common} />
        </>
      ) : (
        <>
          <Circle cx="7" cy="7" r="1.2" fill={color} />
          <Circle cx="12" cy="7" r="1.2" fill={color} />
          <Circle cx="17" cy="7" r="1.2" fill={color} />
          <Circle cx="7" cy="12" r="1.2" fill={color} />
          <Circle cx="12" cy="12" r="1.2" fill={color} />
          <Circle cx="17" cy="12" r="1.2" fill={color} />
          <Circle cx="7" cy="17" r="1.2" fill={color} />
          <Circle cx="12" cy="17" r="1.2" fill={color} />
          <Circle cx="17" cy="17" r="1.2" fill={color} />
        </>
      )}
    </Svg>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const { language } = usePreferences();
  const t = copy[language];
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: isIOS ? 0 : 12,
          shadowColor: '#000000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: -3 },
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          paddingBottom: isWeb ? 5 : 1,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.background },
              ]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.home,
          tabBarIcon: ({ color }) => <TabIcon name="church" color={color} />,
        }}
      />
      <Tabs.Screen name="live" options={{ title: t.live, tabBarIcon: ({ color }) => <TabIcon name="broadcast" color={color} /> }} />
      <Tabs.Screen name="calendar" options={{ title: t.calendar, tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} /> }} />
      <Tabs.Screen name="library" options={{ title: t.library, tabBarIcon: ({ color }) => <TabIcon name="book" color={color} /> }} />
      <Tabs.Screen name="more" options={{ title: t.more, tabBarIcon: ({ color }) => <TabIcon name="more" color={color} /> }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return <ClassicTabLayout />;
}
