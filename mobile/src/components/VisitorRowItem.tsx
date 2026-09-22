import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { IEnquiry } from '../types';
import { colors } from '../theme/colors';
import { formatTime, formatShortDate, isSameDay } from '../utils/date';
import { formatFeesPaid } from '../utils/currency';
import { AnimatedPressable } from './AnimatedPressable';

interface VisitorRowItemProps {
  enquiry: IEnquiry;
  onPress: () => void;
}

export const VisitorRowItem: React.FC<VisitorRowItemProps> = ({ enquiry, onPress }) => {
  const entryDate = new Date(enquiry.entryTime);
  const isToday = isSameDay(entryDate, new Date());
  const displayDate = isToday ? formatTime(entryDate) : formatShortDate(entryDate);

  const initial = (enquiry.fullName.trim().charAt(0) || 'C').toUpperCase();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${enquiry.fullName}, fees paid ${formatFeesPaid(enquiry.feesPaid)}, ${displayDate}`}
      style={styles.container}
      onPress={onPress}
    >
      {/* Left Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      {/* Middle: Client Name, Purpose & Contact */}
      <View style={styles.infoCol}>
        <Text style={styles.name} numberOfLines={1}>
          {enquiry.fullName}
        </Text>

        <Text style={styles.purposeText} numberOfLines={1}>
          {enquiry.purpose}
        </Text>
        <View style={styles.bottomRow}>
          <Text style={styles.contactText} numberOfLines={1}>{enquiry.contactNo}</Text>
          <Text style={styles.feesText}>Paid {formatFeesPaid(enquiry.feesPaid)}</Text>
        </View>
      </View>

      {/* Right: Chevron */}
      <View style={styles.rightCol}>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        <Text style={styles.timeText}>{displayDate}</Text>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: '#0F1E36',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  name: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
    marginBottom: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  purposeText: {
    fontSize: 12,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  contactText: {
    fontSize: 11.5,
    color: colors.textMuted,
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 8,
  },
  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 4,
  },
  feesText: {
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default VisitorRowItem;
