import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  useWindowDimensions
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { colors } from '../theme/colors';
import { Header } from '../components/Header';
import { CustomButton } from '../components/CustomButton';
import { CustomModal } from '../components/CustomModal';
import { apiClient } from '../api/client';
import { exportCsvFromServer } from '../utils/exporter';
import { BriefcaseSvg, ExportDownloadSvg } from '../components/SvgIcons';
import { usePreferences } from '../context/PreferencesContext';
import { AnimatedScreen } from '../components/AnimatedScreen';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

export const SettingsScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const { username, logout } = useAuth();
  const [logoutVisible, setLogoutVisible] = useState(false);

  const {
    urgentAlertsEnabled,
    whatsAppShortcutsEnabled,
    notificationSoundEnabled,
    waitRemindersEnabled,
    setUrgentAlertsEnabled,
    setWhatsAppShortcutsEnabled,
    setNotificationSoundEnabled,
    setWaitRemindersEnabled,
  } = usePreferences();

  // Connection test and export state
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleTestNotificationSound = async () => {
    await notificationService.notifyNewClient('Advocate Chamber Test', 'Urgent Matter Preview', true, true);
    setModalConfig({
      visible: true,
      type: 'success',
      title: 'Alert Sound & Vibration Tested',
      message: 'A test notification was triggered with alert sound and vibration on this phone.',
    });
  };

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

  const handleTestConnection = async () => {
    setIsSyncing(true);
    try {
      const res = await apiClient.testConnection();
      if (res.ok) {
        setModalConfig({
          visible: true,
          type: 'success',
          title: 'Connection Verified',
          message: res.message,
        });
      } else {
        setModalConfig({
          visible: true,
          type: 'warning',
          title: 'Connection Failed',
          message: res.message,
        });
      }
    } catch {
      setModalConfig({
        visible: true,
        type: 'danger',
        title: 'Connection Failed',
        message: 'Could not connect to database server. Please verify network status.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportFullExcel = async () => {
    setIsExporting(true);
    try {
      await exportCsvFromServer(apiClient.getCsvDownloadRequest(), 'Office_Visitor_Register');
    } catch (err: any) {
      setModalConfig({
        visible: true,
        type: 'danger',
        title: 'Export Error',
        message: err.message || 'Could not export visitor register to CSV.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatedScreen style={styles.container}>
      <Header
        title="SETTINGS"
        subtitle="Office Preferences & Tools"
        showTime={false}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[styles.scrollContent, isTablet && styles.scrollContentTablet]}
        showsVerticalScrollIndicator={false}
      >
        {/* Office Profile Card */}
        <View style={styles.card}>
          <View style={styles.officeRow}>
            <View style={styles.emblemBadge}>
              <BriefcaseSvg size={22} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.officeTitle}>Office Visitor Desk</Text>
              <Text style={styles.officeSub}>Client Entry & Reception Management</Text>
            </View>
          </View>
        </View>

        {/* Signed-in account */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Signed-in Account</Text>
          <Text style={styles.sectionSubtext}>
            This device is signed in as {username}. Signing out returns to the secure login screen.
          </Text>
          <CustomButton
            title="Sign Out"
            onPress={() => setLogoutVisible(true)}
            variant="outline"
            size="md"
            icon={<Ionicons name="log-out-outline" size={17} color={colors.primary} />}
          />
        </View>

        {/* Office Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Intake & Queue Preferences</Text>
          <Text style={styles.sectionSubtext}>
            Configure standard workflows for visitor check-ins and reception desk.
          </Text>

          {/* Setting 1: Auto Timestamp */}
          <View style={styles.settingItem}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="time-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingLabel}>Auto-Timestamp Intake</Text>
              <Text style={styles.settingDesc}>
                Automatically log the exact hour and minute when a client enters.
              </Text>
            </View>
            <View accessible style={styles.alwaysOnBadge} accessibilityLabel="Server timestamp always on">
              <Text style={styles.alwaysOnText}>Always On</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Setting 2: Urgency Highlighting */}
          <View style={styles.settingItem}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingLabel}>Urgent Priority Alerts</Text>
              <Text style={styles.settingDesc}>
                Highlight urgent cases with priority badges in the queue.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Urgent priority alerts"
              accessibilityHint="Show or hide urgent priority badges in the lobby"
              value={urgentAlertsEnabled}
              onValueChange={setUrgentAlertsEnabled}
              trackColor={{ false: colors.border, true: colors.danger }}
              thumbColor={urgentAlertsEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.divider} />

          {/* Setting 3: Direct WhatsApp Shortcuts */}
          <View style={styles.settingItem}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="logo-whatsapp" size={18} color={colors.whatsappDark} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingLabel}>1-Tap WhatsApp Actions</Text>
              <Text style={styles.settingDesc}>
                Enable quick client messaging with pre-formatted office greetings.
              </Text>
            </View>
            <Switch
              accessibilityLabel="WhatsApp shortcuts"
              accessibilityHint="Show or hide WhatsApp contact actions"
              value={whatsAppShortcutsEnabled}
              onValueChange={setWhatsAppShortcutsEnabled}
              trackColor={{ false: colors.border, true: colors.whatsappDark }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Notifications & Alert Sounds */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Alert Sounds & Notifications</Text>
          <Text style={styles.sectionSubtext}>
            Audible chimes and priority vibration alerts for important chamber events.
          </Text>

          {/* Setting: Sound & Vibration */}
          <View style={styles.settingItem}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="volume-high-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingLabel}>Notification Sounds & Vibration</Text>
              <Text style={styles.settingDesc}>
                Play distinct chimes and vibration for new client arrivals and urgent entries.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Notification sounds"
              value={notificationSoundEnabled}
              onValueChange={setNotificationSoundEnabled}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          {/* Setting: Lobby Wait Alerts */}
          <View style={styles.settingItem}>
            <View style={styles.settingIconWrap}>
              <Ionicons name="hourglass-outline" size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.settingLabel}>Lobby Wait Alerts (30+ Mins)</Text>
              <Text style={styles.settingDesc}>
                Remind staff when any visitor has been waiting for more than 30 minutes.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Lobby wait alerts"
              value={waitRemindersEnabled}
              onValueChange={setWaitRemindersEnabled}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.divider} />

          <CustomButton
            title="Test Alert Sound & Vibration"
            onPress={() => void handleTestNotificationSound()}
            variant="outline"
            size="sm"
            icon={<Ionicons name="notifications-outline" size={16} color={colors.primary} />}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* Data export and connectivity tools */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Data & CSV Export</Text>
          <Text style={styles.sectionSubtext}>
            Download the complete register as a CSV file or verify the server connection.
          </Text>

          <View style={styles.btnStack}>
            <CustomButton
              title="Export Full Register (CSV)"
              onPress={handleExportFullExcel}
              loading={isExporting}
              variant="primary"
              size="md"
              icon={<ExportDownloadSvg size={16} color="#FFFFFF" />}
              style={{ marginBottom: 10 }}
            />

            <CustomButton
              title="Test Server Connection"
              onPress={handleTestConnection}
              loading={isSyncing}
              variant="secondary"
              size="md"
              icon={<Ionicons name="cloud-done-outline" size={17} color={colors.primary} />}
            />
          </View>
        </View>

        {/* App Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Application Details</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Application</Text>
            <Text style={styles.infoValue}>Office Visitor Desk</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build Version</Text>
            <Text style={styles.infoValue}>v{Constants.expoConfig?.version || '1.1.0'} (Production)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform Support</Text>
            <Text style={styles.infoValue}>Android, iOS & Web</Text>
          </View>
        </View>
      </ScrollView>

      {/* Themed Feedback Modal */}
      <CustomModal
        visible={modalConfig.visible}
        onClose={() => setModalConfig({ ...modalConfig, visible: false })}
        type={modalConfig.type}
        title={modalConfig.title}
        message={modalConfig.message}
        primaryAction={{
          text: 'Got It',
          onPress: () => setModalConfig({ ...modalConfig, visible: false }),
        }}
      />

      <CustomModal
        visible={logoutVisible}
        onClose={() => setLogoutVisible(false)}
        type="warning"
        title="Sign Out?"
        message="You will need the office username and password to access client records again."
        primaryAction={{
          text: 'Sign Out',
          variant: 'danger',
          icon: 'log-out-outline',
          onPress: () => {
            setLogoutVisible(false);
            void logout();
          },
        }}
        secondaryAction={{
          text: 'Cancel',
          onPress: () => setLogoutVisible(false),
        }}
      />
    </AnimatedScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  scrollContentTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  officeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  officeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  officeSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 17,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  alwaysOnBadge: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  alwaysOnText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
  },
  btnStack: {
    marginTop: 4,
  },
});

export default SettingsScreen;
