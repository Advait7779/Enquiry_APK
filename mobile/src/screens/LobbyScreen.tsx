import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Header } from '../components/Header';
import { VisitorCard } from '../components/VisitorCard';
import { apiClient } from '../api/client';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AnimatedListItem } from '../components/AnimatedListItem';
import { AnimatedRefreshIcon } from '../components/AnimatedRefreshIcon';
import { IEnquiry } from '../types';
import {
  LobbyQueueSvg,
  RefreshSvg,
  NewClientSvg
} from '../components/SvgIcons';

export const LobbyScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [enquiries, setEnquiries] = useState<IEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [relativeTime, setRelativeTime] = useState(new Date());
  const requestSequence = useRef(0);

  const fetchData = useCallback(async (silent = false) => {
    const requestId = ++requestSequence.current;
    try {
      if (!silent) setLoading(true);
      setLoadError('');
      const list = await apiClient.getEnquiries({ period: 'today' });
      if (requestId === requestSequence.current) {
        setEnquiries(list);
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
  }, []);

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

  return (
    <AnimatedScreen style={styles.container}>
      <Header
        title="ADVOCATE DESK"
        subtitle="Today's Clients"
        showTime={true}
      />

      {/* Section Header */}
      <View style={styles.listHeader}>
        <View style={styles.listHeaderLeft}>
          <Text style={styles.listTitle}>Today's Clients</Text>
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Refresh today’s clients"
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
          data={enquiries}
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
                relativeTime={relativeTime}
              />
            </AnimatedListItem>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <LobbyQueueSvg size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No Clients Today</Text>
              <Text style={styles.emptySubtitle}>No clients have entered the office today yet.</Text>
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
