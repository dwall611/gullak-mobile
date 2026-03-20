/**
 * Gullak Mobile — Theme Tokens
 *
 * This file is the canonical import path for all screens.
 * All values are now sourced from src/theme/designTokens.js.
 *
 * Existing imports like:
 *   import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';
 * continue to work without any changes.
 */

export {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  surface,
  text,
  brand,
  semantic,
  category,
  categoryFallback,
  border,
  fontFamily,
  tableCol,
  cardHeight,
  iconSize,
  rowHeight,
} from '../theme/designTokens';

// Status bar color (kept for legacy usage)
export const statusBar = 'light';
