import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EnquiryStatus } from '../types';
import { colors } from '../theme/colors';

interface StatusBadgeProps {
  status: EnquiryStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStyle = () => {
    switch (status) {
      case 'Waiting':
        return {
          bg: colors.status.waitingBg,
          text: colors.status.waitingText,
          border: colors.status.waitingBorder,
          label: 'Waiting in Lobby'
        };
      case 'In Consultation':
        return {
          bg: colors.status.inConsultationBg,
          text: colors.status.inConsultationText,
          border: colors.status.inConsultationBorder,
          label: 'In Consultation'
        };
      case 'Completed':
        return {
          bg: colors.status.completedBg,
          text: colors.status.completedText,
          border: colors.status.completedBorder,
          label: 'Completed'
        };
      case 'Rescheduled':
      default:
        return {
          bg: colors.status.rescheduledBg,
          text: colors.status.rescheduledText,
          border: colors.status.rescheduledBorder,
          label: status
        };
    }
  };

  const config = getStyle();
  const isSmall = size === 'sm';

  return (
    <View
      accessible
      accessibilityLabel={`Status: ${config.label}`}
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: isSmall ? 6 : 9,
          paddingVertical: isSmall ? 2 : 4,
        }
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isSmall ? 10 : 11,
          }
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});

export default StatusBadge;
