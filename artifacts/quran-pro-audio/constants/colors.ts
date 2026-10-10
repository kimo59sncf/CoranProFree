/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#1A2B33',
    tint: '#3E6B58',

    // Core surfaces
    background: '#F7F4EC',
    foreground: '#1A2B33',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#1A2B33',

    // Primary action color (buttons, links, active states)
    primary: '#3E6B58',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E4EDE7',
    secondaryForeground: '#1A2B33',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EEF1EB',
    mutedForeground: '#6B7A72',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#B8862E',
    accentForeground: '#FFFFFF',

    // Destructive actions (delete, error states)
    destructive: '#C0392B',
    destructiveForeground: '#FFFFFF',

    // Favorites (heart) — modern red
    favorite: '#E5484D',
    favoriteForeground: '#FFFFFF',

    // Success (downloaded, completed) — green
    success: '#16A34A',

    // Warning (downloading, pending) — amber/orange
    warning: '#D97706',

    // Disabled — gray
    disabled: '#9CA3AF',

    // Borders and input outlines
    border: '#DFE5DE',
    input: '#C8D2C9',
  },

  dark: {
    text: '#F5F2EA',
    tint: '#98B8A5',
    background: '#0B1820',
    foreground: '#F5F2EA',
    card: '#122630',
    cardForeground: '#F5F2EA',
    primary: '#98B8A5',
    primaryForeground: '#0B1820',
    secondary: '#1C3540',
    secondaryForeground: '#D8E2DB',
    muted: '#19313B',
    mutedForeground: '#91A8A3',
    accent: '#D2A85A',
    accentForeground: '#0B1820',
    destructive: '#D96B67',
    destructiveForeground: '#FFFFFF',

    // Favorites (heart) — modern red
    favorite: '#F87171',
    favoriteForeground: '#0B1820',

    // Success (downloaded, completed) — green
    success: '#22C55E',

    // Warning (downloading, pending) — amber/orange
    warning: '#F59E0B',

    // Disabled — gray
    disabled: '#6B7280',

    border: '#26434A',
    input: '#2D5056',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 18,
};

export default colors;
