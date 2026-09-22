import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AppNotification, notificationService } from '../services/notificationService';
import { colors } from '../theme/colors';
import { formatTime } from '../utils/date';
import { ShieldCheckSvg } from './SvgIcons';

export const NotificationsPanelModal: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsubList = notificationService.subscribe((list) => {
      setNotifications(list);
    });
    const unsubPanel = notificationService.subscribePanel((open) => {
      setVisible(open);
    });
    return () => {
      unsubList();
      unsubPanel();
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    notificationService.closePanel();
  };

  const handleClearItem = (id: string) => {
    notificationService.clearNotification(id);
  };

  const handleClearAll = () => {
    notificationService.clearAll();
  };

  const getIconName = (type: AppNotification['type']) => {
    switch (type) {
      case 'urgent':
        return 'flash' as const;
      default:
        return 'notifications' as const;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.panelContainer}>
            {/* Panel Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerIconBadge}>
                  <Ionicons name="notifications" size={18} color={colors.accent} />
                </View>
                <Text style={styles.headerTitle}>Chamber Notifications</Text>
                {notifications.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{notifications.length}</Text>
                  </View>
                )}
              </View>

              <View style={styles.headerRight}>
                {notifications.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearAll}
                    style={styles.clearAllBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications List */}
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {notifications.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconWrap}>
                    <ShieldCheckSvg size={36} color={colors.accent} />
                  </View>
                  <Text style={styles.emptyTitle}>All Notifications Cleared</Text>
                  <Text style={styles.emptySubtitle}>
                    New client arrivals, urgent entries, and chamber alerts will stay listed here until you dismiss them.
                  </Text>
                </View>
              ) : (
                notifications.map((item) => (
                  <View key={item.id} style={styles.notificationCard}>
                    <View style={styles.cardIconWrap}>
                      <Ionicons
                        name={getIconName(item.type)}
                        size={18}
                        color={colors.accent}
                      />
                    </View>

                    <View style={styles.cardBody}>
                      <View style={styles.cardTopLine}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={styles.cardTime}>
                          {formatTime(new Date(item.timestamp))}
                        </Text>
                      </View>
                      <Text style={styles.cardMessage}>{item.message}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleClearItem(item.id)}
                      style={styles.cardDeleteBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle-outline" size={19} color="rgba(255, 255, 255, 0.5)" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 21, 38, 0.7)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  panelContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
    minHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 155, 60, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  clearAllText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary, // App Theme Navy
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: colors.accent, // App Theme Gold
    padding: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 155, 60, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  cardBody: {
    flex: 1,
    marginRight: 8,
  },
  cardTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    flex: 1,
    marginRight: 6,
  },
  cardTime: {
    fontSize: 10.5,
    color: colors.accent,
    fontWeight: '700',
  },
  cardMessage: {
    fontSize: 11.5,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  cardDeleteBtn: {
    paddingTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 45,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(200, 155, 60, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default NotificationsPanelModal;
