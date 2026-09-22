import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Header } from '../components/Header';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { apiClient } from '../api/client';
import { LEGAL_PURPOSES, UrgencyLevel } from '../types';
import { formatFullDate, formatTime } from '../utils/date';
import { ClockSvg } from '../components/SvgIcons';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { usePreferences } from '../context/PreferencesContext';
import { notificationService } from '../services/notificationService';
import { formatFeesPaid } from '../utils/currency';

export const NewEntryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { notificationSoundEnabled } = usePreferences();
  const isSmallScreen = width < 380;

  // Live Auto-Timestamp
  const [liveTimestamp, setLiveTimestamp] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTimestamp(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Form State
  const [fullName, setFullName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [feesPaid, setFeesPaid] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState(LEGAL_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState('');
  const [urgency, setUrgency] = useState<'Normal' | 'Urgent'>('Normal');

  // Validation & UI State
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Themed Modal State
  const [savedClientInfo, setSavedClientInfo] = useState<{
    name: string;
    phone: string;
    purpose: string;
    feesPaid: number;
    urgency: string;
    time: string;
  } | null>(null);

  const [errorModalConfig, setErrorModalConfig] = useState<{
    visible: boolean;
    type: 'danger' | 'warning';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'danger',
    title: '',
    message: '',
  });

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Client full name is required.';
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters.';
    }

    const cleanContact = contactNo.trim().replace(/[\s()-]/g, '');
    if (!cleanContact) {
      newErrors.contactNo = 'Contact number is required.';
    } else if (!/^\+?[0-9]{7,15}$/.test(cleanContact)) {
      newErrors.contactNo = 'Enter a valid mobile or WhatsApp number (7-15 digits).';
    }

    if (selectedPurpose.startsWith('Other') && !customPurpose.trim()) {
      newErrors.customPurpose = 'Please enter the specific reason for visit.';
    }

    const normalizedFees = feesPaid.trim().replace(/,/g, '');
    if (normalizedFees && !/^\d+(\.\d{1,2})?$/.test(normalizedFees)) {
      newErrors.feesPaid = 'Enter a valid amount with up to 2 decimal places.';
    } else if (normalizedFees && Number(normalizedFees) > 99999999.99) {
      newErrors.feesPaid = 'Fees paid is too large.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const finalPurpose = selectedPurpose.startsWith('Other')
        ? customPurpose.trim()
        : selectedPurpose;
      const normalizedFees = feesPaid.trim().replace(/,/g, '');

      const created = await apiClient.createEnquiry({
        fullName: fullName.trim(),
        contactNo: contactNo.trim(),
        purpose: finalPurpose,
        feesPaid: normalizedFees ? Number(normalizedFees) : 0,
        urgency: urgency as UrgencyLevel,
      });

      // Trigger instant notification and sound
      notificationService.notifyNewClient(
        created.fullName,
        created.purpose,
        created.urgency === 'Urgent',
        notificationSoundEnabled
      );

      // Show themed confirmation modal
      setSavedClientInfo({
        name: created.fullName,
        phone: created.contactNo,
        purpose: created.purpose,
        feesPaid: created.feesPaid,
        urgency: created.urgency,
        time: formatTime(created.entryTime),
      });

      resetForm();
    } catch (err: any) {
      setErrorModalConfig({
        visible: true,
        type: 'danger',
        title: 'Registration Error',
        message: err.message || 'Unable to record client details. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName('');
    setContactNo('');
    setFeesPaid('');
    setSelectedPurpose(LEGAL_PURPOSES[0]);
    setCustomPurpose('');
    setUrgency('Normal');
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AnimatedScreen style={styles.keyboardContainer}>
      <Header
        title="NEW CLIENT ENTRY"
        subtitle="Office Reception & Visitor Check-In"
        showTime={false}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Entry Timestamp Card */}
        <View style={styles.autoTimeCard}>
          <View style={styles.autoTimeIconWrap}>
            <ClockSvg size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.autoTimeLabel}>ENTRY DATE & TIME</Text>
            <Text style={[styles.autoTimeValue, isSmallScreen && { fontSize: 13 }]}>
              {formatFullDate(liveTimestamp)}
            </Text>
            <Text style={[styles.autoClockValue, isSmallScreen && { fontSize: 15 }]}>
              {formatTime(liveTimestamp)}
            </Text>
          </View>
        </View>

        {/* Section 1: Client Information */}
        <View style={styles.formSection}>
          <Text style={styles.sectionHeaderTitle}>1. Client Information</Text>

          <CustomInput
            label="Client Full Name"
            placeholder="e.g. Rajesh Kumar Verma"
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errors.fullName) setErrors({ ...errors, fullName: undefined });
            }}
            required
            autoCapitalize="words"
            error={errors.fullName}
            leftIcon={<Ionicons name="person-outline" size={17} color={colors.textSecondary} />}
          />

          <CustomInput
            label="Contact / WhatsApp Number"
            placeholder="e.g. +91 98765 43210"
            value={contactNo}
            onChangeText={(text) => {
              setContactNo(text);
              if (errors.contactNo) setErrors({ ...errors, contactNo: undefined });
            }}
            keyboardType="phone-pad"
            required
            error={errors.contactNo}
            helperText="Enter 7–15 digits, including country code when needed"
            leftIcon={<Ionicons name="call-outline" size={17} color={colors.textSecondary} />}
          />

          <CustomInput
            label="Fees Paid (₹)"
            placeholder="e.g. 5000"
            value={feesPaid}
            onChangeText={(text) => {
              setFeesPaid(text);
              if (errors.feesPaid) setErrors({ ...errors, feesPaid: undefined });
            }}
            keyboardType="decimal-pad"
            error={errors.feesPaid}
            helperText="Optional — record only the amount already paid by this client"
            maxLength={12}
            leftIcon={<Ionicons name="cash-outline" size={17} color={colors.textSecondary} />}
          />
        </View>

        {/* Section 2: Purpose of Visit */}
        <View style={styles.formSection}>
          <Text style={styles.sectionHeaderTitle}>2. Purpose / Reason for Visit</Text>
          <Text style={styles.sectionSubtext}>Select visit category or choose custom below</Text>

          <View style={styles.chipsWrap}>
            {LEGAL_PURPOSES.map((purpose) => {
              const isSelected = selectedPurpose === purpose;
              return (
              <AnimatedPressable
                key={purpose}
                accessibilityRole="button"
                accessibilityLabel={`Visit purpose: ${purpose}`}
                accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedPurpose(purpose)}
                  style={[styles.purposeChip, isSelected && styles.purposeChipSelected]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.accent} style={{ marginRight: 4 }} />
                  )}
                  <Text style={[styles.purposeChipText, isSelected && styles.purposeChipTextSelected]}>
                    {purpose}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {selectedPurpose.startsWith('Other') && (
            <CustomInput
              label="Specify Custom Purpose"
              placeholder="Describe the matter / enquiry..."
              value={customPurpose}
              onChangeText={(text) => {
                setCustomPurpose(text);
                if (errors.customPurpose) setErrors({ ...errors, customPurpose: undefined });
              }}
              required
              error={errors.customPurpose}
              leftIcon={<Ionicons name="create-outline" size={17} color={colors.textSecondary} />}
            />
          )}
        </View>

        {/* Section 3: Visit Priority (Normal and Urgent Side-by-Side) */}
        <View style={styles.formSection}>
          <Text style={styles.sectionHeaderTitle}>3. Visit Priority</Text>

          <View style={styles.urgencyRow}>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Normal visit priority"
              accessibilityState={{ selected: urgency === 'Normal' }}
              onPress={() => setUrgency('Normal')}
              style={[
                styles.urgencyBtn,
                urgency === 'Normal' && styles.urgencyBtnActiveNormal,
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={urgency === 'Normal' ? colors.primary : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.urgencyBtnText, urgency === 'Normal' && styles.urgencyTextActiveNormal]}>
                Normal
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Urgent visit priority"
              accessibilityState={{ selected: urgency === 'Urgent' }}
              onPress={() => setUrgency('Urgent')}
              style={[
                styles.urgencyBtn,
                urgency === 'Urgent' && styles.urgencyBtnActiveUrgent,
              ]}
            >
              <Ionicons
                name="alert-circle"
                size={16}
                color={urgency === 'Urgent' ? colors.danger : colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.urgencyBtnText, urgency === 'Urgent' && styles.urgencyTextActiveUrgent]}>
                Urgent
              </Text>
            </AnimatedPressable>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <CustomButton
            title="Save & Register Client Entry"
            onPress={handleSave}
            loading={isSubmitting}
            size="lg"
            variant="primary"
            icon={<Ionicons name="save-outline" size={18} color="#FFFFFF" />}
          />

          <CustomButton
            title="Reset Form"
            onPress={resetForm}
            size="md"
            variant="secondary"
            style={{ marginTop: 10 }}
          />
        </View>
      </ScrollView>

      {/* Themed Success Confirmation Modal */}
      {savedClientInfo && (
        <CustomModal
          visible={Boolean(savedClientInfo)}
          onClose={() => setSavedClientInfo(null)}
          type="success"
          title="New Client Added"
          message={`Client "${savedClientInfo.name}" has been recorded at ${savedClientInfo.time}.\n\nContact: ${savedClientInfo.phone}\nPurpose: ${savedClientInfo.purpose}\nFees Paid: ${formatFeesPaid(savedClientInfo.feesPaid)}\nPriority: ${savedClientInfo.urgency}`}
          primaryAction={{
            text: 'View Lobby Queue',
            icon: 'people',
            onPress: () => {
              setSavedClientInfo(null);
              navigation.navigate('Lobby');
            },
          }}
          secondaryAction={{
            text: 'Add Another Client',
            onPress: () => setSavedClientInfo(null),
          }}
        />
      )}

      {/* Themed Error Modal */}
      <CustomModal
        visible={errorModalConfig.visible}
        onClose={() => setErrorModalConfig({ ...errorModalConfig, visible: false })}
        type={errorModalConfig.type}
        title={errorModalConfig.title}
        message={errorModalConfig.message}
        primaryAction={{
          text: 'Got It',
          onPress: () => setErrorModalConfig({ ...errorModalConfig, visible: false }),
        }}
      />
      </AnimatedScreen>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  autoTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    elevation: 2,
    shadowColor: '#0F1E36',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  autoTimeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: 'rgba(200, 155, 60, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(200, 155, 60, 0.35)',
  },
  autoTimeLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  autoTimeValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  autoClockValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.accent,
    marginTop: 1,
    fontVariant: ['tabular-nums'],
  },
  formSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  purposeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 8,
  },
  purposeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  purposeChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  purposeChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  urgencyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  urgencyBtnActiveNormal: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  urgencyBtnActiveUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  urgencyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  urgencyTextActiveNormal: {
    color: colors.primary,
    fontWeight: '700',
  },
  urgencyTextActiveUrgent: {
    color: colors.danger,
    fontWeight: '700',
  },
  actionContainer: {
    marginTop: 4,
    marginBottom: 20,
  },
});

export default NewEntryScreen;
