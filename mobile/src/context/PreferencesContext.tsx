import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'advocate-desk-preferences-v1';

interface Preferences {
  urgentAlertsEnabled: boolean;
  whatsAppShortcutsEnabled: boolean;
  notificationSoundEnabled: boolean;
}

interface PreferencesContextValue extends Preferences {
  setUrgentAlertsEnabled: (enabled: boolean) => void;
  setWhatsAppShortcutsEnabled: (enabled: boolean) => void;
  setNotificationSoundEnabled: (enabled: boolean) => void;
}

const defaults: Preferences = {
  urgentAlertsEnabled: true,
  whatsAppShortcutsEnabled: true,
  notificationSoundEnabled: true,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export const PreferencesProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [preferences, setPreferences] = useState(defaults);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (!active || !saved) return;
        const parsed = JSON.parse(saved) as Partial<Preferences>;
        setPreferences({
          urgentAlertsEnabled: parsed.urgentAlertsEnabled ?? defaults.urgentAlertsEnabled,
          whatsAppShortcutsEnabled: parsed.whatsAppShortcutsEnabled ?? defaults.whatsAppShortcutsEnabled,
          notificationSoundEnabled: parsed.notificationSoundEnabled ?? defaults.notificationSoundEnabled,
        });
      })
      .catch((error) => console.warn('Could not load app preferences:', error));
    return () => { active = false; };
  }, []);

  const update = useCallback((changes: Partial<Preferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...changes };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        .catch((error) => console.warn('Could not save app preferences:', error));
      return next;
    });
  }, []);

  const value = useMemo<PreferencesContextValue>(() => ({
    ...preferences,
    setUrgentAlertsEnabled: (enabled) => update({ urgentAlertsEnabled: enabled }),
    setWhatsAppShortcutsEnabled: (enabled) => update({ whatsAppShortcutsEnabled: enabled }),
    setNotificationSoundEnabled: (enabled) => update({ notificationSoundEnabled: enabled }),
  }), [preferences, update]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error('usePreferences must be used inside PreferencesProvider');
  return value;
}
