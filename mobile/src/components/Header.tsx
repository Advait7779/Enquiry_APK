import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { formatTime } from '../utils/date';
import { BriefcaseSvg, ClockSvg } from './SvgIcons';
import { notificationService } from '../services/notificationService';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showTime?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'ADVOCATE DESK',
  subtitle = "Today's Lobby Queue",
  showTime = true
}) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 360;
  const isTablet = width > 600;

  const [currentTime, setCurrentTime] = useState(new Date());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!showTime) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, [showTime]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((list) => {
      setUnreadCount(list.length);
    });
    return unsubscribe;
  }, []);

  // Ensure ample top padding above status bar / camera notch
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 36) + 4;

  return (
    <View style={[styles.container, { paddingTop: safeTopPadding }]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} translucent />
      <View style={styles.topRow}>
        {/* Left: Icon + Title & Subtitle */}
        <View style={styles.titleContainer}>
          <View style={[styles.iconBadge, isTablet && styles.iconBadgeTablet]}>
            <BriefcaseSvg size={isTablet ? 18 : 15} color={colors.accent} />
          </View>
          <View style={styles.titleTextContainer}>
            <Text
              style={[
                styles.title,
                isSmallScreen && styles.titleSmall,
                isTablet && styles.titleTablet,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.85}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  isTablet && styles.subtitleTablet,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.85}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Right Actions: Compact Time Badge & Notification Bell */}
        <View style={styles.rightActions}>
          {showTime && (
            <View style={[styles.timeBadge, isTablet && styles.timeBadgeTablet]}>
              <View style={styles.timeIcon}>
                <ClockSvg size={isTablet ? 12 : 10.5} color={colors.accent} />
              </View>
              <Text style={[styles.timeText, isTablet && styles.timeTextTablet]}>
                {formatTime(currentTime)}
              </Text>
            </View>
          )}

          {/* Chamber Notifications Bell */}
          <TouchableOpacity
            style={styles.bellBtn}
            onPress={() => notificationService.openPanel()}
            activeOpacity={0.75}
            accessibilityLabel="Notifications Panel"
            hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}
          >
            <Ionicons name="notifications-outline" size={16} color={colors.accent} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    paddingBottom: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryLight,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  titleTextContainer: {
    justifyContent: 'center',
    flexShrink: 1,
    minWidth: 0,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: 'rgba(200, 155, 60, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(200, 155, 60, 0.3)',
    marginRight: 8,
  },
  iconBadgeTablet: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 10,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textInverse,
    letterSpacing: 0.3,
  },
  titleSmall: {
    fontSize: 12.5,
  },
  titleTablet: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  subtitleTablet: {
    fontSize: 11.5,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 6,
    paddingVertical: 3.5,
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: 'rgba(200, 155, 60, 0.25)',
  },
  timeBadgeTablet: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 7,
  },
  timeIcon: {
    marginRight: 4,
  },
  timeText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  timeTextTablet: {
    fontSize: 12,
  },
  bellBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: colors.primaryDark,
    borderWidth: 1,
    borderColor: 'rgba(200, 155, 60, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: colors.accent,
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.2,
    borderColor: colors.primary,
  },
  bellBadgeText: {
    color: colors.primary,
    fontSize: 8.5,
    fontWeight: '900',
  },
});

export default Header;
