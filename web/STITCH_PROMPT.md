# Stitch UI Design Prompt: BobPay Mobile App

## PROJECT OVERVIEW
Design a mobile app UI for **BobPay** - a decentralized freelance platform with blockchain escrow, AI verification, and automated payments. The app must match the existing web application's **Neo-Brutalist design system** exactly.

---

## DESIGN STYLE: NEO-BRUTALIST

Create a **bold, geometric, high-contrast** design with:
- **Sharp corners** (NO rounded edges - 0px border radius)
- **Thick 3px borders** on all elements
- **Hard-edged shadows** (no blur, offset shadows)
- **Bold typography** with uppercase labels
- **High contrast colors** (navy, coral, cream)
- **Generous spacing** with clear hierarchy

---

## COLOR SYSTEM

### Primary Palette
```
Background:        #F7F5F0 (Warm Cream White) - hsl(45, 30%, 97%)
Foreground:       #1A1F2E (Deep Navy) - hsl(220, 30%, 12%)

Primary:           #1B3A5E (Deep Navy) - hsl(220, 65%, 18%)
Primary Text:      #F7F5F0 (Cream White)

Secondary:         #EBE8E0 (Warm Cream) - hsl(45, 25%, 92%)
Secondary Text:    #1A1F2E (Navy)

Accent:            #E85D3F (Coral Orange) - hsl(12, 85%, 60%)
Accent Text:       #F7F5F0 (Cream White)

Success:           #2D8659 (Forest Green) - hsl(152, 60%, 40%)
Success Text:      #F7F5F0 (Cream White)

Warning:           #E67E22 (Bright Orange) - hsl(38, 92%, 50%)
Warning Text:      #1A1F2E (Navy)

Muted:             #E8E5DD (Light Cream) - hsl(45, 20%, 90%)
Muted Text:        #6B7280 (Gray) - hsl(220, 15%, 45%)

Border:            #D1CED6 (Light Gray) - hsl(220, 20%, 82%)
```

### Usage Guidelines
- **Navy (Primary)**: Main actions, headers, trust elements
- **Coral (Accent)**: CTAs, highlights, active states
- **Green (Success)**: Completed states, positive actions
- **Orange (Warning)**: Pending states, locked funds
- **Cream (Background)**: Page backgrounds, cards

---

## TYPOGRAPHY

### Fonts
- **Display**: Space Grotesk (Weights: 400, 500, 600, 700)
- **Body**: Inter (Weights: 400, 500, 600)

### Type Scale

**Headlines:**
- **XL**: Space Grotesk Bold, 64-96px, Line Height 0.9, Letter Spacing -0.02em
- **LG**: Space Grotesk Bold, 48-60px, Line Height 0.95, Letter Spacing -0.01em
- **MD**: Space Grotesk Bold, 24-36px, Line Height 1.2

**Body:**
- **LG**: Inter Regular, 18-20px, Line Height 1.6
- **MD**: Inter Regular, 16px, Line Height 1.5
- **SM**: Inter Regular, 14px, Line Height 1.5

**Labels:**
- **Mono**: Space Grotesk SemiBold, 12-14px, UPPERCASE, Letter Spacing 0.1em
- **Display Bold**: Space Grotesk Bold, 20px
- **Display SemiBold**: Space Grotesk SemiBold, 16px

---

## SHADOWS

All shadows are **hard-edged with NO blur**:

```
Default Shadow:    4px 4px 0px #1B3A5E (Navy)
Small Shadow:      2px 2px 0px #1B3A5E (Navy)
Large Shadow:     6px 6px 0px #1B3A5E (Navy)
Accent Shadow:     4px 4px 0px #E85D3F (Coral)
```

**Interactive States:**
- **Hover**: Element moves translateX(2px) translateY(2px), shadow removed
- **Active**: Element moves translateX(4px) translateY(4px), shadow removed

---

## BORDERS & SPACING

- **Border Width**: 3px (standard), 4px (emphasis)
- **Border Radius**: 0px (NO rounded corners)
- **Border Color**: Foreground (#1A1F2E) or specific color
- **Card Padding**: 24px
- **Section Padding**: 48-96px vertical
- **Element Gap**: 8px, 12px, 16px, 24px, 32px, 48px

---

## BUTTONS

### Variants
1. **Default**: Navy bg, cream text, 3px border, 4px shadow
2. **Accent**: Coral bg, cream text, 3px border, 4px shadow
3. **Outline**: Cream bg, navy text, 3px border, 4px shadow
4. **Success**: Green bg, cream text, 3px border, 4px shadow
5. **Hero**: Coral bg, 4px border, 6px shadow, larger size

### Sizes
- **SM**: Height 40px, Padding 16px horizontal, Text 12px
- **Default**: Height 48px, Padding 24px horizontal, Text 14px
- **LG**: Height 56px, Padding 32px horizontal, Text 16px
- **XL**: Height 64px, Padding 40px horizontal, Text 18px

### Typography
- Font: Space Grotesk SemiBold
- Text: UPPERCASE
- Letter Spacing: 0.05em
- Icon Size: 16-20px

---

## CARDS

- **Background**: Cream (#F7F5F0) or Secondary Cream (#EBE8E0)
- **Border**: 3px Navy (#1A1F2E)
- **Shadow**: 4px 4px 0px Navy
- **Padding**: 24px
- **Border Radius**: 0px

**Colored Cards**: Use Primary/Success/Warning/Accent backgrounds with matching text colors.

---

## FEATURES TO DESIGN

### 1. Landing/Onboarding
- Hero section with headline, CTA buttons, trust indicators
- How It Works (4 steps with icons)
- Feature sections (Milestones, Auto Payment, AI Verification, etc.)

### 2. Authentication
- Split-screen: Branding left, form right
- Sign In/Sign Up toggle
- Role selection (Client/Freelancer)
- Form fields with 3px borders

### 3. Client Dashboard
- Stats cards (projects, budget, active)
- Project list with cards
- Quick actions
- Navigation

### 4. Freelancer Dashboard
- Earnings overview
- Active projects
- Proposals
- Performance metrics

### 5. Wallet Screen
- 4 balance cards (Total, Available, Locked, Pending)
- Transaction history list
- Quick actions sidebar
- Locked funds breakdown
- Security info section
- Funds flow explanation

### 6. Project Detail
- Project overview card
- Milestone timeline
- Deliverables list
- Payment status
- Action buttons

### 7. Chat
- Conversations list
- Chat interface
- Message bubbles
- File attachments
- Video call button

### 8. Disputes
- Dispute list
- Dispute detail
- Evidence submission
- Status tracking

### 9. Browse Screens
- Search bar
- Filter chips
- Grid/List view toggle
- Cards with brutal shadows

---

## MOBILE-SPECIFIC REQUIREMENTS

1. **Touch Targets**: Minimum 44x44px
2. **Navigation**: Bottom navigation bar or hamburger menu
3. **Spacing**: Slightly tighter on mobile, expand on tablet
4. **Typography**: Scale down proportionally but maintain hierarchy
5. **Cards**: Full-width on mobile, grid on tablet+
6. **Shadows**: Maintain same offset ratios (may scale slightly)
7. **Gestures**: Swipe actions where appropriate
8. **Safe Areas**: Respect notch/status bar areas

---

## DESIGN PRINCIPLES

1. ✅ **Sharp & Geometric**: No rounded corners anywhere
2. ✅ **Bold Borders**: 3px minimum, always visible
3. ✅ **Hard Shadows**: No blur, offset shadows create depth
4. ✅ **High Contrast**: Bold colors, clear hierarchy
5. ✅ **Bold Typography**: Space Grotesk for display, uppercase labels
6. ✅ **Generous Spacing**: Clear breathing room
7. ✅ **Interactive Feedback**: Buttons move on interaction
8. ✅ **Consistent Shadows**: Same direction everywhere
9. ✅ **Color Coding**: Success=Green, Warning=Orange, Accent=Coral
10. ✅ **Brutalist Aesthetic**: Raw, bold, unapologetic

---

## REFERENCE

The web application uses this exact design system. Match:
- Colors exactly (HSL values provided)
- Typography scale exactly
- Shadow system exactly
- Border widths exactly
- Spacing ratios exactly
- Component styles exactly

---

## DELIVERABLES NEEDED

1. **Design System File**: Colors, typography, shadows, spacing tokens
2. **Component Library**: Buttons, cards, inputs, badges, etc.
3. **Screen Designs**: All major screens listed above
4. **Mobile Patterns**: Navigation, lists, forms, modals
5. **Interaction States**: Hover, active, disabled, loading
6. **Responsive Breakpoints**: Mobile (375px), Tablet (768px), Desktop (1024px+)

---

## TECHNICAL NOTES

- Design for iOS and Android (consider platform conventions)
- Use 8px grid system
- Export assets at 1x, 2x, 3x for iOS
- Provide design tokens in JSON format
- Include dark mode variants (optional but preferred)
- Ensure accessibility (WCAG AA minimum)

---

**Please create a pixel-perfect mobile UI that matches the web application's Neo-Brutalist design system exactly, adapted for mobile touch interactions and smaller screens.**
