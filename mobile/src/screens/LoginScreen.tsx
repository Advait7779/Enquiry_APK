import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { BriefcaseSvg, ShieldCheckSvg } from '../components/SvgIcons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const OFFICE_USERNAME = 'Balasaheb Thopate';

export const LoginScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [username, setUsername] = useState(OFFICE_USERNAME);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const passwordInput = useRef<TextInput>(null);
  const isTablet = width >= 600;

  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Enter both the username and password.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await login(username.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate precise height of dark navy top header background
  const topHeaderHeight = Math.max(Math.round(height * 0.34), 220);

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* 1. Dark Chamber Navy Top Background Layer */}
      <View
        style={[
          styles.topDarkBackground,
          { height: topHeaderHeight + insets.top },
        ]}
      />

      {/* 2. Main Scrollable Content */}
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 20) + 10,
              paddingBottom: Math.max(insets.bottom, 20) + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Header (On Dark Navy) */}
          <View style={styles.hero}>
            <View style={styles.brandIcon}>
              <BriefcaseSvg size={22} color={colors.accent} />
            </View>
            <Text style={styles.brandTitle}>ADVOCATE DESK</Text>
            <Text style={styles.brandSubtitle}>Secure Client & Visitor Register</Text>
          </View>

          {/* Floating White Login Card (Overlapping Dual Tone) */}
          <Animated.View
            style={[
              styles.card,
              isTablet && styles.cardTablet,
              { width: Math.min(width - 64, 340), opacity },
            ]}
          >
            <View style={styles.securityRow}>
              <View style={styles.securityIcon}>
                <ShieldCheckSvg size={18} color={colors.accent} />
              </View>
              <View style={styles.securityText}>
                <Text style={styles.title}>Office Login</Text>
                <Text style={styles.subtitle}>Sign in to access confidential client records</Text>
              </View>
            </View>

            {/* Username Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Username</Text>
              <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
                <Ionicons name="person-outline" size={17} color={colors.textSecondary} />
                <TextInput
                  accessibilityLabel="Username"
                  autoCapitalize="words"
                  autoComplete="username"
                  autoCorrect={false}
                  enterKeyHint="next"
                  onChangeText={(value) => {
                    setUsername(value);
                    if (error) setError('');
                  }}
                  onSubmitEditing={() => passwordInput.current?.focus()}
                  placeholder="Enter username"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="next"
                  style={styles.input}
                  value={username}
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
                <Ionicons name="lock-closed-outline" size={17} color={colors.textSecondary} />
                <TextInput
                  ref={passwordInput}
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="current-password"
                  autoCorrect={false}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError('');
                  }}
                  onSubmitEditing={() => void handleLogin()}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textMuted}
                  returnKeyType="done"
                  secureTextEntry={!showPassword}
                  style={styles.input}
                  value={password}
                />
                <Ionicons
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPassword((current) => !current)}
                  size={19}
                  color={colors.textSecondary}
                  style={{ padding: 4 }}
                />
              </View>
            </View>

            {error ? (
              <View accessibilityRole="alert" style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <CustomButton
              title="Sign In Securely"
              onPress={() => void handleLogin()}
              loading={loading}
              size="lg"
              icon={<Ionicons name="log-in-outline" size={18} color={colors.textInverse} />}
              style={styles.loginButton}
            />

            <View style={styles.sessionNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
              <Text style={styles.sessionNoteText}>Your signed-in session is remembered securely.</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F1F5F9', // Soft clean light bottom background
  },
  topDarkBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary, // Chamber Navy top background
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
  },
  hero: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 11,
    backgroundColor: 'rgba(200, 155, 60, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(200, 155, 60, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 24,
    paddingHorizontal: 18,
    elevation: 8,
    shadowColor: '#0F1E36',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  cardTablet: {
    paddingVertical: 30,
    paddingHorizontal: 24,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  securityText: {
    flex: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 15,
    marginTop: 2,
  },
  fieldGroup: {
    marginBottom: 15,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrapper: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#FFF8F8',
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 9,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 11.5,
    lineHeight: 15,
    marginLeft: 6,
  },
  loginButton: {
    width: '100%',
    marginTop: 4,
  },
  sessionNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  sessionNoteText: {
    flexShrink: 1,
    color: colors.textSecondary,
    fontSize: 10.5,
    marginLeft: 5,
    lineHeight: 14,
  },
});

export default LoginScreen;
