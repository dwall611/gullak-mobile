/**
 * Gullak Mobile - Notification Service
 * 
 * Manages local push notifications for alerts using expo-notifications.
 * Tracks which alerts have been notified to avoid duplicates.
 * 
 * Also handles push notification registration with the Gullak server.
 * 
 * IMPORTANT: Uses lazy loading for native modules to prevent crashes on launch.
 * Native modules are loaded only when needed, not at import time.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFIED_ALERTS_KEY = '@gullak_notified_alerts';
const PUSH_TOKEN_KEY = '@gullak_push_token';
const API_BASE = 'http://100.84.80.76:3001/api';

// Track if notifications have been initialized
let notificationsInitialized = false;

// Lazy-loaded native modules (loaded on first use, not at import time)
let Notifications = null;
let Haptics = null;
let Device = null;

/**
 * Lazy load native modules to prevent crashes on app launch
 * Some devices may have issues with native module initialization at import time
 */
async function loadNativeModules() {
  try {
    if (!Notifications) {
      Notifications = await import('expo-notifications');
      Notifications = Notifications.default || Notifications;
    }
    if (!Haptics) {
      Haptics = await import('expo-haptics');
      Haptics = Haptics.default || Haptics;
    }
    if (!Device) {
      Device = await import('expo-device');
      Device = Device.default || Device;
    }
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to load native modules:', error);
    return false;
  }
}

/**
 * Configure notification handler safely
 * Only called during initialization, not at module import time
 */
async function configureNotificationHandler() {
  try {
    if (!Notifications) {
      const loaded = await loadNativeModules();
      if (!loaded || !Notifications) {
        console.warn('[Notifications] Native modules not available');
        return false;
      }
    }
    
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    console.log('[Notifications] Handler configured successfully');
    return true;
  } catch (error) {
    console.error('[Notifications] Failed to configure handler:', error);
    return false;
  }
}

/**
 * Request notification permissions and get Expo push token
 * @returns {Promise<string|null>} Expo push token or null if unavailable
 */
export async function registerForPushNotificationsAsync() {
  let token = null;

  try {
    // Ensure native modules are loaded
    const loaded = await loadNativeModules();
    if (!loaded) {
      console.log('[Notifications] Native modules not available');
      return null;
    }

    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.log('[Notifications] Must use physical device for Push Notifications');
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted for push notifications');
      return null;
    }

    // Get the Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'gullak-mobile', // Optional: your Expo project ID
    });
    token = tokenData.data;
    console.log('[Notifications] Got push token:', token);

    // For Android, set up notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Financial Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B6B',
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Error getting push token:', error);
    return null;
  }
}

/**
 * Register push token with Gullak server
 * @param {string} token - Expo push token
 * @param {string} deviceName - Optional device name
 * @returns {Promise<boolean>} true if registration successful
 */
export async function registerTokenWithServer(token, deviceName = null) {
  try {
    // Ensure Device module is loaded
    if (!Device) {
      await loadNativeModules();
    }
    
    const deviceDisplayName = deviceName || (Device ? (Device.modelName || Device.deviceName) : null) || 'Unknown Device';

    const response = await fetch(`${API_BASE}/push-tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        device_name: deviceDisplayName,
      }),
    });

    if (response.ok) {
      console.log('[Notifications] Push token registered with server');
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      return true;
    } else {
      const error = await response.json();
      console.error('[Notifications] Failed to register token:', error);
      return false;
    }
  } catch (error) {
    console.error('[Notifications] Error registering token with server:', error);
    return false;
  }
}

/**
 * Initialize push notifications - request permissions and register with server
 * Call this once when the app starts
 * This function is resilient and will not crash the app if notifications are unavailable
 * @returns {Promise<boolean>} true if fully initialized
 */
export async function initializePushNotifications() {
  // Prevent double initialization
  if (notificationsInitialized) {
    console.log('[Notifications] Already initialized');
    return true;
  }

  try {
    // Configure notification handler first (was causing crash at module import time)
    const handlerConfigured = configureNotificationHandler();
    if (!handlerConfigured) {
      console.warn('[Notifications] Could not configure handler, continuing anyway');
    }

    // Check if we already have a token stored
    const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

    // Request permissions and get token
    const token = await registerForPushNotificationsAsync();

    if (!token) {
      console.log('[Notifications] Could not get push token - notifications will be disabled');
      notificationsInitialized = true;
      return false;
    }

    // If token changed or not stored, register with server
    if (token !== storedToken) {
      console.log('[Notifications] Token changed, re-registering with server');
      const registered = await registerTokenWithServer(token);
      if (!registered) {
        console.warn('[Notifications] Failed to register with server, but token is available');
      }
    } else {
      console.log('[Notifications] Token already registered');
    }

    notificationsInitialized = true;
    return true;
  } catch (error) {
    console.error('[Notifications] Error initializing push notifications:', error);
    // Don't crash the app - just mark as initialized and return false
    notificationsInitialized = true;
    return false;
  }
}

/**
 * Unregister push notifications from server
 * @returns {Promise<boolean>}
 */
export async function unregisterPushNotifications() {
  try {
    const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

    if (!storedToken) {
      return true;
    }

    const response = await fetch(`${API_BASE}/push-tokens/${encodeURIComponent(storedToken)}`, {
      method: 'DELETE',
    });

    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);

    if (response.ok) {
      console.log('[Notifications] Unregistered from server');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Notifications] Error unregistering:', error);
    return false;
  }
}

/**
 * Get the set of notified alert IDs from AsyncStorage
 * @returns {Promise<Set<number>>}
 */
async function getNotifiedAlerts() {
  try {
    const stored = await AsyncStorage.getItem(NOTIFIED_ALERTS_KEY);
    if (stored) {
      const ids = JSON.parse(stored);
      return new Set(ids);
    }
    return new Set();
  } catch (error) {
    console.error('[Notifications] Error reading notified alerts:', error);
    return new Set();
  }
}

/**
 * Save the set of notified alert IDs to AsyncStorage
 * @param {Set<number>} notifiedSet
 */
async function saveNotifiedAlerts(notifiedSet) {
  try {
    const ids = Array.from(notifiedSet);
    await AsyncStorage.setItem(NOTIFIED_ALERTS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error('[Notifications] Error saving notified alerts:', error);
  }
}

/**
 * Check if an alert has already been notified
 * @param {number} alertId
 * @returns {Promise<boolean>}
 */
export async function hasBeenNotified(alertId) {
  const notified = await getNotifiedAlerts();
  return notified.has(alertId);
}

/**
 * Mark an alert as notified
 * @param {number} alertId
 */
export async function markAsNotified(alertId) {
  const notified = await getNotifiedAlerts();
  notified.add(alertId);
  await saveNotifiedAlerts(notified);
}

/**
 * Schedule a local notification for an alert
 * @param {object} alert - Alert object from API
 * @returns {Promise<string|null>} notification ID or null if failed
 */
export async function scheduleAlertNotification(alert) {
  try {
    // Ensure native modules are loaded
    const loaded = await loadNativeModules();
    if (!loaded || !Notifications || !Haptics) {
      console.warn('[Notifications] Native modules not available, skipping notification');
      return null;
    }

    // Check if already notified
    if (await hasBeenNotified(alert.id)) {
      console.log(`[Notifications] Alert ${alert.id} already notified, skipping`);
      return null;
    }

    // Get severity icon and color
    const getSeverityEmoji = (severity) => {
      switch (severity) {
        case 'critical': return '🚨';
        case 'warning': return '⚠️';
        case 'info': return 'ℹ️';
        default: return '💰';
      }
    };

    const title = getSeverityEmoji(alert.severity) + ' ' + (alert.title || 'Financial Alert');
    const body = alert.message;

    // Trigger haptic feedback
    try {
      await Haptics.notificationAsync(
        alert.severity === 'critical' 
          ? Haptics.NotificationFeedbackType.Error
          : alert.severity === 'warning'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
    } catch (hapticError) {
      console.warn('[Notifications] Haptic feedback failed:', hapticError);
    }

    // Schedule notification immediately
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { 
          alertId: alert.id,
          severity: alert.severity,
          ruleType: alert.rule_type,
          screen: 'Alerts', // Navigate to AlertsScreen on tap
        },
        sound: true,
        priority: alert.severity === 'critical' 
          ? Notifications.AndroidNotificationPriority.HIGH 
          : Notifications.AndroidNotificationPriority.DEFAULT,
        vibrate: [0, 250, 250, 250],
        badge: 1,
      },
      trigger: { seconds: 0 }, // Trigger immediately
    });

    // Mark as notified
    await markAsNotified(alert.id);

    console.log(`[Notifications] Scheduled notification ${notificationId} for alert ${alert.id}`);
    return notificationId;

  } catch (error) {
    console.error('[Notifications] Error scheduling notification:', error);
    return null;
  }
}

/**
 * Clear a notification for a specific alert
 * @param {number} alertId
 */
export async function clearAlertNotification(alertId) {
  try {
    // Ensure Notifications module is loaded
    if (!Notifications) {
      await loadNativeModules();
    }
    if (!Notifications) {
      console.warn('[Notifications] Module not available');
      return;
    }

    // Get all scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    // Find and cancel notifications for this alert
    for (const notification of scheduled) {
      if (notification.content?.data?.alertId === alertId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`[Notifications] Cancelled notification for alert ${alertId}`);
      }
    }
  } catch (error) {
    console.error('[Notifications] Error clearing notification:', error);
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications() {
  try {
    // Ensure Notifications module is loaded
    if (!Notifications) {
      await loadNativeModules();
    }
    if (!Notifications) {
      console.warn('[Notifications] Module not available');
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    console.log('[Notifications] Cleared all notifications');
  } catch (error) {
    console.error('[Notifications] Error clearing all notifications:', error);
  }
}

/**
 * Set up notification response listener
 * @param {function} handler - Function to call when notification is tapped
 * @returns {object} subscription object (call .remove() to unsubscribe)
 */
export async function addNotificationResponseListener(handler) {
  try {
    // Ensure Notifications module is loaded
    if (!Notifications) {
      await loadNativeModules();
    }
    if (!Notifications) {
      console.warn('[Notifications] Module not available, listener not registered');
      return { remove: () => {} };
    }
    
    return Notifications.addNotificationResponseReceivedListener(handler);
  } catch (error) {
    console.error('[Notifications] Error adding response listener:', error);
    return { remove: () => {} };
  }
}

/**
 * Request notification permissions (alias for registerForPushNotificationsAsync)
 * Used by OverviewScreen on mount to ensure permissions are requested early.
 * @returns {Promise<string|null>} Expo push token or null if unavailable
 */
export async function requestNotificationPermissions() {
  return registerForPushNotificationsAsync();
}

/**
 * Clean up old notified alerts (keep last 100)
 */
export async function cleanupNotifiedAlerts() {
  try {
    const notified = await getNotifiedAlerts();
    if (notified.size > 100) {
      const ids = Array.from(notified);
      const keep = new Set(ids.slice(-100)); // Keep last 100
      await saveNotifiedAlerts(keep);
      console.log(`[Notifications] Cleaned up notified alerts: ${notified.size} -> ${keep.size}`);
    }
  } catch (error) {
    console.error('[Notifications] Error cleaning up notified alerts:', error);
  }
}
