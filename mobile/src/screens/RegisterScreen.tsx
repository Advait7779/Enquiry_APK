import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Header } from '../components/Header';
import { VisitorRowItem } from '../components/VisitorRowItem';
import { apiClient } from '../api/client';
import { IEnquiry } from '../types';
import { RefreshSvg, ExportDownloadSvg } from '../components/SvgIcons';
import { exportCsvFromServer } from '../utils/exporter';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AnimatedListItem } from '../components/AnimatedListItem';
import { AnimatedRefreshIcon } from '../components/AnimatedRefreshIcon';

type PeriodFilter = 'All' | 'Today' | 'Month' | 'Year';

const PAGE_SIZE = 10;

function getPeriodRange(period: PeriodFilter): { period?: 'today' | 'month' | 'year' } {
  if (period === 'All') return {};
  return { period: period === 'Today' ? 'today' : period === 'Month' ? 'month' : 'year' };
}

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  const [records, setRecords] = useState<IEnquiry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const requestSequence = useRef(0);

  const filter = { ...getPeriodRange(periodFilter), search: debouncedSearch || undefined };

  const fetchEnquiries = useCallback(async (silent = false) => {
    const requestId = ++requestSequence.current;
    try {
      if (!silent) setLoading(true);
      setLoadError('');
      const page = await apiClient.getEnquiryPage(filter, currentPage, PAGE_SIZE);
      if (requestId !== requestSequence.current) return;
      setRecords(page.items);
      setTotalRecords(page.total);
      setTotalPages(page.totalPages);
      if (currentPage > page.totalPages) setCurrentPage(page.totalPages);
    } catch (error: any) {
      if (requestId === requestSequence.current) setLoadError(error.message || 'Could not load the client register.');
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [currentPage, debouncedSearch, periodFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, periodFilter]);

  useEffect(() => {
    if (!isFocused) return;
    fetchEnquiries();
    const timer = setInterval(() => fetchEnquiries(true), 15000);
    return () => {
      clearInterval(timer);
      requestSequence.current += 1;
    };
  }, [isFocused, fetchEnquiries]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      await exportCsvFromServer(apiClient.getCsvDownloadRequest(filter), 'Office_Visitor_Register');
    } catch (error: any) {
      setLoadError(error.message || 'Could not export the visitor register.');
    } finally {
      setExporting(false);
    }
  };

  const startRecordNumber = totalRecords === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endRecordNumber = Math.min(currentPage * PAGE_SIZE, totalRecords);

  return (
    <AnimatedScreen style={styles.container}>
      <Header
        title="ALL VISITOR RECORDS"
        subtitle="Complete Chamber Client Register"
        showTime={false}
      />

      {/* Top Search & Export Bar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Search by client name, mobile, matter..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </AnimatedPressable>
          )}
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Export filtered register as CSV"
          style={styles.exportBtn}
          onPress={handleExportCSV}
          disabled={exporting || totalRecords === 0}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <View style={{ marginRight: 5 }}>
                <ExportDownloadSvg size={15} color="#FFFFFF" />
              </View>
              <Text style={styles.exportText}>CSV</Text>
            </>
          )}
        </AnimatedPressable>
      </View>

      {/* Period Filter Tabs (All Time, Today, This Month, This Year) */}
      <View style={styles.filterSection}>
        <View style={styles.periodRow}>
          {(['All', 'Today', 'Month', 'Year'] as const).map((period) => {
            const isSelected = periodFilter === period;
            const label =
              period === 'All'
                ? 'All Time'
                : period === 'Today'
                ? 'Today'
                : period === 'Month'
                ? 'This Month'
                : 'This Year';
            return (
              <AnimatedPressable
                key={period}
                accessibilityRole="button"
                accessibilityLabel={`Filter records by ${label}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setPeriodFilter(period)}
                style={[styles.periodTab, isSelected && styles.periodTabSelected]}
              >
                <Text style={[styles.periodTabText, isSelected && styles.periodTabTextSelected]}>
                  {label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      {/* Results & Count Header */}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          Showing <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{startRecordNumber}–{endRecordNumber}</Text> of <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{totalRecords}</Text> records
        </Text>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Reload client records"
          onPress={() => fetchEnquiries()}
          style={styles.reloadBtn}
        >
          <AnimatedRefreshIcon active={loading}>
            <View style={{ marginRight: 4 }}>
              <RefreshSvg size={13} color={colors.primary} />
            </View>
          </AnimatedRefreshIcon>
          <Text style={styles.reloadText}>Reload</Text>
        </AnimatedPressable>
      </View>

      {/* Error Banner */}
      {loadError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

      {/* Records List (Compact One-Row Items) */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching chamber register...</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <AnimatedListItem index={index}>
              <VisitorRowItem
                enquiry={item}
                onPress={() => navigation.navigate('Detail', { enquiryId: item.id })}
              />
            </AnimatedListItem>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={38} color={colors.textMuted} style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No matching client records</Text>
              <Text style={styles.emptySubtitle}>
                Try selecting a different time period or adjusting your search keywords.
              </Text>
            </View>
          }
          ListFooterComponent={
            totalRecords > PAGE_SIZE ? (
              <View style={styles.paginationRow}>
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous page"
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <Ionicons name="chevron-back" size={15} color={currentPage === 1 ? colors.textMuted : colors.primary} style={{ marginRight: 3 }} />
                  <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>Previous</Text>
                </AnimatedPressable>

                <View style={styles.pageIndicatorPill}>
                  <Text style={styles.pageIndicatorText}>
                    Page {currentPage} of {totalPages}
                  </Text>
                </View>

                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityLabel="Next page"
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>Next</Text>
                  <Ionicons name="chevron-forward" size={15} color={currentPage === totalPages ? colors.textMuted : colors.primary} style={{ marginLeft: 3 }} />
                </AnimatedPressable>
              </View>
            ) : null
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
  },
  exportText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: colors.surfaceSubtle,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTabTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  countText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reloadText: {
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  pageBtnDisabled: {
    opacity: 0.4,
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pageBtnTextDisabled: {
    color: colors.textMuted,
  },
  pageIndicatorPill: {
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pageIndicatorText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});

export default RegisterScreen;
