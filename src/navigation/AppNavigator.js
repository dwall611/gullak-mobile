import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { OverviewScreen } from '../screens/OverviewScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { SpendingScreen } from '../screens/SpendingScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../utils/theme';

const Tab = createBottomTabNavigator();

const tabBarStyle = {
  backgroundColor: '#0f172a',
  borderTopColor: '#1e293b',
  borderTopWidth: 1,
  height: Platform.OS === 'ios' ? 84 : 64,
  paddingTop: 8,
  paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  elevation: 0,
  shadowOpacity: 0,
};

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            switch (route.name) {
              case 'Overview':
                iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                break;
              case 'Transactions':
                iconName = focused ? 'list' : 'list-outline';
                break;
              case 'Spending':
                iconName = focused ? 'wallet' : 'wallet-outline';
                break;
              case 'Analytics':
                iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                break;
              case 'Settings':
                iconName = focused ? 'settings' : 'settings-outline';
                break;
              default:
                iconName = 'ellipse-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Overview" component={OverviewScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="Spending" component={SpendingScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
