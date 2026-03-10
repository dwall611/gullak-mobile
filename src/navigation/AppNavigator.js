import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { HomeScreen } from '../screens/HomeScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { AccountsScreen } from '../screens/AccountsScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { CashForecastScreen } from '../screens/CashForecastScreen';
import { RewardsScreen } from '../screens/RewardsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { colors } from '../utils/theme';

const Tab = createBottomTabNavigator();
const MoreStack = createStackNavigator();

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

const stackScreenOptions = {
  headerStyle: {
    backgroundColor: '#0f172a',
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    color: '#f1f5f9',
    fontWeight: '600',
  },
  headerBackTitleVisible: false,
  cardStyle: { backgroundColor: '#0f172a' },
};

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={stackScreenOptions}>
      <MoreStack.Screen
        name="MoreHome"
        component={MoreScreen}
        options={{ headerShown: false }}
      />
      <MoreStack.Screen
        name="CashForecast"
        component={CashForecastScreen}
        options={{ title: 'Cash Forecast', headerShown: false }}
      />
      <MoreStack.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{ title: 'Rewards', headerShown: false }}
      />
      <MoreStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings', headerShown: false }}
      />
    </MoreStack.Navigator>
  );
}

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
              case 'Home':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Transactions':
                iconName = focused ? 'list' : 'list-outline';
                break;
              case 'Analytics':
                iconName = focused ? 'bar-chart' : 'bar-chart-outline';
                break;
              case 'Accounts':
                iconName = focused ? 'wallet' : 'wallet-outline';
                break;
              case 'More':
                iconName = focused ? 'grid' : 'grid-outline';
                break;
              default:
                iconName = 'ellipse-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        <Tab.Screen name="Accounts" component={AccountsScreen} />
        <Tab.Screen name="More" component={MoreNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
