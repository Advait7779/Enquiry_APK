import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UrgencyLevel } from '../types';
import { colors } from '../theme/colors';

interface UrgencyBadgeProps {
  urgency?: UrgencyLevel;
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency = 'Normal' }) => {
  if (urgency === 'Normal') return null;

  const isUrgent = urgency === 'Urgent';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isUrgent ? colors.urgency.urgentBg : '#FEF9C3',
          borderColor: isUrgent ? '#FCA5A5' : '#FDE047',
        }
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: isUrgent ? colors.urgency.urgentText : '#854D0E',
          }
        ]}
      >
        {isUrgent ? '⚡ URGENT' : '★ PRIORITY'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});

export default UrgencyBadge;
