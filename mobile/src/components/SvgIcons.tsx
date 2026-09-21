import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../theme/colors';

interface IconProps {
  size?: number;
  color?: string;
  secondaryColor?: string;
}

// 1. Chamber Briefcase (Header & Chamber Brand)
export const BriefcaseSvg: React.FC<IconProps> = ({ size = 20, color = colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="2" y="7" width="20" height="14" rx="3" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M16 7V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M2 12H22" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />
    <Circle cx="12" cy="12" r="2" fill={color} />
  </Svg>
);

// 2. Lobby Queue (People / Visitors)
export const LobbyQueueSvg: React.FC<IconProps> = ({ size = 22, color = colors.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M2 20C2 16.6863 5.13401 14 9 14C12.866 14 16 16.6863 16 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="17" cy="7" r="3" stroke={color} strokeWidth="1.7" fill="none" strokeOpacity="0.7" />
    <Path d="M17 14C19.5 14 22 16 22 19" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeOpacity="0.7" />
  </Svg>
);

// 3. New Client Entry (Add User / Check-in)
export const NewClientSvg: React.FC<IconProps> = ({ size = 22, color = colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="10" cy="8" r="4" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M3 20C3 16.6863 6.13401 14 10 14C12.5 14 14.7 15.1 15.9 16.8" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="18" cy="11" r="5" fill={color} fillOpacity="0.15" />
    <Path d="M18 8.5V13.5M15.5 11H20.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

// 4. All Records (Chamber Document Register)
export const RegisterSvg: React.FC<IconProps> = ({ size = 22, color = colors.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M8 8H16M8 12H16M8 16H13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Circle cx="16.5" cy="16.5" r="1.5" fill={color} />
  </Svg>
);

// 5. Settings (Chamber Configuration & Gear)
export const SettingsSvg: React.FC<IconProps> = ({ size = 22, color = colors.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none" />
    <Path
      d="M19.4 15A1.65 1.65 0 0019.73 16.82L20 17.1A2 2 0 0117.17 20L16.82 19.73A1.65 1.65 0 0015 19.4A1.65 1.65 0 0013.6 20.67V21A2 2 0 019.6 21V20.67A1.65 1.65 0 008.2 19.4A1.65 1.65 0 006.38 19.73L6.1 20A2 2 0 013.27 17.17L3.54 16.82A1.65 1.65 0 003.27 15A1.65 1.65 0 002 13.6H1.67A2 2 0 011.67 9.6H2A1.65 1.65 0 003.27 8.2A1.65 1.65 0 003.54 6.38L3.27 6.1A2 2 0 016.1 3.27L6.38 3.54A1.65 1.65 0 008.2 3.27A1.65 1.65 0 009.6 2V1.67A2 2 0 0113.6 1.67V2A1.65 1.65 0 0015 3.27A1.65 1.65 0 0016.82 3.54L17.1 3.27A2 2 0 0120 6.1L19.73 6.38A1.65 1.65 0 0020 8.2A1.65 1.65 0 0021.33 9.6H21.67A2 2 0 0121.67 13.6H21.33A1.65 1.65 0 0019.4 15Z"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 6. Direct Phone Call (Blue Action)
export const CallSvg: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92V19.92C22 20.48 21.54 20.94 20.97 20.92C17.43 20.69 14.07 19.48 11.23 17.5C8.61 15.68 6.44 13.51 4.62 10.89C2.63 8.03 1.42 4.65 1.2 1.09C1.18 0.53 1.64 0.07 2.2 0.07H5.2C5.69 0.07 6.1 0.43 6.17 0.92C6.31 1.94 6.6 2.94 7.02 3.88C7.19 4.25 7.09 4.69 6.78 4.96L5.34 6.15C6.91 9.09 9.33 11.51 12.27 13.08L13.46 11.64C13.73 11.33 14.17 11.23 14.54 11.4C15.48 11.82 16.48 12.11 17.5 12.25C17.99 12.32 18.35 12.73 18.35 13.22V16.92H22Z"
      fill={color}
    />
  </Svg>
);

// 7. Direct WhatsApp Action
export const WhatsAppSvg: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.63C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 6.46 17.5 2 12.04 2ZM17.47 16.14C17.25 16.76 16.36 17.3 15.68 17.45C15.22 17.55 14.61 17.62 12.59 16.78C10.01 15.71 8.35 13.08 8.22 12.91C8.1 12.74 7.18 11.51 7.18 10.25C7.18 8.98 7.82 8.36 8.08 8.09C8.3 7.87 8.66 7.77 8.97 7.77C9.07 7.77 9.16 7.78 9.25 7.78C9.49 7.79 9.61 7.81 9.77 8.19C9.97 8.67 10.45 9.85 10.51 9.97C10.57 10.09 10.63 10.25 10.55 10.41C10.47 10.58 10.41 10.65 10.29 10.79C10.16 10.93 10.04 11.04 9.92 11.19C9.79 11.33 9.66 11.48 9.81 11.74C9.96 12 10.48 12.85 11.25 13.53C12.24 14.41 13.05 14.69 13.34 14.81C13.63 14.93 13.8 14.91 13.97 14.71C14.15 14.51 14.73 13.83 14.94 13.54C15.15 13.25 15.36 13.29 15.65 13.4C15.94 13.51 17.49 14.27 17.81 14.43C18.13 14.59 18.34 14.67 18.42 14.81C18.5 14.95 18.5 15.61 17.47 16.14Z"
      fill={color}
    />
  </Svg>
);

// 8. Real-time Clock / Automatic Timestamp (Gold)
export const ClockSvg: React.FC<IconProps> = ({ size = 16, color = colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M12 7V12L15.5 14.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 9. Waiting in Lobby (Hourglass / Amber)
export const HourglassSvg: React.FC<IconProps> = ({ size = 16, color = colors.status.waitingText }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M6 3H18M6 21H18M7 3L12 12M17 3L12 12M7 21L12 12M17 21L12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 10. In Consultation (Chat / Royal Blue)
export const ConsultationSvg: React.FC<IconProps> = ({ size = 16, color = colors.status.inConsultationText }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 11. Completed (Checkmark / Emerald Green)
export const CompletedCheckSvg: React.FC<IconProps> = ({ size = 16, color = colors.status.completedText }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M8 12.5L10.5 15L16 9.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 12. Chamber Shield Emblem (Trust & Security)
export const ShieldCheckSvg: React.FC<IconProps> = ({ size = 22, color = colors.accent }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 3L4 7V12C4 16.97 7.42 21.6 12 22.8C16.58 21.6 20 16.97 20 12V7L12 3Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// 13. Search (Magnifying Glass)
export const SearchSvg: React.FC<IconProps> = ({ size = 16, color = colors.textMuted }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M20 20L16 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 14. Export / Download
export const ExportDownloadSvg: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 3V15M12 15L8 11M12 15L16 11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 15. Refresh / Sync (Clean Circular Arrow)
export const RefreshSvg: React.FC<IconProps> = ({ size = 14, color = colors.primary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 12C4 7.58172 7.58172 4 12 4C15.1554 4 17.8732 5.82397 19.1691 8.47167M19.1691 8.47167V4M19.1691 8.47167H14.8M20 12C20 16.4183 16.4183 20 12 20C8.8446 20 6.12683 18.176 4.83086 15.5283M4.83086 15.5283V20M4.83086 15.5283H9.2"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 16. Person / Advocate Silhouette
export const PersonSvg: React.FC<IconProps> = ({ size = 16, color = colors.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M5 20C5 16.134 8.13401 13 12 13C15.866 13 19 16.134 19 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 17. Legal Matter / Case File Folder
export const FolderCaseSvg: React.FC<IconProps> = ({ size = 16, color = colors.textSecondary }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6C3 4.89543 3.89543 4 5 4H9.17157C9.70201 4 10.2107 4.21071 10.5858 4.58579L12.4142 6.41421C12.7893 6.78929 13.298 7 13.8284 7H19C20.1046 7 21 7.89543 21 9V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// 18. Delete / Trash (Danger Crimson)
export const TrashSvg: React.FC<IconProps> = ({ size = 16, color = colors.danger }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 11V17M14 11V17" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

// 19. Urgent Matter / Warning Alert (Crimson/Amber)
export const UrgentAlertSvg: React.FC<IconProps> = ({ size = 16, color = colors.danger }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M12 8V12M12 16H12.01" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </Svg>
);

// 20. Save Record (Floppy Disk)
export const SaveRecordSvg: React.FC<IconProps> = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 21V13H7V21M7 3V8H15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
