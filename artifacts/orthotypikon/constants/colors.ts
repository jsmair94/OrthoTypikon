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
    text: '#172033',
    tint: '#B78B45',

    // Core surfaces
    background: '#F7F5EF',
    foreground: '#172033',

    // Cards / elevated surfaces
    card: '#FFFDF8',
    cardForeground: '#172033',

    // Primary action color (buttons, links, active states)
    primary: '#18324A',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E8E3D8',
    secondaryForeground: '#18324A',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EDE9E0',
    mutedForeground: '#6D736F',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#E4B967',
    accentForeground: '#18324A',
    fastingCell: '#F0CFE0',
    fastingCellText: '#642442',

    // Editorial hero surfaces
    heroStart: '#18324A',
    heroEnd: '#2B526C',
    heroForeground: '#FFFFFF',

    // Destructive actions (delete, error states)
    destructive: '#ef4444',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#DED8CB',
    input: '#DED8CB',
  },
  dark: {
    text: '#F6F2EA',
    tint: '#E4B967',
    background: '#101A24',
    foreground: '#F6F2EA',
    card: '#182838',
    cardForeground: '#F6F2EA',
    primary: '#D5A95B',
    primaryForeground: '#102130',
    secondary: '#263746',
    secondaryForeground: '#F6F2EA',
    muted: '#223342',
    mutedForeground: '#B7C0C3',
    accent: '#E4B967',
    accentForeground: '#102130',
    fastingCell: '#49263A',
    fastingCellText: '#F9EAF2',
    heroStart: '#152C3F',
    heroEnd: '#244B64',
    heroForeground: '#FFFFFF',
    destructive: '#F07C72',
    destructiveForeground: '#FFFFFF',
    border: '#304453',
    input: '#304453',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;
