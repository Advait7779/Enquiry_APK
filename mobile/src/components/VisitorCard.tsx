import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Linking,
  Alert,
  useWindowDimensions
} from 'react-native';
import { IEnquiry } from '../types';
import { colors } from '../theme/colors';
import { StatusBadge } from './StatusBadge';
import { UrgencyBadge } from './UrgencyBadge';
import { formatTime, formatTimeAgo } from '../utils/date';
import {
  CallSvg,
  WhatsAppSvg,
  ClockSvg,
  PersonSvg,
  FolderCaseSvg,
  ConsultationSvg,
  CompletedCheckSvg
} from './SvgIcons';
import { usePreferences } from '../context/PreferencesContext';
import { toDialNumber, toWhatsAppNumber } from '../utils/contact';
import { AnimatedPressable } from './AnimatedPressable';

interface VisitorCardProps {
  enquiry: IEnquiry;
  onPress: () => void;
  onStatusChange?: (newStatus: IEnquiry['status']) => void;
  statusUpdating?: boolean;
  relativeTime?: Date;
}

export const VisitorCard: React.FC<VisitorCardProps> = ({
  enquiry,
  onPress,
  onStatusChange,
  statusUpdating = false,
  relativeTime = new Date(),
}) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;

  const entryDate = new Date(enquiry.entryTime);
  const timeFormatted = formatTime(entryDate);
  const timeAgo = formatTimeAgo(entryDate, relativeTime);
  const { urgentAlertsEnabled, whatsAppShortcutsEnabled } = usePreferences();

  const handleCall = () => {
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

  const getNextStatusAction = () => {
    if (enquiry.status === 'Waiting') {
      return {
        label: 'Start Consultation',
        target: 'In Consultation' as const,
        icon: (c: string) => <ConsultationSvg size={13} color={c} />,
        color: colors.primary,
      };
    }
    if (enquiry.status === 'In Consultation') {
      return {
        label: 'Mark Completed',
        target: 'Completed' as const,
        icon: (c: string) => <CompletedCheckSvg size={13} color={c} />,
        color: colors.success,
      };
    }
    return null;
  };

  const nextAction = getNextStatusAction();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${enquiry.fullName}, ${enquiry.status}`}
      onPress={onPress}
      style={styles.card}
    >
      {/* Top Row: Name, Urgency, Status */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.clientName} numberOfLines={1}>
              {enquiry.fullName}
            </Text>
            {urgentAlertsEnabled ? <UrgencyBadge urgency={enquiry.urgency} /> : null}
          </View>
          <View style={styles.timeRow}>
            <View style={{ marginRight: 4 }}>
              <ClockSvg size={12} color={colors.textMuted} />
            </View>
            <Text style={styles.timeText} numberOfLines={1}>
              {timeFormatted} • <Text style={styles.timeAgoText}>{timeAgo}</Text>
            </Text>
          </View>
        </View>
        <StatusBadge status={enquiry.status} size="sm" />
      </View>

      {/* Purpose Banner */}
      <View style={styles.purposeBox}>
        <Text style={styles.purposeText} numberOfLines={2}>
          {enquiry.purpose}
        </Text>
      </View>

      {/* Case Ref / Lawyer info if present */}
      {(enquiry.caseNumber || enquiry.assignedAdvocate) && (
        <View style={styles.metaRow}>
          {enquiry.caseNumber ? (
            <View style={[styles.metaItem, enquiry.assignedAdvocate ? { marginRight: 12 } : null]}>
              <View style={{ marginRight: 4 }}>
                <FolderCaseSvg size={12} color={colors.textSecondary} />
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {enquiry.caseNumber}
              </Text>
            </View>
          ) : null}
          {enquiry.assignedAdvocate ? (
            <View style={styles.metaItem}>
              <View style={{ marginRight: 4 }}>
                <PersonSvg size={12} color={colors.textSecondary} />
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {enquiry.assignedAdvocate}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Bottom Action Row */}
      <View style={[
        isSmallScreen 
          ? { flexDirection: 'column', alignItems: 'stretch' } 
          : { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
      ]}>
        {/* Quick Contact Buttons */}
        <View style={[
          styles.contactActions,
          isSmallScreen && nextAction && onStatusChange ? { marginBottom: 8 } : null
        ]}>
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${enquiry.fullName}`}
            style={[styles.actionBtn, styles.callBtn]}
            onPress={handleCall}
          >
            <View style={{ marginRight: 4 }}>
              <CallSvg size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.callBtnText}>Call</Text>
          </AnimatedPressable>

          {whatsAppShortcutsEnabled ? (
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel={`Message ${enquiry.fullName} on WhatsApp`}
              style={[styles.actionBtn, styles.waBtn]}
              onPress={handleWhatsApp}
            >
              <View style={{ marginRight: 4 }}>
                <WhatsAppSvg size={12} color="#FFFFFF" />
              </View>
              <Text style={styles.waBtnText}>WhatsApp</Text>
            </AnimatedPressable>
          ) : null}
        </View>

        {/* Next Status Quick Button */}
        {nextAction && onStatusChange && (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={`${nextAction.label} for ${enquiry.fullName}`}
            accessibilityState={{ disabled: statusUpdating, busy: statusUpdating }}
            style={[
              styles.statusNextBtn, 
              { borderColor: nextAction.color },
              isSmallScreen ? { width: '100%' } : null,
              statusUpdating && styles.disabled,
            ]}
            onPress={() => onStatusChange(nextAction.target)}
            disabled={statusUpdating}
          >
            <View style={{ marginRight: 4 }}>
              {nextAction.icon(nextAction.color)}
            </View>
            <Text style={[styles.statusNextText, { color: nextAction.color }]}>
              {nextAction.label}
            </Text>
          </AnimatedPressable>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1.5,
    shadowColor: '#0F1E36',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    flexWrap: 'wrap',
  },
  clientName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 6,
    flexShrink: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  timeAgoText: {
    color: colors.textMuted,
    fontWeight: '400',
  },
  purposeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 6,
  },
  purposeText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 6,
    marginRight: 6,
  },
  callBtn: {
    backgroundColor: colors.phoneCall,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  waBtn: {
    backgroundColor: colors.whatsappDark,
  },
  waBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  statusNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  disabled: {
    opacity: 0.55,
  },
  statusNextText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});

export default VisitorCard;
