import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  Share,
  Platform,
  useWindowDimensions
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { StatusBadge } from '../components/StatusBadge';
import { UrgencyBadge } from '../components/UrgencyBadge';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { apiClient } from '../api/client';
import { IEnquiry } from '../types';
import { formatFullDate, formatTime } from '../utils/date';
import { CallSvg, WhatsAppSvg, TrashSvg } from '../components/SvgIcons';
import { usePreferences } from '../context/PreferencesContext';
import { toDialNumber, toWhatsAppNumber } from '../utils/contact';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { notificationService } from '../services/notificationService';

type ParamList = {
  Detail: {
    enquiryId: string;
  };
};

export const DetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<ParamList, 'Detail'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { enquiryId } = route.params;
  const { urgentAlertsEnabled, whatsAppShortcutsEnabled, notificationSoundEnabled } = usePreferences();
  const [enquiry, setEnquiry] = useState<IEnquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [loadError, setLoadError] = useState('');
  const requestSequence = useRef(0);

  // Delete Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'danger' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const fetchDetail = useCallback(async (silent = false) => {
    const requestId = ++requestSequence.current;
    try {
      if (!silent) setLoading(true);
      setLoadError('');
      const data = await apiClient.getEnquiryById(enquiryId);
      if (requestId !== requestSequence.current) return;
      if (data) {
        setEnquiry(data);
      } else {
        setLoadError('The requested enquiry record does not exist.');
      }
    } catch (err: any) {
      if (requestId === requestSequence.current) setLoadError(err.message || 'Could not load client details.');
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [enquiryId]);

  useEffect(() => {
    fetchDetail();
    const timer = setInterval(() => fetchDetail(true), 15000);
    return () => {
      clearInterval(timer);
      requestSequence.current += 1;
    };
  }, [fetchDetail]);

  const handleCall = () => {
    if (!enquiry) return;
    const cleanNumber = toDialNumber(enquiry.contactNo);
    const url = `tel:${cleanNumber}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Cannot make call', `Phone dialer not available for ${enquiry.contactNo}`);
        }
      })
      .catch(() => Alert.alert('Error', 'Unable to initiate call'));
  };

  const handleWhatsApp = () => {
    if (!enquiry) return;
    const cleanNumber = toWhatsAppNumber(enquiry.contactNo);
    if (!cleanNumber) {
      Alert.alert('Country code required', 'Add the country code to this contact number before using WhatsApp.');
      return;
    }
    const message = encodeURIComponent(
      `Hello ${enquiry.fullName}, greetings from the Advocate Office regarding your enquiry (${enquiry.purpose}).`
    );
    const url = `https://wa.me/${cleanNumber}?text=${message}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Please check if app is installed.');
    });
  };

  const handleShareSummary = async () => {
    if (!enquiry) return;
    const text =
      `🏛️ ADVOCATE OFFICE - CLIENT FILE\n` +
      `Client: ${enquiry.fullName}\n` +
      `Contact: ${enquiry.contactNo}\n` +
      `Purpose: ${enquiry.purpose}\n` +
      (enquiry.caseNumber ? `Case File: ${enquiry.caseNumber}\n` : '') +
      `Advocate: ${enquiry.assignedAdvocate || 'General Desk'}\n` +
      `Status: ${enquiry.status}\n` +
      `Arrival: ${formatFullDate(enquiry.entryTime)} at ${formatTime(enquiry.entryTime)}`;

    await Share.share({ title: `Client File - ${enquiry.fullName}`, message: text });
  };

  const handleStatusChange = async (newStatus: IEnquiry['status']) => {
    if (!enquiry || enquiry.status === newStatus) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await apiClient.updateStatus(enquiry.id, newStatus, enquiry.updatedAt);
      setEnquiry(updated);
      if (newStatus === 'Completed') {
        notificationService.notifyCabinAvailable(enquiry.fullName, notificationSoundEnabled);
      }
    } catch (error: any) {
      setAlertModalConfig({
        visible: true,
        type: 'danger',
        title: 'Status Update Failed',
        message: error.message || 'Could not update visitor status.',
      });
      await fetchDetail(true);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const confirmDelete = async () => {
    if (!enquiry) return;
    try {
      setDeleteModalVisible(false);
      await apiClient.deleteEnquiry(enquiry.id, enquiry.updatedAt);
      navigation.goBack();
    } catch (error: any) {
      setAlertModalConfig({
        visible: true,
        type: 'danger',
        title: 'Deletion Failed',
        message: error.message || 'Failed to remove client record.',
      });
      await fetchDetail(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!enquiry) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>{loadError || 'Enquiry not found.'}</Text>
        <CustomButton title="Go Back" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const entryDate = new Date(enquiry.entryTime);
  const safeTopPadding = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 36) + 6;

  return (
    <AnimatedScreen style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.topBar, { paddingTop: safeTopPadding }]}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </AnimatedPressable>
        <View style={{ flex: 1, marginHorizontal: 8 }}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {enquiry.fullName}
          </Text>
          <Text style={styles.topBarSub}>Client Consultation File</Text>
        </View>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${enquiry.fullName} summary`}
          style={styles.shareBtn}
          onPress={handleShareSummary}
        >
          <Ionicons name="share-social-outline" size={20} color={colors.accent} />
        </AnimatedPressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {enquiry.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.clientName}>{enquiry.fullName}</Text>
                {urgentAlertsEnabled ? <UrgencyBadge urgency={enquiry.urgency} /> : null}
              </View>
              <Text style={styles.contactText}>{enquiry.contactNo}</Text>
            </View>
          </View>

          {/* Direct Call & WhatsApp Buttons (Side by Side in 1 Row) */}
          <View style={styles.contactRow}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={`Call ${enquiry.fullName}`}
              style={[styles.contactActionBtn, { backgroundColor: colors.phoneCall }]}
              onPress={handleCall}
            >
              <View style={{ marginRight: 6 }}>
                <CallSvg size={15} color="#FFFFFF" />
              </View>
              <Text style={styles.contactActionText}>Direct Call</Text>
            </AnimatedPressable>

            {whatsAppShortcutsEnabled ? (
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={`Message ${enquiry.fullName} on WhatsApp`}
                style={[styles.contactActionBtn, { backgroundColor: colors.whatsappDark }]}
                onPress={handleWhatsApp}
              >
                <View style={{ marginRight: 6 }}>
                  <WhatsAppSvg size={15} color="#FFFFFF" />
                </View>
                <Text style={styles.contactActionText}>WhatsApp</Text>
              </AnimatedPressable>
            ) : null}
          </View>
        </View>

        {/* Update Visit Status (All 3 in a Single Row) */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Update Visit Status</Text>
          <View style={styles.statusSegmentRow}>
            {(['Waiting', 'In Consultation', 'Completed'] as const).map((st) => {
              const isSelected = enquiry.status === st;
              return (
                <AnimatedPressable
                  key={st}
                  accessibilityRole="button"
                  accessibilityLabel={`Set visit status to ${st}`}
                  accessibilityState={{ selected: isSelected, disabled: isUpdatingStatus, busy: isUpdatingStatus }}
                  onPress={() => handleStatusChange(st)}
                  disabled={isUpdatingStatus}
                  style={[
                    styles.statusSegmentBtn,
                    isSelected && styles.statusSegmentBtnActive,
                    isSelected && {
                      backgroundColor:
                        st === 'Waiting'
                          ? colors.status.waitingBg
                          : st === 'In Consultation'
                          ? colors.status.inConsultationBg
                          : colors.status.completedBg,
                      borderColor:
                        st === 'Waiting'
                          ? colors.status.waitingBorder
                          : st === 'In Consultation'
                          ? colors.status.inConsultationBorder
                          : colors.status.completedBorder,
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.statusSegmentText,
                      isSelected && {
                        color:
                          st === 'Waiting'
                            ? colors.status.waitingText
                            : st === 'In Consultation'
                            ? colors.status.inConsultationText
                            : colors.status.completedText,
                        fontWeight: '800'
                      }
                    ]}
                    numberOfLines={1}
                  >
                    {st}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Enquiry & Case Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Enquiry & Case Details</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Purpose / Reason:</Text>
            <Text style={styles.infoValue}>{enquiry.purpose}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chamber Advocate:</Text>
            <Text style={styles.infoValue}>{enquiry.assignedAdvocate || 'General Desk'}</Text>
          </View>

          {enquiry.caseNumber ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Case File / Ref No:</Text>
              <Text style={styles.infoValue}>{enquiry.caseNumber}</Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Arrival Time:</Text>
            <Text style={styles.infoValue}>
              {formatFullDate(entryDate)} • {formatTime(entryDate)}
            </Text>
          </View>

          {enquiry.consultationStartTime && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Consultation Started:</Text>
              <Text style={styles.infoValue}>
                {formatTime(enquiry.consultationStartTime)}
              </Text>
            </View>
          )}

          {enquiry.consultationEndTime && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Consultation Finished:</Text>
              <Text style={styles.infoValue}>
                {formatTime(enquiry.consultationEndTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Delete Record Button */}
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${enquiry.fullName} from the active register`}
          style={styles.deleteBtn}
          onPress={() => setDeleteModalVisible(true)}
        >
          <View style={{ marginRight: 6 }}>
            <TrashSvg size={16} color={colors.danger} />
          </View>
          <Text style={styles.deleteBtnText}>Remove This Client Record</Text>
        </AnimatedPressable>
      </ScrollView>

      {/* Themed Delete Confirmation Modal */}
      <CustomModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        type="danger"
        title="Remove Client Record"
        message={`Remove the record for "${enquiry.fullName}" from the active register? An audit copy will remain in the database.`}
        primaryAction={{
          text: 'Remove Record',
          variant: 'danger',
          icon: 'trash',
          onPress: confirmDelete,
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setDeleteModalVisible(false),
        }}
      />

      {/* Alert Feedback Modal */}
      <CustomModal
        visible={alertModalConfig.visible}
        onClose={() => setAlertModalConfig({ ...alertModalConfig, visible: false })}
        type={alertModalConfig.type}
        title={alertModalConfig.title}
        message={alertModalConfig.message}
        primaryAction={{
          text: 'OK',
          onPress: () => setAlertModalConfig({ ...alertModalConfig, visible: false }),
        }}
      />
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.primaryLight,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topBarSub: {
    fontSize: 11,
    color: colors.accent,
  },
  shareBtn: {
    padding: 6,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: colors.textSecondary,
  },
  notFoundText: {
    fontSize: 16,
    color: colors.danger,
    marginBottom: 16,
    textAlign: 'center',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#0F1E36',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '800',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  contactText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  contactActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  contactActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statusSegmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusSegmentBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusSegmentBtnActive: {
    borderWidth: 1.5,
  },
  statusSegmentText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13.5,
    color: colors.textPrimary,
    fontWeight: '600',
    lineHeight: 19,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 20,
  },
  deleteBtnText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default DetailScreen;
