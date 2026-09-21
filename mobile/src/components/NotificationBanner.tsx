import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppNotification, notificationService } from '../services/notificationService';
import { colors } from '../theme/colors';

export const NotificationBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<AppNotification | null>(null);
  const translateY = useRef(new Animated.Value(-140)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((_list, latest) => {
      if (!latest) return;
      setCurrent(latest);

      if (dismissTimer.current) clearTimeout(dismissTimer.current);

      // Slide down quickly and smoothly
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 2,
        speed: 24, // Fast, responsive spring
      }).start();

      // Auto dismiss after 4s
      dismissTimer.current = setTimeout(() => {
        dismiss();
      }, 4000);
    });

    return () => {
      unsubscribe();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [translateY]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 120, // Snappy 120ms exit
      useNativeDriver: true,
    }).start(() => {
      setCurrent(null);
    });
  };

  if (!current) return null;

  const getIconName = () => {
    switch (current.type) {
      case 'urgent':
        return 'flash' as const;
      case 'cabin':
        return 'checkmark-circle' as const;
      case 'wait':
        return 'hourglass' as const;
      default:
        return 'notifications' as const;
    }
  };

  const handleBannerPress = () => {
    dismiss();
    notificationService.openPanel();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 10) + 4,
          transform: [{ translateY }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.banner}
        activeOpacity={0.9}
        onPress={handleBannerPress}
      >
        <View style={styles.iconCol}>
          <Ionicons name={getIconName()} size={20} color={colors.accent} />
        </View>
        <View style={styles.contentCol}>
          <Text style={styles.title} numberOfLines={1}>
            {current.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {current.message}
          </Text>
        </View>
        <TouchableOpacity
          onPress={dismiss}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color="rgba(255, 255, 255, 0.6)" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.primary, // Official Chamber Navy app theme
    borderWidth: 1.5,
    borderColor: colors.accent, // Official Chamber Gold accent border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  iconCol: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: 'rgba(200, 155, 60, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(200, 155, 60, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contentCol: {
    flex: 1,
    marginRight: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: '#FFFFFF', // Pure white
  },
  message: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)', // Crisp slate-white
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});

export default NotificationBanner;
