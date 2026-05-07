import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import AnimatedTabBar from '../components/AnimatedTabBar';
import HomeScreen from '../screens/HomeScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import MyScreen from '../screens/MyScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SourceManageScreen from '../screens/SourceManageScreen';
import PlayerScreen from '../screens/PlayerScreen';
import WatchHistoryScreen from '../screens/WatchHistoryScreen';
import FollowingScreen from '../screens/FollowingScreen';
import AboutScreen from '../screens/AboutScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
        } as any,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ title: 'Animer', tabBarLabel: '首页', tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tab.Screen name="Categories" component={CategoriesScreen}
        options={{ title: '分类探索', tabBarLabel: '分类', tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="grid" size={size} color={color} /> }} />
      <Tab.Screen name="My" component={MyScreen}
        options={{ title: '我的', tabBarLabel: '我的', tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="SourceManage" component={SourceManageScreen} />
      <Stack.Screen name="Player" component={PlayerScreen} options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="WatchHistory" component={WatchHistoryScreen} />
      <Stack.Screen name="Following" component={FollowingScreen} />
      <Stack.Screen name="About" component={AboutScreen} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
