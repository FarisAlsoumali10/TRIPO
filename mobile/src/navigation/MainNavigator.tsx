import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MainTabParamList, HomeStackParamList, ProfileStackParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import ItineraryDetailScreen from '../screens/itinerary/ItineraryDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SmartProfileScreen from '../screens/profile/SmartProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// Home Tab Stack
const HomeNavigator = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'For You' }}
      />
      <HomeStack.Screen
        name="ItineraryDetail"
        component={ItineraryDetailScreen}
        options={{ title: 'Itinerary' }}
      />
    </HomeStack.Navigator>
  );
};

// Profile Tab Stack
const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <ProfileStack.Screen
        name="SmartProfile"
        component={SmartProfileScreen}
        options={{ title: 'Smart Profile' }}
      />
    </ProfileStack.Navigator>
  );
};

// Main Tab Navigator
const MainNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'For You',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="compass" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
