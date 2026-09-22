import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = 'advocate-desk-notifications-list-v1';

export interface AppNotification {
  id: string;
  type: 'urgent' | 'normal';
  title: string;
  message: string;
  timestamp: number;
}

type NotificationListener = (notifications: AppNotification[], latest?: AppNotification) => void;
type PanelListener = (isOpen: boolean) => void;

let notificationsList: AppNotification[] = [];
let listeners: NotificationListener[] = [];
let panelListeners: PanelListener[] = [];
let isLoaded = false;

// Load persisted notifications from storage
async function loadPersisted(): Promise<void> {
  if (isLoaded) return;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AppNotification[];
      notificationsList = Array.isArray(parsed)
        ? parsed.filter((item) => item?.type === 'urgent' || item?.type === 'normal')
        : [];
    }
    isLoaded = true;
    notifyAll();
  } catch (e) {
    console.warn('Could not load saved notifications:', e);
  }
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notificationsList.slice(0, 50)));
  } catch (e) {
    console.warn('Could not persist notifications:', e);
  }
}

function notifyAll(latest?: AppNotification): void {
  for (const listener of listeners) {
    try {
      listener([...notificationsList], latest);
    } catch (err) {
      console.warn('Listener notification error:', err);
    }
  }
}

export const notificationService = {
  async initialize(): Promise<void> {
    await loadPersisted();
  },

  getNotifications(): AppNotification[] {
    return [...notificationsList];
  },

  subscribe(listener: NotificationListener): () => void {
    listeners.push(listener);
    // Send immediate initial state
    listener([...notificationsList]);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  openPanel(): void {
    for (const l of panelListeners) {
      l(true);
    }
  },

  closePanel(): void {
    for (const l of panelListeners) {
      l(false);
    }
  },

  subscribePanel(listener: PanelListener): () => void {
    panelListeners.push(listener);
    return () => {
      panelListeners = panelListeners.filter((l) => l !== listener);
    };
  },

  async clearNotification(id: string): Promise<void> {
    notificationsList = notificationsList.filter((n) => n.id !== id);
    await persist();
    notifyAll();
  },

  async clearAll(): Promise<void> {
    notificationsList = [];
    await persist();
    notifyAll();
  },

  // 1. New Client Intake (Urgent or Normal)
  async notifyNewClient(name: string, purpose: string, isUrgent: boolean, soundEnabled = true): Promise<void> {
    const title = isUrgent ? '⚡ URGENT: Client Entry' : '🔔 New Client Recorded';
    const message = isUrgent
      ? `${name} was recorded for ${purpose}. Priority attention needed.`
      : `${name} was added for ${purpose}.`;

    // Vibration
    if (soundEnabled) {
      try {
        if (isUrgent) {
          Vibration.vibrate([0, 250, 150, 300]);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        } else {
          Vibration.vibrate(120);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      } catch {}
    }

    const item: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: isUrgent ? 'urgent' : 'normal',
      title,
      message,
      timestamp: Date.now(),
    };

    notificationsList = [item, ...notificationsList];
    await persist();
    notifyAll(item);
  },
};
