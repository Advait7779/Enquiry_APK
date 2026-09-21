import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { AnimatedPressable } from './AnimatedPressable';

interface StatCardProps {
  title: string;
  count: number;
  icon?: (color: string) => React.ReactNode;
  color: string;
  bgColor: string;
  isSelected?: boolean;
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  count,
  icon,
  color,
  bgColor,
  isSelected,
  onPress,
}) => {
  const iconColor = isSelected ? colors.accent : color;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${count}`}
      accessibilityState={{ selected: Boolean(isSelected) }}
      onPress={onPress}
      style={[
        styles.card,
        isSelected
          ? [styles.cardSelected, { backgroundColor: colors.primary, borderColor: colors.primary }]
          : styles.cardDefault,
      ]}
    >
      {/* Top Row: Icon + Count Badge */}
      <View style={styles.topRow}>
        {icon && <View style={styles.iconWrap}>{icon(iconColor)}</View>}
        <View
          style={[
            styles.countBadge,
            isSelected
              ? { backgroundColor: 'rgba(200, 155, 60, 0.25)', borderColor: colors.accent }
              : { backgroundColor: bgColor, borderColor: 'transparent' },
          ]}
        >
          <Text
            style={[
              styles.countText,
              isSelected ? { color: colors.accent } : { color },
            ]}
          >
            {count}
          </Text>
        </View>
      </View>

      {/* Bottom Text: 100% Completely Visible without truncation */}
      <Text
        style={[
          styles.title,
          isSelected ? styles.titleSelected : styles.titleDefault,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit={true}
        minimumFontScale={0.8}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 52,
  },
  cardDefault: {
    backgroundColor: '#FFFFFF',
    borderColor: colors.borderStrong,
  },
  cardSelected: {
    elevation: 3,
    shadowColor: '#0F1E36',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
  titleDefault: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  titleSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  countText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});

export default StatCard;
