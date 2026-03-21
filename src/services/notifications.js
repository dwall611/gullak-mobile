/**
 * Gullak Mobile - Notification Service
 * 
 * Manages local push notifications for alerts using expo-notifications.
 * Tracks which alerts have been notified to avoid duplicates.
 */

import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFIED_ALERTS_KEY = '@gullak_notified_alerts';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions
 * @returns {Promise<boolean>} true if permissions granted
 */
export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[Notifications] Permission denied');
      return false;
    }

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

    return true;
  } catch (error) {
    console.error('[Notifications] Permission error:', error);
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
    await Haptics.notificationAsync(
      alert.severity === 'critical' 
        ? Haptics.NotificationFeedbackType.Error
        : alert.severity === 'warning'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    );

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
export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
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
