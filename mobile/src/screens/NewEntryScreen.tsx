import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Modal,
  TouchableOpacity,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../theme/colors';
import { Header } from '../components/Header';
import { CustomInput } from '../components/CustomInput';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { apiClient } from '../api/client';
import { LEGAL_PURPOSES, UrgencyLevel, ILawyer } from '../types';
import { formatFullDate, formatTime } from '../utils/date';
import { ClockSvg } from '../components/SvgIcons';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { usePreferences } from '../context/PreferencesContext';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';
import { formatFeesPaid } from '../utils/currency';

export const NewEntryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const { notificationSoundEnabled } = usePreferences();
  const { lawyerId: loggedInLawyerId, lawyerName: loggedInLawyerName, role } = useAuth();
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

  // Lawyer Selection State (Option B Dropdown)
  const [lawyers, setLawyers] = useState<ILawyer[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string>('');
  const [selectedLawyerName, setSelectedLawyerName] = useState<string>('Select a junior lawyer');
  const [showLawyerPicker, setShowLawyerPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [lawyerLoadError, setLawyerLoadError] = useState('');

  useEffect(() => {
    apiClient.getLawyers(true).then((list) => {
      setLawyerLoadError('');
      if (list && list.length > 0) {
        setLawyers(list);
        // Smart Auto-Selection: match logged-in lawyer account
        const matched = loggedInLawyerId ? list.find((l) => l.id === loggedInLawyerId) : null;
        const target = matched || list.find((l) => l.name.toLowerCase() === loggedInLawyerName?.toLowerCase()) || list[0];

        setSelectedLawyerId(target.id);
        setSelectedLawyerName(target.name);
        if (target.assignedTasks && target.assignedTasks.length > 0) {
          setSelectedPurpose(target.assignedTasks[0]);
        }
      }
    }).catch((error: Error) => {
      setLawyerLoadError(error.message || 'Could not load junior lawyers.');
    });
  }, [loggedInLawyerId, loggedInLawyerName]);

  const handleSelectLawyer = (l: ILawyer) => {
    setSelectedLawyerId(l.id);
    setSelectedLawyerName(l.name);
    setShowLawyerPicker(false);
    if (l.assignedTasks && l.assignedTasks.length > 0) {
      setSelectedPurpose(l.assignedTasks[0]);
    }
  };

  const selectedLawyer = lawyers.find((l) => l.id === selectedLawyerId);

  // Validation & UI State
  const [errors, setErrors] = useState<{ [key: string]: string | undefined }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Themed Modal State
  const [savedClientInfo, setSavedClientInfo] = useState<{
    name: string;
    phone: string;
    purpose: string;
    lawyer: string;
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
    } else if (!/^(?:\+?91)?\d{10}$/.test(cleanContact)) {
      newErrors.contactNo = 'Enter a 10-digit Indian mobile number, optionally prefixed with +91.';
    }

    if (selectedPurpose.startsWith('Other') && !customPurpose.trim()) {
      newErrors.customPurpose = 'Please enter the specific reason for visit.';
    }
    if (!selectedLawyerId) {
      newErrors.lawyerId = role === 'lawyer'
        ? 'Your lawyer account could not be loaded. Sign in again.'
        : 'Select the junior lawyer assigned to this client.';
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
        assignedAdvocate: selectedLawyerName || 'General Advocate Desk',
        lawyerId: selectedLawyerId || undefined,
        assignedTask: selectedPurpose,
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
        lawyer: created.assignedAdvocate || selectedLawyerName,
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
    if (lawyers.length > 0) {
      setSelectedLawyerId(lawyers[0].id);
      setSelectedLawyerName(lawyers[0].name);
      if (lawyers[0].assignedTasks && lawyers[0].assignedTasks.length > 0) {
        setSelectedPurpose(lawyers[0].assignedTasks[0]);
      } else {
        setSelectedPurpose(LEGAL_PURPOSES[0]);
      }
    } else {
      setSelectedPurpose(LEGAL_PURPOSES[0]);
    }
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

        {/* Section 2: Assigned Lawyer & Work / Task (Option B) */}
        <View style={styles.formSection}>
          <Text style={styles.sectionHeaderTitle}>2. Assigned Junior Lawyer & Work / Task</Text>
          <Text style={styles.sectionSubtext}>Select the lawyer handling this client and their assigned work</Text>

          {/* Lawyer Dropdown Selector */}
          <Text style={styles.fieldLabel}>ASSIGNED LAWYER <Text style={{ color: colors.danger }}>*</Text></Text>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Selected lawyer: ${selectedLawyerName}`}
            style={styles.dropdownSelector}
            onPress={() => {
              if (role === 'admin') setShowLawyerPicker(true);
            }}
          >
            <View style={styles.dropdownLeft}>
              <View style={styles.lawyerAvatarCircle}>
                <Ionicons name="person" size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownSelectedText}>{selectedLawyerName}</Text>
                {selectedLawyer?.assignedTasks && selectedLawyer.assignedTasks.length > 0 ? (
                  <Text style={styles.dropdownSubtext} numberOfLines={1}>
                    ★ Focus: {selectedLawyer.assignedTasks.join(', ')}
                  </Text>
                ) : (
                  <Text style={styles.dropdownSubtext}>General Chamber Desk</Text>
                )}
              </View>
            </View>
            {role === 'admin' ? <Ionicons name="chevron-down" size={20} color={colors.textSecondary} /> : null}
          </AnimatedPressable>
          {errors.lawyerId || lawyerLoadError ? (
            <Text style={{ color: colors.danger, fontSize: 12, marginTop: 5 }}>{errors.lawyerId || lawyerLoadError}</Text>
          ) : null}

          {/* Work / Task Dropdown Selector */}
          <Text style={[styles.fieldLabel, { marginTop: 14 }]}>LAWYER'S WORK / TASK <Text style={{ color: colors.danger }}>*</Text></Text>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Selected task: ${selectedPurpose}`}
            style={styles.dropdownSelector}
            onPress={() => setShowTaskPicker(true)}
          >
            <View style={styles.dropdownLeft}>
              <View style={[styles.lawyerAvatarCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="briefcase" size={17} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dropdownSelectedText}>{selectedPurpose}</Text>
                <Text style={styles.dropdownSubtext}>Tap to change or choose specific legal work</Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
          </AnimatedPressable>

          {/* Quick chips of assigned tasks for 1-tap selection */}
          {selectedLawyer?.assignedTasks && selectedLawyer.assignedTasks.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.quickSelectLabel}>Tasks Assigned to {selectedLawyerName}:</Text>
              <View style={styles.chipsWrap}>
                {selectedLawyer.assignedTasks.map((task) => {
                  const isSelected = selectedPurpose === task;
                  return (
                    <AnimatedPressable
                      key={task}
                      onPress={() => setSelectedPurpose(task)}
                      style={[styles.assignedTaskChip, isSelected && styles.assignedTaskChipSelected]}
                    >
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "star"}
                        size={13}
                        color={isSelected ? "#FFFFFF" : colors.accent}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.assignedTaskChipText, isSelected && styles.assignedTaskChipTextSelected]}>
                        {task}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          )}

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
          message={`Client "${savedClientInfo.name}" has been recorded at ${savedClientInfo.time}.\n\nAssigned Lawyer: ${savedClientInfo.lawyer}\nTask / Work: ${savedClientInfo.purpose}\nFees Paid: ${formatFeesPaid(savedClientInfo.feesPaid)}\nPriority: ${savedClientInfo.urgency}`}
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

      {/* Lawyer Selection Modal (Option B Dropdown) */}
      <Modal
        visible={showLawyerPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLawyerPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLawyerPicker(false)}
        >
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Select Assigned Lawyer</Text>
                <Text style={styles.modalSheetSub}>Choose lawyer handling this client</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLawyerPicker(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }} showsVerticalScrollIndicator={false}>
              {lawyers.map((l) => {
                const isSelected = selectedLawyerId === l.id;
                return (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                    onPress={() => handleSelectLawyer(l)}
                  >
                    <View style={[styles.lawyerAvatarCircle, isSelected && { backgroundColor: colors.primary }]}>
                      <Ionicons name="person" size={17} color={isSelected ? '#FFFFFF' : colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.pickerItemName, isSelected && styles.pickerItemNameSelected]}>
                        {l.name}
                      </Text>
                      {l.assignedTasks && l.assignedTasks.length > 0 ? (
                        <Text style={styles.pickerItemSub}>★ Tasks: {l.assignedTasks.join(', ')}</Text>
                      ) : (
                        <Text style={styles.pickerItemSub}>General Legal Matters</Text>
                      )}
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Task / Work Selection Modal */}
      <Modal
        visible={showTaskPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTaskPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTaskPicker(false)}
        >
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Select Legal Work / Task</Text>
                <Text style={styles.modalSheetSub}>Select task domain or purpose of visit</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTaskPicker(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Assigned tasks for current lawyer */}
              {selectedLawyer?.assignedTasks && selectedLawyer.assignedTasks.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.pickerSectionHeader}>★ Assigned to {selectedLawyerName}:</Text>
                  {selectedLawyer.assignedTasks.map((task) => {
                    const isSelected = selectedPurpose === task;
                    return (
                      <TouchableOpacity
                        key={task}
                        style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                        onPress={() => {
                          setSelectedPurpose(task);
                          setShowTaskPicker(false);
                        }}
                      >
                        <Ionicons name="star" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                        <Text style={[styles.pickerItemName, isSelected && styles.pickerItemNameSelected, { flex: 1 }]}>
                          {task}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {(role !== 'lawyer' || !selectedLawyer?.assignedTasks?.length) && (
                <>
                  <Text style={styles.pickerSectionHeader}>All Legal Services:</Text>
                  {LEGAL_PURPOSES.map((purpose) => {
                    const isSelected = selectedPurpose === purpose;
                    return (
                      <TouchableOpacity
                        key={purpose}
                        style={[styles.pickerItemRow, isSelected && styles.pickerItemRowSelected]}
                        onPress={() => {
                          setSelectedPurpose(purpose);
                          setShowTaskPicker(false);
                        }}
                      >
                        <Ionicons name="briefcase-outline" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
                        <Text style={[styles.pickerItemName, isSelected && styles.pickerItemNameSelected, { flex: 1 }]}>
                          {purpose}
                        </Text>
                        {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  lawyerAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dropdownSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  quickSelectLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  assignedTaskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginRight: 8,
    marginBottom: 8,
  },
  assignedTaskChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  assignedTaskChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  assignedTaskChipTextSelected: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 54, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSheetSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
  },
  pickerSectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pickerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pickerItemRowSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: colors.primary,
  },
  pickerItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pickerItemNameSelected: {
    fontWeight: '800',
    color: colors.primary,
  },
  pickerItemSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default NewEntryScreen;
