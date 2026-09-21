import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../theme/colors';
import { AnimatedPressable } from './AnimatedPressable';

export interface ModalAction {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  type?: 'success' | 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  metaInfo?: { label: string; value: string }[];
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  visible,
  onClose,
  type = 'success',
  title,
  message,
  metaInfo,
  primaryAction,
  secondaryAction,
}) => {
  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return {
          name: 'checkmark-circle' as const,
          color: colors.success,
          bg: '#ECFDF5',
          border: '#A7F3D0',
        };
      case 'danger':
        return {
          name: 'trash-outline' as const,
          color: colors.danger,
          bg: '#FEF2F2',
          border: '#FECACA',
        };
      case 'warning':
        return {
          name: 'alert-circle' as const,
          color: colors.accent,
          bg: '#FEF3C7',
          border: '#FDE68A',
        };
      case 'info':
      default:
        return {
          name: 'information-circle' as const,
          color: colors.primary,
          bg: '#EFF6FF',
          border: '#BFDBFE',
        };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={styles.card}
              accessibilityRole="alert"
              accessibilityViewIsModal
              accessibilityLabel={`${title}. ${message}`}
            >
              {/* Top Emblem Icon */}
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: iconConfig.bg,
                    borderColor: iconConfig.border,
                  },
                ]}
              >
                <Ionicons
                  name={iconConfig.name}
                  size={32}
                  color={iconConfig.color}
                />
              </View>

              {/* Title & Message */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Optional Key Details Box */}
              {metaInfo && metaInfo.length > 0 && (
                <View style={styles.metaContainer}>
                  {metaInfo.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.metaRow,
                        index < metaInfo.length - 1 && styles.metaDivider,
                      ]}
                    >
                      <Text style={styles.metaLabel}>{item.label}</Text>
                      <Text style={styles.metaValue} numberOfLines={1}>
                        {item.value}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                {primaryAction && (
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel={primaryAction.text}
                    style={[
                      styles.btn,
                      primaryAction.variant === 'danger'
                        ? styles.btnDanger
                        : styles.btnPrimary,
                    ]}
                    onPress={primaryAction.onPress}
                  >
                    {primaryAction.icon && (
                      <Ionicons
                        name={primaryAction.icon}
                        size={16}
                        color="#FFFFFF"
                        style={styles.btnIcon}
                      />
                    )}
                    <Text style={styles.btnPrimaryText}>
                      {primaryAction.text}
                    </Text>
                  </AnimatedPressable>
                )}

                {secondaryAction && (
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel={secondaryAction.text}
                    style={[styles.btn, styles.btnSecondary]}
                    onPress={secondaryAction.onPress}
                  >
                    {secondaryAction.icon && (
                      <Ionicons
                        name={secondaryAction.icon}
                        size={16}
                        color={colors.textSecondary}
                        style={styles.btnIcon}
                      />
                    )}
                    <Text style={styles.btnSecondaryText}>
                      {secondaryAction.text}
                    </Text>
                  </AnimatedPressable>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 54, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: Math.min(width - 40, 360),
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    shadowColor: '#0F1E36',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  metaContainer: {
    width: '100%',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  metaDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: '65%',
  },
  buttonContainer: {
    width: '100%',
    marginTop: 4,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
  },
  btnIcon: {
    marginRight: 6,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
    marginBottom: 8,
  },
  btnDanger: {
    backgroundColor: colors.danger,
    marginBottom: 8,
  },
  btnSecondary: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnSecondaryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CustomModal;
