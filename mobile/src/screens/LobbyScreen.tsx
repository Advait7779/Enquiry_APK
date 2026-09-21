import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { VisitorCard } from '../components/VisitorCard';
import { apiClient } from '../api/client';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AnimatedListItem } from '../components/AnimatedListItem';
import { AnimatedRefreshIcon } from '../components/AnimatedRefreshIcon';
import { IEnquiry, TodayStats } from '../types';
import {
  LobbyQueueSvg,
  HourglassSvg,
  ConsultationSvg,
  CompletedCheckSvg,
  RefreshSvg,
  NewClientSvg
} from '../components/SvgIcons';
import { usePreferences } from '../context/PreferencesContext';
import { notificationService } from '../services/notificationService';

export const LobbyScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [enquiries, setEnquiries] = useState<IEnquiry[]>([]);
  const [stats, setStats] = useState<TodayStats>({
    totalToday: 0,
    waiting: 0,
    inConsultation: 0,
    completed: 0,
    urgent: 0,
  });
  const { notificationSoundEnabled, waitRemindersEnabled } = usePreferences();
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Waiting' | 'In Consultation' | 'Completed'>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const [relativeTime, setRelativeTime] = useState(new Date());
  const requestSequence = useRef(0);
  const alertedWaitIds = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async (silent = false) => {
    const requestId = ++requestSequence.current;
    try {
      if (!silent) setLoading(true);
      setLoadError('');
      const [list, currentStats] = await Promise.all([
        apiClient.getEnquiries({
          status: selectedFilter === 'All' ? undefined : selectedFilter,
          period: 'today',
        }),
        apiClient.getTodayStats(),
      ]);
      if (requestId === requestSequence.current) {
        setEnquiries(list);
        setStats(currentStats);

        // Check for visitors waiting > 30 mins
        if (waitRemindersEnabled) {
          const now = Date.now();
          for (const item of list) {
            if (item.status.toLowerCase() === 'waiting' && !alertedWaitIds.current.has(item.id)) {
              const waitMins = Math.floor((now - new Date(item.entryTime).getTime()) / 60000);
              if (waitMins >= 30) {
                alertedWaitIds.current.add(item.id);
                notificationService.notifyLongWait(item.fullName, waitMins, notificationSoundEnabled);
                break;
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (requestId === requestSequence.current) {
        setLoadError(error.message || 'Could not load today\'s queue.');
      }
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selectedFilter, waitRemindersEnabled, notificationSoundEnabled]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
      const syncTimer = setInterval(() => fetchData(true), 10000);
      const timeTimer = setInterval(() => setRelativeTime(new Date()), 60000);
      return () => {
        clearInterval(syncTimer);
        clearInterval(timeTimer);
        requestSequence.current += 1;
      };
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const handleStatusChange = async (enquiryId: string, newStatus: IEnquiry['status']) => {
    const current = enquiries.find((item) => item.id === enquiryId);
    if (!current || updatingIds.includes(enquiryId)) return;
    setUpdatingIds((ids) => [...ids, enquiryId]);
    try {
      await apiClient.updateStatus(enquiryId, newStatus, current.updatedAt);
      if (newStatus === 'Completed') {
        notificationService.notifyCabinAvailable(current.fullName, notificationSoundEnabled);
      }
      await fetchData(true);
    } catch (error: any) {
      setLoadError(error.message || 'Could not update the client status.');
      await fetchData(true);
    } finally {
      setUpdatingIds((ids) => ids.filter((id) => id !== enquiryId));
    }
  };

  const filteredEnquiries = enquiries.filter((e) => {
    if (selectedFilter === 'All') return true;
    return e.status.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <AnimatedScreen style={styles.container}>
      <Header
        title="ADVOCATE DESK"
        subtitle="Today's Lobby Queue"
        showTime={true}
      />

      {/* 4 Equal-Width Stat Filter Cards in Single Static Row (No Horizontal Scroll) */}
      <View style={styles.statsBarContainer}>
        <View style={styles.statsBarRow}>
          <StatCard
            title="All"
            count={stats.totalToday}
            icon={(color) => <LobbyQueueSvg size={14} color={color} />}
            color={colors.primary}
            bgColor="#E2E8F0"
            isSelected={selectedFilter === 'All'}
            onPress={() => setSelectedFilter('All')}
          />

          <StatCard
            title="Waiting"
            count={stats.waiting}
            icon={(color) => <HourglassSvg size={14} color={color} />}
            color={colors.status.waitingText}
            bgColor={colors.status.waitingBg}
            isSelected={selectedFilter === 'Waiting'}
            onPress={() => setSelectedFilter('Waiting')}
          />

          <StatCard
            title="In Consult"
            count={stats.inConsultation}
            icon={(color) => <ConsultationSvg size={14} color={color} />}
            color={colors.status.inConsultationText}
            bgColor={colors.status.inConsultationBg}
            isSelected={selectedFilter === 'In Consultation'}
            onPress={() => setSelectedFilter('In Consultation')}
          />

          <StatCard
            title="Completed"
            count={stats.completed}
            icon={(color) => <CompletedCheckSvg size={14} color={color} />}
            color={colors.status.completedText}
            bgColor={colors.status.completedBg}
            isSelected={selectedFilter === 'Completed'}
            onPress={() => setSelectedFilter('Completed')}
          />
        </View>
      </View>

      {/* Section Header */}
      <View style={styles.listHeader}>
        <View style={styles.listHeaderLeft}>
          <Text style={styles.listTitle}>
            {selectedFilter === 'All' ? "Today's Client Queue" : `${selectedFilter} (${filteredEnquiries.length})`}
          </Text>
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Refresh today’s lobby"
          style={styles.refreshBtn}
          onPress={onRefresh}
        >
          <AnimatedRefreshIcon active={refreshing || loading}>
            <View style={{ marginRight: 5 }}>
            <RefreshSvg size={13} color={colors.primary} />
            </View>
          </AnimatedRefreshIcon>
          <Text style={styles.refreshText}>Refresh</Text>
        </AnimatedPressable>
      </View>

      {/* Error Banner */}
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

      {/* Visitors List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading client register...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEnquiries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <VisitorCard
                enquiry={item}
                onPress={() => navigation.navigate('Detail', { enquiryId: item.id })}
                onStatusChange={(newStatus) => handleStatusChange(item.id, newStatus)}
                statusUpdating={updatingIds.includes(item.id)}
                relativeTime={relativeTime}
              />
            </AnimatedListItem>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <LobbyQueueSvg size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Visitors in this view</Text>
              <Text style={styles.emptySubtitle}>
                {selectedFilter === 'All'
                  ? 'No clients have entered the office today yet.'
                  : `No visitors currently marked as "${selectedFilter}".`}
              </Text>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Record new client entry"
                style={styles.newEntryBtn}
                onPress={() => navigation.navigate('NewEntry')}
              >
                <View style={{ marginRight: 6 }}>
                  <NewClientSvg size={18} color="#FFFFFF" />
                </View>
                <Text style={styles.newEntryBtnText}>Record New Client Entry</Text>
              </AnimatedPressable>
            </View>
          }
        />
      )}
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  statsBarContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsBarRow: {
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  listHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  refreshText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  newEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  newEntryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LobbyScreen;
