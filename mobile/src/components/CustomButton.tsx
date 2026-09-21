import React from 'react';
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View
} from 'react-native';
import { colors } from '../theme/colors';
import { AnimatedPressable } from './AnimatedPressable';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = () => {
    const base: ViewStyle[] = [styles.button];

    // Size
    if (size === 'sm') base.push(styles.sizeSm);
    else if (size === 'lg') base.push(styles.sizeLg);
    else base.push(styles.sizeMd);

    // Variant
    switch (variant) {
      case 'primary':
        base.push(styles.variantPrimary);
        break;
      case 'secondary':
        base.push(styles.variantSecondary);
        break;
      case 'outline':
        base.push(styles.variantOutline);
        break;
      case 'danger':
        base.push(styles.variantDanger);
        break;
      case 'success':
        base.push(styles.variantSuccess);
        break;
    }

    if (disabled || loading) {
      base.push(styles.disabled);
    }

    return base;
  };

  const getTextStyle = () => {
    const base: TextStyle[] = [styles.text];

    if (size === 'sm') base.push(styles.textSm);
    else if (size === 'lg') base.push(styles.textLg);

    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
        base.push(styles.textLight);
        break;
      case 'secondary':
        base.push(styles.textDark);
        break;
      case 'outline':
        base.push(styles.textOutline);
        break;
    }

    return base;
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'outline' ? colors.primary : colors.textInverse}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconWrapper}>{icon}</View>}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeSm: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 34,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  sizeLg: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
  },
  variantPrimary: {
    backgroundColor: colors.primary,
  },
  variantSecondary: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  variantOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  variantDanger: {
    backgroundColor: colors.danger,
  },
  variantSuccess: {
    backgroundColor: colors.success,
  },
  disabled: {
    opacity: 0.6,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 8,
  },
  text: {
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 12,
  },
  textLg: {
    fontSize: 15,
  },
  textLight: {
    color: colors.textInverse,
  },
  textDark: {
    color: colors.textPrimary,
  },
  textOutline: {
    color: colors.primary,
  },
});

export default CustomButton;
