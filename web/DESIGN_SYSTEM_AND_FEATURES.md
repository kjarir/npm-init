# BobPay - Complete Feature List & Design System Documentation

## 🎯 APPLICATION FEATURES

### **Landing Page (Index)**
- Hero Section with headline, CTA buttons, trust indicators
- How It Works (4-step process)
- Milestone Section
- Auto Payment Section
- AI Verification Section
- Private Storage Section
- Fair Exit Section
- Reputation Section
- Professions Section
- Footer with links

### **Authentication**
- Sign In / Sign Up toggle
- Email & Password fields
- Role selection (Client/Freelancer)
- Form validation
- Split-screen layout (branding left, form right)

### **Client Features**
1. **Client Dashboard**
   - Project statistics cards
   - Active projects list
   - Quick actions
   - Project cards with status

2. **Browse Freelancers**
   - Freelancer search & filters
   - Freelancer cards with ratings
   - Profile preview
   - Hire functionality

3. **Create Project**
   - Multi-step form
   - Project templates
   - Milestone creation
   - Budget setting
   - Category selection

4. **Project Detail**
   - Project overview
   - Milestone timeline
   - Deliverables tracking
   - Payment status
   - Chat integration
   - File attachments

### **Freelancer Features**
1. **Freelancer Dashboard**
   - Earnings overview
   - Active projects
   - Proposals received
   - Performance metrics

2. **Browse Projects**
   - Project listings
   - Search & filters
   - Project cards
   - Apply/Proposal functionality

3. **Freelancer Project Detail**
   - Project requirements
   - Milestone submission
   - Time tracking
   - Deliverables upload
   - Payment tracking

### **Shared Features**
1. **Wallet**
   - Balance cards (Total, Available, Locked, Pending)
   - Transaction history
   - Quick actions (Buy/Redeem BobCoins)
   - Locked funds breakdown
   - Security info
   - Funds flow explanation

2. **Chat**
   - Conversations list
   - Chat window
   - File sharing
   - Video call button
   - Voice recorder
   - Contract creation

3. **Disputes**
   - Dispute list
   - Dispute detail view
   - Evidence submission
   - Dispute process steps
   - Status tracking

---

## 🎨 DESIGN SYSTEM: "NEO-BRUTALIST"

### **Design Philosophy**
- **Style**: Neo-Brutalist / Brutalist Design
- **Aesthetic**: Bold, geometric, high contrast
- **Shadows**: Hard-edged, offset shadows (no blur)
- **Borders**: Thick 3px borders everywhere
- **Typography**: Bold, uppercase labels, tight tracking
- **Colors**: High contrast, saturated colors
- **Spacing**: Generous padding, clear hierarchy

---

## 🎨 COLOR PALETTE

### **Primary Colors (HSL Format)**
```
Background:        hsl(45, 30%, 97%)   - Warm Cream White (#F7F5F0)
Foreground:       hsl(220, 30%, 12%)   - Deep Navy Text (#1A1F2E)

Primary:           hsl(220, 65%, 18%)   - Deep Navy (#1B3A5E)
Primary Foreground: hsl(45, 30%, 97%)   - Cream White

Secondary:         hsl(45, 25%, 92%)    - Warm Cream (#EBE8E0)
Secondary Foreground: hsl(220, 30%, 12%) - Navy Text

Accent:            hsl(12, 85%, 60%)    - Coral Orange (#E85D3F)
Accent Foreground: hsl(45, 30%, 97%)    - Cream White

Success:           hsl(152, 60%, 40%)   - Forest Green (#2D8659)
Success Foreground: hsl(45, 30%, 97%)   - Cream White

Warning:           hsl(38, 92%, 50%)    - Bright Orange (#E67E22)
Warning Foreground: hsl(220, 30%, 12%)  - Navy Text

Muted:             hsl(45, 20%, 90%)    - Light Cream (#E8E5DD)
Muted Foreground:  hsl(220, 15%, 45%)   - Gray (#6B7280)

Destructive:       hsl(0, 72%, 51%)     - Red
Destructive Foreground: hsl(45, 30%, 97%)

Border:            hsl(220, 20%, 82%)   - Light Gray (#D1CED6)
```

### **Color Usage**
- **Primary (Navy)**: Main actions, headers, trust elements
- **Accent (Coral)**: CTAs, highlights, active states
- **Success (Green)**: Completed states, positive actions
- **Warning (Orange)**: Pending states, locked funds
- **Background (Cream)**: Page backgrounds, cards
- **Secondary (Cream)**: Card backgrounds, subtle sections

---

## 📝 TYPOGRAPHY

### **Font Families**
```
Display Font: Space Grotesk (Google Fonts)
  - Weights: 400, 500, 600, 700
  - Usage: Headlines, buttons, labels, UI elements

Body Font: Inter (Google Fonts)
  - Weights: 400, 500, 600
  - Usage: Body text, descriptions, paragraphs
```

### **Type Scale**

#### **Headlines**
```
headline-xl:
  - Font: Space Grotesk, Bold (700)
  - Size: 5xl (48px) → md: 7xl (72px) → lg: 8xl (96px)
  - Line Height: 0.9
  - Letter Spacing: -0.02em (tighter)
  - Usage: Hero headlines, main page titles

headline-lg:
  - Font: Space Grotesk, Bold (700)
  - Size: 4xl (36px) → md: 5xl (48px) → lg: 6xl (60px)
  - Line Height: 0.95
  - Letter Spacing: -0.01em
  - Usage: Section headers, major titles

headline-md:
  - Font: Space Grotesk, Bold (700)
  - Size: 2xl (24px) → md: 3xl (30px) → lg: 4xl (36px)
  - Line Height: 1.2 (tight)
  - Usage: Subsection headers, card titles
```

#### **Body Text**
```
body-lg:
  - Font: Inter, Regular (400)
  - Size: lg (18px) → md: xl (20px)
  - Line Height: 1.6 (relaxed)
  - Usage: Large body text, descriptions

body-md:
  - Font: Inter, Regular (400)
  - Size: base (16px)
  - Line Height: 1.5
  - Usage: Standard body text

body-sm:
  - Font: Inter, Regular (400)
  - Size: sm (14px)
  - Line Height: 1.5
  - Usage: Small text, captions, helper text
```

#### **Labels & UI**
```
label-mono:
  - Font: Space Grotesk, SemiBold (600)
  - Size: xs (12px) → md: sm (14px)
  - Letter Spacing: 0.1em (widest)
  - Text Transform: UPPERCASE
  - Usage: Labels, badges, navigation links

display-bold:
  - Font: Space Grotesk, Bold (700)
  - Size: 20px
  - Usage: Card titles, button text, UI elements

display-semibold:
  - Font: Space Grotesk, SemiBold (600)
  - Size: 16px
  - Usage: Secondary UI text
```

---

## 🎯 SHADOWS (BRUTAL SHADOWS)

### **Shadow System**
```
brutal-shadow (Default):
  - Offset: 4px, 4px
  - Blur: 0px (hard edge)
  - Color: Primary (Navy) - hsl(220, 65%, 18%)
  - Usage: Cards, buttons, main elements

brutal-shadow-sm (Small):
  - Offset: 2px, 2px
  - Blur: 0px
  - Color: Primary (Navy)
  - Usage: Small badges, subtle elevation

brutal-shadow-lg (Large):
  - Offset: 6px, 6px
  - Blur: 0px
  - Color: Primary (Navy)
  - Usage: Hero elements, prominent cards

brutal-shadow-accent:
  - Offset: 4px, 4px
  - Blur: 0px
  - Color: Accent (Coral) - hsl(12, 85%, 60%)
  - Usage: Accent buttons, highlighted elements
```

### **Interactive States**
```
Hover State:
  - Transform: translateX(2px) translateY(2px)
  - Shadow: Removed (shadow-none)
  - Creates "pressed" effect

Active State:
  - Transform: translateX(4px) translateY(4px)
  - Shadow: Removed
  - Creates "clicked" effect
```

---

## 📐 SPACING & LAYOUT

### **Border Width**
```
border-3: 3px (standard)
border-4: 4px (hero buttons, emphasis)
```

### **Border Radius**
```
--radius: 0px (NO rounded corners - brutalist style)
All elements have sharp, square corners
```

### **Container**
```
container-editorial:
  - Max Width: 7xl (1280px)
  - Padding: px-6 (24px) → md: px-12 (48px)
  - Centered: mx-auto
```

### **Section Spacing**
```
editorial-section:
  - Padding: py-24 (96px) → md: py-32 (128px)
  - Usage: Major sections
```

### **Standard Spacing Scale**
```
Gap between elements: 6, 8, 12, 16, 24, 32, 48, 64, 80, 96px
Card padding: 24px (p-6)
Button padding: px-6 py-3 (default), px-4 (sm), px-8 (lg), px-10 (xl)
```

---

## 🔘 BUTTONS

### **Button Variants**
```
default:
  - Background: Primary (Navy)
  - Text: Primary Foreground (Cream)
  - Border: 3px Foreground
  - Shadow: 4px 4px 0px Foreground
  - Hover: translate(2px, 2px), shadow-none

accent:
  - Background: Accent (Coral)
  - Text: Accent Foreground (Cream)
  - Border: 3px Foreground
  - Shadow: 4px 4px 0px Foreground
  - Hover: translate(2px, 2px), shadow-none

outline:
  - Background: Background (Cream)
  - Text: Foreground (Navy)
  - Border: 3px Foreground
  - Shadow: 4px 4px 0px Foreground
  - Hover: bg-secondary, translate(2px, 2px), shadow-none

success:
  - Background: Success (Green)
  - Text: Success Foreground (Cream)
  - Border: 3px Foreground
  - Shadow: 4px 4px 0px Foreground

hero:
  - Background: Accent (Coral)
  - Text: Accent Foreground (Cream)
  - Border: 4px Foreground
  - Shadow: 6px 6px 0px Foreground
  - Size: lg (text-lg)
  - Hover: translate(3px, 3px), shadow-none

secondary:
  - Background: Secondary (Cream)
  - Text: Secondary Foreground (Navy)
  - Border: 3px Foreground
  - Shadow: 2px 2px 0px Foreground
```

### **Button Sizes**
```
sm:   h-10, px-4, text-xs
default: h-12, px-6 py-3, text-sm
lg:   h-14, px-8, text-base
xl:   h-16, px-10, text-lg
icon: h-12, w-12
```

### **Button Typography**
```
- Font: Space Grotesk, SemiBold (600)
- Text Transform: UPPERCASE
- Letter Spacing: 0.05em (wide)
- Icon Size: 16-20px
```

---

## 🎴 CARDS

### **Card Styles**
```
Standard Card:
  - Background: Background (Cream) or Secondary (Lighter Cream)
  - Border: 3px Foreground (Navy)
  - Shadow: brutal-shadow (4px 4px 0px)
  - Padding: 24px (p-6)
  - Border Radius: 0px

Colored Card:
  - Background: Primary/Success/Warning/Accent
  - Text: Matching foreground color
  - Border: 3px Foreground
  - Shadow: brutal-shadow
```

---

## 📱 RESPONSIVE BREAKPOINTS

```
Mobile:    < 768px (sm)
Tablet:    768px - 1024px (md)
Desktop:   1024px - 1280px (lg)
Large:     > 1280px (xl, 2xl)
```

---

## 🎭 UI COMPONENTS

### **Input Fields**
```
- Border: 3px Foreground
- Background: Background (Cream)
- Padding: px-3 py-2 (h-10)
- Focus: Border color changes to Accent
- Border Radius: 0px
```

### **Badges/Labels**
```
- Background: Secondary or colored variant
- Border: 3px Foreground
- Shadow: brutal-shadow-sm (2px 2px)
- Padding: px-4 py-2
- Font: label-mono (uppercase, wide tracking)
```

### **Icons**
```
- Size: 16px (small), 20px (default), 24px (large)
- Stroke Width: 2px
- Color: Inherits from parent or explicit color
```

---

## 🎬 ANIMATIONS

```
slide-up:   opacity 0→1, translateY(20px→0), 0.5s ease-out
fade-in:    opacity 0→1, 0.3s ease-out
scale-in:   opacity 0→1, scale(0.95→1), 0.3s ease-out
```

---

## 📋 KEY DESIGN PRINCIPLES

1. **No Rounded Corners**: Everything is sharp and geometric
2. **Thick Borders**: 3px minimum, always visible
3. **Hard Shadows**: No blur, offset shadows create depth
4. **High Contrast**: Bold colors, clear hierarchy
5. **Bold Typography**: Space Grotesk for display, uppercase labels
6. **Generous Spacing**: Clear breathing room between elements
7. **Interactive Feedback**: Buttons move on hover/click
8. **Consistent Shadows**: Same shadow direction everywhere
9. **Color Coding**: Success=Green, Warning=Orange, Accent=Coral
10. **Brutalist Aesthetic**: Raw, bold, unapologetic design

---

## 🎯 MOBILE-SPECIFIC CONSIDERATIONS

- Touch targets: Minimum 44x44px
- Spacing: Slightly tighter on mobile, expand on tablet+
- Typography: Scale down proportionally
- Shadows: Maintain same offset ratios
- Navigation: Bottom nav or hamburger menu
- Cards: Full-width on mobile, grid on larger screens
