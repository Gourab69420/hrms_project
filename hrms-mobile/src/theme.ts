/**
 * HRMS Design System — extracted from Stich_admin/executive_mobile_hrms/DESIGN.md
 * Single source of truth for colors / spacing / radius / typography.
 * Matches Stitch refs pixel-close: navy #1E3A8A, royal #2563EB, slate canvas.
 */
export const colors = {
  canvas: '#F8F9FD',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderSoft: '#F1F5F9',
  text: '#0F172A',
  muted: '#64748B',
  placeholder: '#94A3B8',
  navy: '#1E3A8A',
  navyDark: '#172554',
  royal: '#2563EB',
  royalSoft: '#EFF6FF',
  royalBorder: '#DBEAFE',
  success: '#065F46',
  successDot: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  warning: '#92400E',
  warningDot: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  danger: '#991B1B',
  dangerDot: '#EF4444',
  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  info: '#1E40AF',
  infoBg: '#EFF6FF',
} as const;

export const radius = { sm: 8, md: 10, lg: 12, xl: 16, pill: 9999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

/**
 * Type pairing — Sora carries headings + all emphasis, IBM Plex Sans carries reading text.
 * Families are weight-specific (loaded in app/_layout); never pair them with fontWeight.
 */
export const fonts = {
  displayExtra: 'Sora_800ExtraBold',
  display: 'Sora_700Bold',
  displaySemi: 'Sora_600SemiBold',
  displayRegular: 'Sora_400Regular',
  body: 'IBMPlexSans_400Regular',
  bodyItalic: 'IBMPlexSans_400Regular_Italic',
  medium: 'IBMPlexSans_500Medium',
  semiBold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
} as const;

export const type = {
  greeting: { fontSize: 26, fontFamily: fonts.displayExtra, letterSpacing: -0.4 },
  title: { fontSize: 20, fontFamily: fonts.display },
  section: { fontSize: 17, fontFamily: fonts.display },
  body: { fontSize: 14, fontFamily: fonts.body },
  label: { fontSize: 13, fontFamily: fonts.medium },
  small: { fontSize: 12, fontFamily: fonts.medium },
  metric: { fontSize: 30, fontFamily: fonts.displayExtra, letterSpacing: -0.5 },
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
} as const;
