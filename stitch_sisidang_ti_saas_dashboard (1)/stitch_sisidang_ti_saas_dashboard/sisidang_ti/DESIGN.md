---
name: Sisidang TI
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#424751'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737783'
  outline-variant: '#c3c6d3'
  surface-tint: '#265dad'
  primary: '#003572'
  on-primary: '#ffffff'
  primary-container: '#064b9b'
  on-primary-container: '#9fbfff'
  inverse-primary: '#acc7ff'
  secondary: '#765a00'
  on-secondary: '#ffffff'
  secondary-container: '#ffce4b'
  on-secondary-container: '#735800'
  tertiary: '#2e364b'
  on-tertiary: '#ffffff'
  tertiary-container: '#454d62'
  on-tertiary-container: '#b6bed8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d7e2ff'
  primary-fixed-dim: '#acc7ff'
  on-primary-fixed: '#001a40'
  on-primary-fixed-variant: '#004591'
  secondary-fixed: '#ffdf95'
  secondary-fixed-dim: '#f0c03e'
  on-secondary-fixed: '#251a00'
  on-secondary-fixed-variant: '#594400'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  h1:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  h1-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

The design system is built for a focused academic environment, prioritizing clarity, efficiency, and authority. The brand personality is **Professional, Systematic, and Facilitative**, designed to reduce the cognitive load of students and faculty during the high-stakes thesis process.

Drawing inspiration from modern SaaS leaders like Vercel and Linear, the style utilizes **Minimalism** with a high-contrast foundation. It balances the traditional prestige of the university with a cutting-edge technical interface. The visual language relies on precision, generous whitespace, and a strict adherence to a logic-driven grid to ensure that information—such as defense schedules, document revisions, and grading—remains the primary focus.

## Colors

This design system uses a high-contrast palette to ensure accessibility and professional aesthetics.

- **Primary (Deep Blue):** Used for primary actions, navigation states, and branding. It conveys stability and institutional trust.
- **Secondary (Academic Yellow):** Used sparingly as an accent for highlights, notification badges, or "Attention Required" states.
- **Neutral (Slate & Gray):** The background is kept clean (`#F8FAFC`) to allow the primary blue to stand out. Text uses Slate shades to ensure high legibility without the harshness of pure black.
- **System Colors:** Success (Green) and Error (Red) are used for thesis status updates and form validation.

## Typography

The typography system is built on **Inter**, a typeface designed for screens and high-density data. 

- **Headlines:** Use Bold and Semi-Bold weights with slight negative letter spacing to create a modern, "compact" feel for dashboard headers.
- **Body Text:** Standardized at 16px for optimal readability of long-form abstracts and feedback notes.
- **Labels:** Small labels use uppercase with increased tracking (letter spacing) for metadata and status badges, ensuring they are distinct from body copy.

## Layout & Spacing

This design system employs an **8px linear spacing scale**. All margins, paddings, and component heights must be multiples of 8 (with 4px used for micro-adjustments).

- **Grid Model:** A 12-column fluid grid for desktop with 24px gutters. For mobile, a single-column layout with 16px side margins.
- **Layout Structure:** A fixed sidebar navigation (256px width) on desktop, transitioning to a bottom navigation bar or hidden drawer on mobile.
- **Rhythm:** Use `lg` (24px) for internal card padding and `xl` (32px) for spacing between major sections.

## Elevation & Depth

To maintain a "Linear-like" aesthetic, depth is achieved through **low-contrast outlines** and **subtle ambient shadows**.

- **Level 0 (Background):** Solid `#F8FAFC`.
- **Level 1 (Cards/Surface):** White background with a 1px border (`#E2E8F0`). No shadow or a very faint 2px blur shadow to indicate interactivity.
- **Level 2 (Modals/Popovers):** White background with a multi-layered shadow: `0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -2px rgba(0, 0, 0, 0.05)`.
- **Interactivity:** Elements like buttons should slightly "lift" on hover by increasing shadow spread or changing the border color to the Primary Blue.

## Shapes

The shape language is modern and approachable without being overly playful. 

- **Components:** Standard buttons, input fields, and small cards use `rounded-md` (0.5rem / 8px).
- **Containers:** Large dashboard widgets and main content containers use `rounded-lg` (1rem / 16px).
- **Status Pills:** Chips and status indicators use a full pill radius to differentiate them from actionable buttons.

## Components

- **Buttons:** Primary buttons use the Deep Blue background with white text. Secondary buttons use a subtle gray border with the Deep Blue text. 
- **Input Fields:** Use a 1px border (`#E2E8F0`) that transitions to Primary Blue on focus. Labels should sit clearly above the input.
- **Chips/Badges:** Use a soft background color (e.g., 10% opacity of the status color) with high-contrast text for status updates (e.g., "Pending," "Approved").
- **Lists:** Clean rows with 1px bottom dividers. Use hover states to highlight the entire row, indicating it is clickable for thesis details.
- **Cards:** Used to encapsulate thesis progress, deadlines, or advisor info. Use a simple 1px border and 24px internal padding.
- **Progress Trackers:** Vertical or horizontal steppers using the Primary Blue for completed steps and Academic Yellow for "In Progress" steps.