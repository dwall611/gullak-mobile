/**
 * Gullak Mobile — Unified Design Tokens
 *
 * Primary reference: SpendingScreen.js (dark surface system)
 * Secondary reference: TransactionsScreen.js
 *
 * Two background systems exist in the app:
 *   - "Spending system"  → dark charcoal surfaces (#0c0e10 base)
 *   - "Overview system"  → slate surfaces (#0f172a base)
 * We unify around the Spending system for new/updated screens.
 * Screens that already use the Overview system keep their colors via
 * the `slate.*` tokens exported below.
 */

// ─── Background & Surface Layer System ───────────────────────────────────────
export const surface = {
  // Spending / Charcoal system (primary)
  bg:          '#0c0e10',   // darkest base — SpendingScreen background
  low:         '#111416',   // surfaceLow — tab switcher, secondary containers
  base:        '#161a1e',   // surface — cards, primary elevated containers
  high:        '#20262c',   // surfaceHigh — active tabs, pressed states

  // Stitch design system (new)
  cardBg:      '#212121',   // Stitch card background for Detailed tab

  // Overlay / input
  input:       '#1a1a1a',   // search boxes, text inputs
  inputBorder: '#2a2a2a',   // input border
  outline:     '#42494f',   // active borders, separators in Spending system

  // ⚠️ DEPRECATED: Alternative (Slate) system — Overview / CashForecast / etc.
  // These are kept for backward compatibility with older screens.
  // Avoid using for new screens — prefer the Spending system (bg, low, base, high).
  slate:       '#0f172a',   // slate-900
  slateCard:   '#1e293b',   // slate-800
  slateBorder: '#334155',   // slate-700

  // Transaction-specific
  txDark:      '#131313',   // alternating row bg (even)
  txAlt:       '#1c1b1b',   // alternating row bg (odd)
  txSelected:  '#1e2d1e',   // selected row bg

  // Modal / overlay
  modalBg:     '#0d0d0d',   // TransactionsScreen / modal background
};

// ─── Text Colors ──────────────────────────────────────────────────────────────
export const text = {
  primary:     '#e0e6ed',   // SpendingScreen onSurface — main text
  alt:         '#f1f5f9',   // OverviewScreen / lighter primary
  secondary:   '#a6acb3',   // SpendingScreen onSurfaceVariant
  muted:       '#64748b',   // labels, hints, captions
  slate:       '#94a3b8',   // Overview secondary text (slate-400)

  // Table / transaction specific
  txName:      '#e5e2e1',   // transaction name col
  txDate:      '#5a5a5a',   // date column
  txCategory:  '#4a4a4a',   // category column
  txFooter:    '#3a3a3a',   // footer hints
};

// ─── Brand / Primary ──────────────────────────────────────────────────────────
export const brand = {
  primary:     '#6366f1',   // indigo
  primaryLight:'#818cf8',
  primaryDark: '#4f46e5',
};

// ─── Bar Chart Colors (Stitch design) ─────────────────────────────────────────
export const barColors = {
  oldest:  '#3b82f6',   // blue — oldest month (3 months ago)
  middle:  '#22c55e',   // green — middle month (2 months ago)
  current: '#f97316',   // orange — current month
};

// ─── Semantic Colors ──────────────────────────────────────────────────────────
export const semantic = {
  income:      '#10b981',   // emerald-500 — income / positive
  incomeAlt:   '#3fe56c',   // brighter green — TransactionsScreen income
  expense:     '#ef4444',   // red-500 — expenses / errors
  warning:     '#f59e0b',   // amber-500 — warnings / payment due
  info:        '#06b6d4',   // cyan-500 — info alerts
  blue:        '#60a5fa',   // net flow positive / forecast balance
  purple:      '#a78bfa',   // projected recurring transactions
  projectedBg: '#170a2a',   // row bg for projected txns
  ccPaymentBg: '#1c1407',   // row bg for CC payment due
  ccDateColor: '#fbbf24',   // CC payment date text
  accent:      '#f97316',   // accent orange — for amounts and trends (Stitch)

  // Stat card backgrounds (tinted surfaces)
  incomeBg:            '#0f2d24',   // green-tinted — income stat card
  expenseBg:           '#2d0f0f',   // red-tinted — expense stat card
  netFlowPositiveBg:   '#0f1e2d',   // blue-tinted — positive net flow
  netFlowNegativeBg:   '#2d1a0f',   // orange-tinted — negative net flow
  transactionsBg:      '#1a0f2d',   // purple-tinted — transactions stat card
  infoBg:              '#0c2233',   // cyan-tinted — info alerts
  warningBg:           '#2d1f0a',   // amber-tinted — warning alerts
  criticalBg:          '#2d0a0a',   // red-tinted — critical alerts
  projectedRowBg:      '#170a2a',   // purple-tinted — projected row background
  ccPaymentRowBg:      '#1c1407',   // amber-tinted — CC payment row background

  // Chart colors
  balanceLine:   '#60a5fa',   // blue — balance line in charts
  paidLine:      '#f87171',   // red — paid line in charts
  receivedLine:  '#4ade80',   // green — received line in charts
  axisLabel:     '#4d7a9e',   // muted blue — axis labels

  // Accent colors
  infoAccent:       '#06b6d4',   // cyan — info accent
  projectedAccent:  '#a78bfa',   // purple — projected/accent color
  ccPaymentAccent:  '#f59e0b',   // amber — CC payment accent
};

// ─── Category Colors ──────────────────────────────────────────────────────────
export const category = {
  travel:        '#3b82f6',
  bankFees:      '#10b981',
  shopping:      { spending: '#f59e0b', transactions: '#a855f7' },
  foodDining:    { spending: '#f43f5e', transactions: '#f97316' },
  transportation:'#8b5cf6',
  cashPayment:   '#ec4899',
  billsUtilities:'#06b6d4',
  entertainment: '#f97316',
  healthcare:    '#84cc16',
  housing:       '#6366f1',
  groceries:     '#10b981',
  personalCare:  '#ec4899',
  loanPayments:  '#ef4444',
  education:     '#f59e0b',
  services:      '#a78bfa',
  government:    '#64748b',
  income:        '#3fe56c',
  transfer:      '#94a3b8',
  creditCardPayment: '#ef4444',
  uncategorized: '#475569',
  home:          '#84cc16',
};

// Fallback color palette (cycle when no specific color)
export const categoryFallback = [
  '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

// ─── Borders / Separators ─────────────────────────────────────────────────────
export const border = {
  outline:   '#42494f',   // Spending system borders
  card:      '#42494f',   // Spending system card borders (updated from slate #334155)
  separator: '#20262c',   // List separators (updated from slate #1e293b)
  table:     '#222',      // Table header/footer lines
  divider:   '#1e1e1e',   // Modal section dividers
};

// ─── Typography — Font Families ───────────────────────────────────────────────
export const fontFamily = {
  heading: 'Manrope',   // headings, amounts, bold text
  body:    'Inter',     // body text, labels, UI elements
};

// ─── Typography — Font Sizes ──────────────────────────────────────────────────
export const fontSize = {
  xs:   11,   // labels, captions, badges
  sm:   13,   // body text, secondary info
  base: 15,   // primary body text
  lg:   17,   // section titles, card titles
  xl:   20,   // screen titles
  xxl:  24,   // large headings
  xxxl: 32,   // hero amounts
  hero: 34,   // SpendingScreen outflow hero
};

// ─── Typography — Font Weights ────────────────────────────────────────────────
export const fontWeight = {
  normal:   '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extrabold:'800',
};

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

// ─── Border Radius ────────────────────────────────────────────────────────────
export const radius = {
  xs:   4,    // checkboxes
  sm:   8,    // small elements, inputs, search boxes
  md:   12,   // cards, buttons, modals
  cat:  14,   // category cards
  lg:   16,   // hero cards, large containers
  xl:   24,   // extra large containers
  full: 9999, // pills, chips, avatars
};

// ─── Component-specific tokens ────────────────────────────────────────────────

// Table columns (TransactionsScreen)
export const tableCol = {
  date:     60,
  category: 70,
  amount:   80,
};

// Card min heights
export const cardHeight = {
  heroOutflow: 160,
  heroPeak:    160,
};

// Icon sizes
export const iconSize = {
  xs:   12,
  sm:   15,
  md:   18,
  lg:   20,
  xl:   22,
  xxl:  24,
  hero: 44,
};

// Row heights
export const rowHeight = {
  tableRow:    44,
  searchInput: 38,
  filterBtn:   38,
};

// ─── Backward-compat: flat `colors` object ────────────────────────────────────
// Other files importing from '../utils/theme' continue to work without changes.
// This object mirrors the existing theme.js shape + adds Spending-system tokens.
export const colors = {
  // Brand
  primary:     brand.primary,
  primaryLight:brand.primaryLight,
  primaryDark: brand.primaryDark,

  // Backgrounds — Spending system (new standard)
  bg:          surface.bg,
  surfaceLow:  surface.low,
  surface:     surface.base,
  surfaceHigh: surface.high,

  // Backgrounds — Unified dark system
  background:  surface.bg,
  card:        surface.base,
  cardBorder:  surface.outline,

  // Input
  inputBg:     surface.input,
  inputBorder: surface.inputBorder,

  // Separators
  separator:   border.separator,

  // Text — Spending system values (replacing slate)
  text:          text.primary,      // #e0e6ed — Spending system primary
  textSecondary: text.secondary,    // #a6acb3 — Spending system secondary
  textMuted:     text.muted,
  onSurface:     text.primary,      // spending text primary
  onSurfaceVariant: text.secondary, // spending text secondary

  // Semantic
  income:  semantic.income,
  expense: semantic.expense,
  warning: semantic.warning,
  info:    semantic.info,

  // UI
  outline: border.outline,

  // Semantic backgrounds (stat cards, alerts, etc.)
  incomeBg:           semantic.incomeBg,
  expenseBg:          semantic.expenseBg,
  netFlowPositiveBg:  semantic.netFlowPositiveBg,
  netFlowNegativeBg:  semantic.netFlowNegativeBg,
  transactionsBg:     semantic.transactionsBg,
  infoBg:             semantic.infoBg,
  warningBg:          semantic.warningBg,
  criticalBg:         semantic.criticalBg,
  projectedRowBg:     semantic.projectedRowBg,
  ccPaymentRowBg:     semantic.ccPaymentRowBg,

  // Chart colors
  balanceLine:   semantic.balanceLine,
  paidLine:      semantic.paidLine,
  receivedLine:  semantic.receivedLine,
  axisLabel:     semantic.axisLabel,

  // Accent colors
  infoAccent:      semantic.infoAccent,
  projectedAccent: semantic.projectedAccent,
  ccPaymentAccent: semantic.ccPaymentAccent,
};
