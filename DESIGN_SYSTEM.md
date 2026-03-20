# Gullak Mobile Design System

> Comprehensive design documentation extracted from the Gullak mobile app codebase.
> Last updated: March 2026

---

## 1. Color Palette

### Backgrounds

| Role | Hex | Usage |
|------|-----|-------|
| Primary Background | `#0f172a` | Main screen background (Overview, CashForecast) |
| Dark Background | `#0d0d0d` | Transactions, Spending screens |
| Darkest Background | `#0c0e10` | SpendingScreen hero cards |
| Card Background | `#1e293b` | Overview cards, stat cards |
| Surface (Elevated) | `#161a1e` | SpendingScreen cards |
| Surface Low | `#111416` | SpendingScreen tab switcher background |
| Surface High | `#20262c` | SpendingScreen active tab, elevated elements |
| Card Dark | `#131313` | Transactions alternating rows |
| Card Alt | `#1c1b1b` | Transactions alternating rows |
| Input Background | `#1a1a1a` | Search boxes, inputs |
| Surface Layer 1 | `#1a1a1a` | Modals, sheets |

### Text Colors

| Role | Hex | Usage |
|------|-----|-------|
| Primary Text | `#f1f5f9` | Main headings, important values |
| Text (Spending) | `#e0e6ed` | Primary text in SpendingScreen |
| Text (Transactions) | `#e5e2e1` | Transaction names, amounts |
| Secondary Text | `#94a3b8` | Subtitles, descriptions |
| Muted Text | `#64748b` | Labels, hints, captions |
| Text Variant (Spending) | `#a6acb3` | Secondary text in SpendingScreen |

### Semantic Colors

| Role | Hex | Usage |
|------|-----|-------|
| Income / Positive | `#10b981` | Income amounts, positive indicators |
| Income (Transactions) | `#3fe56c` | Transaction income (green accent) |
| Expense / Negative | `#ef4444` | Expense amounts, warnings, errors |
| Warning | `#f59e0b` | Payment due banners, budget warnings |
| Info | `#06b6d4` | Info alerts, secondary accent |
| Blue Accent | `#60a5fa` | Net flow positive, forecast balance |

### Category Colors

| Category | Hex | Icon |
|----------|-----|------|
| Travel | `#3b82f6` | `airplane-outline` |
| Transportation | `#3b82f6` / `#8b5cf6` | `car-outline` |
| Shopping | `#f59e0b` / `#a855f7` | `bag-handle-outline` |
| Food & Dining | `#f43f5e` / `#f97316` | `restaurant-outline` |
| Entertainment | `#f97316` / `#ec4899` | `film-outline` |
| Healthcare | `#10b981` / `#84cc16` | `medkit-outline` |
| Housing / Home | `#64748b` / `#6366f1` | `home-outline` |
| Bills & Utilities | `#06b6d4` / `#eab308` | `flash-outline` |
| Groceries | `#10b981` / `#22c55e` | `cart-outline` |
| Personal Care | `#ec4899` / `#f59e0b` | `heart-outline` |
| Education | `#8b5cf6` / `#f59e0b` | `school-outline` |
| Bank Fees | `#10b981` / `#ef4444` | `card-outline` |
| Loan Payments / Credit Card Payments | `#ef4444` | `trending-down-outline` |
| Income | `#3fe56c` | - |
| Transfer | `#94a3b8` | - |
| Government | `#6366f1` / `#64748b` | `business-outline` |
| Services | `#14b8a6` / `#a78bfa` | `construct-outline` |
| Uncategorized | `#475569` / `#6b7280` | `ellipsis-horizontal-outline` |

### Fallback Category Color Palette

When category colors are not specified, cycle through:
```
#3b82f6, #10b981, #f59e0b, #f43f5e, #8b5cf6,
#ec4899, #06b6d4, #f97316, #84cc16, #6366f1
```

### Brand / UI Colors

| Role | Hex | Usage |
|------|-----|-------|
| Primary (Indigo) | `#6366f1` | Buttons, active states, links |
| Primary Light | `#818cf8` | Hover states |
| Primary Dark | `#4f46e5` | Pressed states |
| Outline / Border | `#334155` | Card borders, dividers |
| Outline (Spending) | `#42494f` | Borders in SpendingScreen |
| Separator | `#1e293b` | List separators |
| Table Border | `#222` | Table header/footer lines |

---

## 2. Typography

### Font Families

| Family | Usage |
|--------|-------|
| `Manrope` | Headings, amounts, bold text |
| `Inter` | Body text, labels, UI elements |
| System default | Fallback |

Note: Fonts are specified in SpendingScreen but may fall back to system defaults in other screens.

### Font Size Scale

| Token | Size (px) | Usage |
|-------|-----------|-------|
| `xs` | 11 | Labels, captions, badges |
| `sm` | 13 | Body text, secondary info |
| `base` | 15 | Primary body text |
| `lg` | 17 | Section titles, card titles |
| `xl` | 20 | Screen titles |
| `xxl` | 24 | Large headings |
| `xxxl` | 32 | Hero amounts |

### Additional Size References

| Context | Size (px) |
|---------|-----------|
| Table header labels | 11 |
| Table date column | 13 |
| Table category column | 11 |
| Table name column | 13 |
| Table amount column | 13 |
| Group header label | 10 |
| Hero outflow amount | 34 |
| Category card name | 14 |
| Period pill text | 13 |
| Tab button text | 13 |
| Trend item category | 14 |
| Stat card value | 24 (xxl) |
| Alert message | 14 (sm) |

### Font Weights

| Token | Weight | Usage |
|-------|--------|-------|
| `normal` | 400 | Body text |
| `medium` | 500 | Labels, secondary text |
| `semibold` | 600 | Values, emphasis |
| `bold` | 700 | Headings, amounts, titles |
| `800` | Extra bold | Hero amounts (outflow) |

### Letter Spacing

| Context | Value |
|---------|-------|
| Uppercase labels | 0.5 - 1.3 |
| Group headers | 0.8 |
| Month labels | 0.4 |

### Text Transforms

| Context | Transform |
|---------|-----------|
| Section labels | `uppercase` |
| Group headers | `uppercase` |
| Table headers | `uppercase` |

---

## 3. Spacing & Layout

### Spacing Scale

| Token | Value (px) |
|-------|------------|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `xxl` | 48 |

### Standard Padding

| Context | Padding |
|---------|---------|
| Screen horizontal | 16px (`spacing.md`) |
| Screen vertical (header) | 14px |
| Card padding | 14-16px |
| Button padding horizontal | 18px (pills) |
| Button padding vertical | 8-14px |
| Table row horizontal | 16px |
| Section gap | 16px (`spacing.md`) |
| Small gap | 8px (`spacing.sm`) |
| Tiny gap | 4px (`spacing.xs`) |

### Row Heights

| Context | Height |
|---------|--------|
| Table row | 44px |
| Period pill | ~28px (py: 8 + text) |
| Tab button | ~27px (py: 9 + text) |
| Search input | 38px |
| Filter button | 38px |

### Column Widths (Transactions)

| Column | Width |
|--------|-------|
| Date | 60px |
| Category | 70px |
| Amount | 80px |
| Name | flex: 1 |

### Card Dimensions

| Context | Min Height |
|---------|------------|
| Hero outflow card | 160px |
| Hero peak card | 160px |
| Category card | auto (py: 14) |
| Stat card | auto (py: 16) |

### Grid Layouts

| Context | Columns | Gap |
|---------|---------|-----|
| Summary grid | 2 per row | 8px |
| Category grid (bottom 2) | 2 per row | 8px |
| Hero grid | 2:1 ratio | 10px |

---

## 4. Components

### Table Row (Transactions)

```
Height: 44px
Padding: horizontal 16px
Background: alternating #131313 / #1c1b1b
Selected state: #1e2d1e

Columns:
- Date: 60px, color #5a5a5a, font 13px
- Category dot: 6px circle + 70px text
- Name: flex: 1, color #e5e2e1, font 13px semibold
- Amount: 80px, right-aligned, font 13px semibold
  - Income: color #3fe56c
  - Expense: color #e5e2e1
```

### Category Card (Spending)

```
Background: #161a1e (D.surface)
Border radius: 14px
Padding: 14px
Border: none (uses background hierarchy)

Structure:
- Icon container: 40x40, rounded 10px, bg: {color}22
- Category name: 14px, bold, Manrope
- Percentage: 12px, muted, Inter
- Amount: 14px, bold, Manrope, right-aligned
- Progress bar: 1.5px height, rounded
```

### Stat Card (Overview)

```
Background: varies by context
Border radius: 12px
Padding: 16px
Border: 1px solid #334155 (colors.cardBorder)

Structure:
- Label: 11px, medium, uppercase, muted
- Value: 24px, bold, color varies
- Sub: 11px, muted
```

### Hero Summary Card (Spending)

```
Outflow Card (2/3 width):
- Background: #161a1e
- Border radius: 16px
- Padding: 16px
- Min height: 160px

- Label: "TOTAL OUTFLOW", 10px, uppercase, letter-spacing 1.3
- Amount: 34px, weight 800, Manrope
- Trend badge: pill with icon + text
- Date range: 11px, muted

Peak Card (1/3 width):
- Background: #111416 (D.surfaceLow)
- Border radius: 16px
- Padding: 14px
- Min height: 160px

- Icon: 18px, muted
- Heading: 13px, bold, Manrope
- Description: 11px, muted, Inter
- Amount: 15px, bold, Manrope
```

### Period Selector Pills

```
Background: #111416 (surfaceLow)
Active: #20262c (surfaceHigh) + border 1px #42494f
Border radius: 9999px (full)
Padding: horizontal 18px, vertical 8px

Text:
- Inactive: 13px, muted
- Active: 13px, bold, Manrope, primary text color
```

### Tab Switcher

```
Container:
- Background: #111416 (surfaceLow)
- Border radius: 12px
- Padding: 3px
- Gap: 3px

Tab Button:
- Flex: 1
- Padding vertical: 9px
- Border radius: 9px
- Active: background #20262c + border 1px #42494f

Text:
- Inactive: 13px, semibold 600, muted
- Active: 13px, bold 700, Manrope, primary text color
```

### Progress Bars

```
Track:
- Height: 1.5px (category cards) or 4px (category rows) or 14px (budget)
- Background: #42494f (D.outline) or #334155 (cardBorder)
- Border radius: 100px (full)

Fill:
- Height: 100%
- Border radius: 100px
- Color: category color or semantic color

Budget bar special:
- Time marker: 2px width, 18px height, positioned absolute
```

### Section Headers

```
Title: 18px, bold, Manrope
Subtitle: 12px, muted, Inter
Margin bottom: 14px

Alternative (card style):
Title: 13-14px, semibold, uppercase, letter-spacing 0.8, muted
```

### Group Header (Transactions)

```
Container: row with flex lines
Padding: horizontal 16px, top 12px, bottom 4px
Background: #0d0d0d

Line: flex 1, height 1px, background #222
Label: 10px, semibold, uppercase, letter-spacing 0.8, color #3fe56c
Gap: 8px
```

### Alert Banner

```
Background: varies by severity
- Info: #0c2233
- Warning: #2d1f0a
- Critical: #2d0a0a

Border: 1px solid {severity-color}44
Border radius: 12px
Padding: 16px horizontal, 8px vertical

Icon: 18px, severity color
Message: 14px, medium
Rule name: 11px, muted
```

### Payment Due Banner

```
Background: #2d1f0a
Border: 1px solid #f59e0b44
Border radius: 12px
Padding: 16px horizontal, 8px vertical

Icon: 18px, warning color
Title: 14px, semibold
Subtitle: 12px, warning color
```

### Search Box

```
Background: #1a1a1a
Border: 1px solid #2a2a2a
Border radius: 8px
Padding: horizontal 10px, vertical 7px
Height: 38px

Icon: 15px, muted
Input: 13px, primary text color
```

### Filter Button

```
Size: 38x38px
Background: #1a1a1a
Border: 1px solid #2a2a2a
Border radius: 8px

Active state:
- Background: primary color (#6366f1)
- Border: primary color

Badge (if filters active):
- Position: absolute, top -4px, right -4px
- Size: 15x15px circle
- Background: #ef4444
- Text: 9px, bold, white
```

### Active Filter Chip

```
Background: {primary}22 (12% opacity)
Border: 1px solid {primary}44 (27% opacity)
Border radius: 100px
Padding: horizontal 10px, vertical 3px

Text: 11px, medium, primary color
Close icon: 11px, primary color
```

### Category Chip (Picker)

```
Background: #1a1a1a
Border: 1px solid #2a2a2a
Border radius: 100px
Padding: horizontal 16px, vertical 8px

Dot: 9px circle
Text: 13px, medium, primary text color
```

### Checkbox (Multi-select)

```
Size: 16x16px
Border: 1.5px solid #444
Border radius: 4px

Selected:
- Background: primary color
- Border: primary color
- Checkmark: 10px, white
```

### Bottom Bar (Multi-select)

```
Position: absolute bottom
Background: #131313
Border top: 1px solid #222
Padding: horizontal 16px, vertical 8px

Actions:
- Clear button: text, muted
- Selection count: 11px, muted, centered
- Set Category button: primary bg, rounded 8px
```

### Modal

```
Background: #0d0d0d or #0f172a (colors.background)

Header:
- Padding: 16px
- Border bottom: 1px solid #1e1e1e or cardBorder
- Title: 17-18px, bold

Content:
- Padding: 16px

Option:
- Padding: 14px or 8px
- Border radius: 8px or 6px
- Active: background {primary}22

Footer (if present):
- Border top: 1px solid #1e1e1e
- Padding: 16px
```

---

## 5. Borders & Shapes

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 8px | Small elements, inputs |
| `md` | 12px | Cards, buttons, modals |
| `lg` | 16px | Hero cards, large containers |
| `xl` | 24px | Extra large containers |
| `full` | 9999px | Pills, chips, avatars |

### Border Radius by Component

| Component | Radius |
|-----------|--------|
| Search box | 8px |
| Filter button | 8px |
| Stat card | 12px |
| Category card | 14px |
| Hero card | 16px |
| Period pill | 9999px |
| Category chip | 100px (effectively full) |
| Tab switcher container | 12px |
| Tab button | 9px |
| Checkbox | 4px |
| Progress bar | 100px / 2px (height/2) |
| Modal option | 8px or 6px |
| Category dot | 50% (circle) |

### Border Usage

| Context | Border | When to Use |
|---------|--------|-------------|
| Cards (Overview) | 1px solid #334155 | Always visible |
| Cards (Spending) | None | Background hierarchy instead |
| Active elements | 1px solid primary | Selected/active state |
| Inputs | 1px solid #2a2a2a | Default state |
| Table header | 1px solid #222 | Bottom only |
| Group header line | 1px height #222 | Separator |
| Dividers | 1px solid #1e1e1e | Section separators |

### Visual Separation Strategies

**With Borders:**
- OverviewScreen: All cards have visible borders
- CashForecastScreen: Cards have visible borders
- Modals: Header/content/footer separators

**Without Borders (Background Hierarchy):**
- SpendingScreen: Uses surface elevation instead
  - Surface: `#161a1e`
  - Surface Low: `#111416`
  - Surface High: `#20262c`

### Elevation / Shadow

Currently minimal shadows in the app. Visual hierarchy achieved through:
1. Background color differences
2. Border visibility
3. Surface layer system (SpendingScreen)

---

## 6. Dark Theme Rules

### Background Hierarchy (3 Levels)

```
Level 0 (Base):     #0c0e10 (darkest)
Level 1 (Surface):  #161a1e (cards, elevated)
Level 2 (High):     #20262c (active, pressed)
```

### Surface Layer System

| Layer | Hex | Usage |
|-------|-----|-------|
| Background | `#0c0e10` | Screen background |
| Surface Low | `#111416` | Tab switcher, secondary surfaces |
| Surface | `#161a1e` | Cards, primary surfaces |
| Surface High | `#20262c` | Active states, elevated elements |
| Outline | `#42494f` | Borders, separators |

### Alternative Background System (Overview/CashForecast)

```
Background: #0f172a (slate-900)
Card: #1e293b (slate-800)
Border: #334155 (slate-700)
```

### Creating Visual Separation Without Borders

1. **Elevation contrast**: Use lighter background for elevated elements
2. **Subtle opacity**: `{color}22` (13% opacity) for active states
3. **Border on interaction**: Add border only on active/hover states
4. **Text hierarchy**: Use text color to create depth

### Text Color Hierarchy

```
Primary:   #e0e6ed / #f1f5f9 (brightest)
Secondary: #a6acb3 / #94a3b8 (medium)
Muted:     #64748b (darkest visible)
```

### Color Contrast Guidelines

| Element | Min Contrast | Example |
|---------|--------------|---------|
| Primary text on dark | 4.5:1 | #e0e6ed on #0c0e10 ✓ |
| Muted text on dark | 3:1 | #64748b on #0f172a ✓ |
| Accent on surface | 3:1 | #6366f1 on #1e293b ✓ |

---

## 7. Iconography

### Icon Libraries

| Library | Usage |
|---------|-------|
| `@expo/vector-icons/Ionicons` | Primary icon library |
| `@expo/vector-icons/MaterialCommunityIcons` | (not currently used) |

### Icon Sizes by Context

| Context | Size | Color |
|---------|------|-------|
| Header actions | 20px | Primary (#6366f1) |
| Search icon | 15px | Muted (#64748b) |
| Filter button | 17px | Secondary / white |
| Card icons | 18-20px | Category color |
| Alert icons | 18px | Severity color |
| Close buttons | 22-24px | Primary text |
| Checkmark (checkbox) | 10px | White |
| Chevron (navigation) | 14-20px | Muted / primary |
| Trend indicators | 12-13px | Semantic (green/red) |
| Tab icons | - | Not used (text only) |
| Category dots | 6-10px | Category color |

### Category Icon Mapping

| Category | Icon Name |
|----------|-----------|
| Travel | `airplane-outline` |
| Bank Fees | `card-outline` |
| Shopping | `bag-handle-outline` |
| Food & Dining | `restaurant-outline` |
| Transportation | `car-outline` |
| Cash Payment | `cash-outline` |
| Bills & Utilities | `flash-outline` |
| Entertainment | `film-outline` |
| Healthcare | `medkit-outline` |
| Housing | `home-outline` |
| Groceries | `cart-outline` |
| Personal Care | `heart-outline` |
| Loan Payments | `trending-down-outline` |
| Education | `school-outline` |
| Services | `construct-outline` |
| Government | `business-outline` |
| Uncategorized | `ellipsis-horizontal-outline` |

### Icon Color Rules

1. **Category icons**: Match category color with 13% opacity background (`{color}22`)
2. **Action icons**: Primary color (#6366f1) or secondary text color
3. **Status icons**: Semantic colors (income=green, expense=red, warning=amber)
4. **Navigation icons**: Muted color (#64748b) or primary for active
5. **Inline icons**: Match adjacent text color or use semantic color

---

## 8. Animation & Interaction

### Active Opacity

| Component | Value |
|-----------|-------|
| TouchableOpacity (default) | 0.75 |
| Cards | 0.75-0.8 |
| Buttons | 0.7 |

### Refresh Control

```
TintColor: primary color (#6366f1)
```

### Activity Indicator

```
Size: large
Color: primary color (#6366f1)
```

---

## 9. Component Patterns Reference

### Bento Grid Layout

```
Container: flexDirection row, gap 10px
Card 1: flex 2 (2/3 width)
Card 2: flex 1 (1/3 width)
Min height: 160px each
```

### Stat Grid Layout

```
Container: flexWrap wrap, gap 8px
Card: flex 1, minWidth 45%
Result: 2 columns
```

### Category List Pattern

1. Full-width cards for main categories
2. Last 2 categories in 2-column grid
3. Each card: icon + name/percentage + amount + progress bar

### Transaction List Pattern

1. Sticky table header with column labels
2. Section headers (date groups) with line separators
3. Alternating row backgrounds
4. Left-aligned date, category, name
5. Right-aligned amount
6. Color-coded amounts (income/expense)

---

## 10. Best Practices

### Consistency Rules

1. **Always use theme tokens** - Never hardcode colors, spacing, or font sizes
2. **Match screen context** - Use appropriate background system (Spending vs Overview)
3. **Maintain hierarchy** - Background → Surface → SurfaceHigh
4. **Semantic colors** - Use income/expense/warning for meaning, not decoration

### Adding New Screens

1. Import from `../utils/theme`:
   ```js
   import { colors, spacing, radius, fontSize, fontWeight } from '../utils/theme';
   ```

2. Choose background system:
   - Dark with elevation: `#0c0e10` base (Spending style)
   - Slate system: `#0f172a` base (Overview style)

3. Use semantic colors for data:
   - Income/positive: `colors.income` or `#3fe56c`
   - Expense/negative: `colors.expense`
   - Warning: `colors.warning`

### Adding New Categories

1. Add to `CATEGORY_CONFIG` in SpendingScreen
2. Add to `CATEGORY_COLORS` object in TransactionsScreen
3. Add to `CATEGORY_MAP` in helpers.js
4. Choose from fallback palette if no specific color

---

## 11. Token Export

```js
// src/utils/theme.js
export const colors = {
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  background: '#0f172a',
  card: '#1e293b',
  cardBorder: '#334155',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  income: '#10b981',
  expense: '#ef4444',
  warning: '#f59e0b',
  info: '#06b6d4',
  separator: '#1e293b',
  inputBg: '#1e293b',
  inputBorder: '#334155',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 9999 };
export const fontSize = { xs: 11, sm: 13, base: 15, lg: 17, xl: 20, xxl: 24, xxxl: 32 };
export const fontWeight = { normal: '400', medium: '500', semibold: '600', bold: '700' };
```

---

*This document should be updated whenever significant design changes are made to the app.*
