---
name: Coastal Morning
colors:
  surface: '#f7f9fd'
  surface-dim: '#d8dade'
  surface-bright: '#f7f9fd'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f8'
  surface-container: '#eceef2'
  surface-container-high: '#e6e8ec'
  surface-container-highest: '#e0e2e6'
  on-surface: '#191c1f'
  on-surface-variant: '#43474f'
  inverse-surface: '#2d3134'
  inverse-on-surface: '#eff1f5'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#5e604d'
  on-secondary: '#ffffff'
  secondary-container: '#e1e1c9'
  on-secondary-container: '#636451'
  tertiary: '#3d0e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#611b00'
  on-tertiary-container: '#f47749'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#e4e4cc'
  secondary-fixed-dim: '#c8c8b0'
  on-secondary-fixed: '#1b1d0e'
  on-secondary-fixed-variant: '#474836'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#380c00'
  on-tertiary-fixed-variant: '#822800'
  background: '#f7f9fd'
  on-background: '#191c1f'
  surface-variant: '#e0e2e6'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md-mobile:
    fontFamily: Playfair Display
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Montserrat
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Montserrat
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Montserrat
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Montserrat
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-margin-mobile: 20px
  container-margin-desktop: 80px
  gutter: 16px
  section-gap-sm: 32px
  section-gap-lg: 80px
---

## Brand & Style

The design system is anchored in a **Premium Modern** aesthetic that balances high-end hospitality with coastal warmth. The target audience includes international travelers and high-value domestic tourists looking for reliability, exclusivity, and a seamless booking experience in Kenya.

The visual direction follows a **Minimalist** approach with a **Tactile** edge. By utilizing generous whitespace and large-scale photography, the UI recedes to let the properties take center stage. The emotional response should be one of "effortless luxury"—professional enough to be trusted with large transactions, yet warm enough to evoke the feeling of a seaside sunrise.

Key stylistic markers include:
- **Photography-First:** UI elements never compete with property imagery.
- **Organic Precision:** A mix of sophisticated serifs and soft, large-radius containers.
- **Airy Composition:** High margins and breathing room between functional groups to reduce cognitive load.

## Colors

The palette is inspired by the Kenyan coastline at dawn.

- **Primary (Deep Ocean Blue):** Used for core branding, primary navigation, and headers to establish authority and trust.
- **Secondary/Background (Sand):** This is the primary canvas color for sections and cards, providing a warmer, more sophisticated alternative to pure white.
- **Accent (Burnt Coral):** Reserved strictly for high-priority calls to action (CTAs), price highlights, and active notification states.
- **Neutral (Soft Grey & White):** White is used for input fields and content cards to create "lift" against the Sand background, while Soft Grey handles borders and secondary text.

**Color Application:**
- Use **Deep Ocean Blue** for text on **Sand** backgrounds for high legibility.
- Use **Burnt Coral** sparingly to maintain its impact as a conversion driver.

## Typography

The typographic scale uses a high-contrast pairing to differentiate between "Atmosphere" and "Utility."

- **Playfair Display** is used for all major headings and display titles. It conveys the "High-end Hospitality" narrative. It should be typeset with slightly tighter letter-spacing in display sizes to maintain a modern, editorial feel.
- **Montserrat** handles all functional text. Its geometric nature ensures clarity on mobile devices and provides a clean, neutral counterpoint to the ornate serif headlines.

**Usage Notes:**
- All labels and buttons use Montserrat SemiBold for immediate recognition.
- Body text should maintain a 1.5x line-height ratio to ensure maximum readability against the light Sand backgrounds.

## Layout & Spacing

This design system employs a **Fluid Grid** model with an emphasis on mobile-first constraints. 

- **Mobile (Base):** A 4-column grid with 20px outside margins. Elements are primarily stacked vertically to accommodate one-handed browsing.
- **Desktop:** A 12-column grid with a maximum content width of 1280px. 
- **Vertical Rhythm:** A base-8 spacing system (8, 16, 24, 32, 48, 64, 80) is used to maintain consistency.

**Spacing Strategy:**
- Use `section-gap-lg` between distinct content areas (e.g., Hero to Featured Listings).
- Property cards in lists should have a `gutter` of 16px on mobile to allow more content on the screen, expanding to 24px on desktop for a more luxurious feel.

## Elevation & Depth

To achieve a "Coastal" lightness, this design system avoids heavy, dark shadows. Instead, it utilizes **Tonal Layers** and **Ambient Tinted Shadows**.

- **Surface Levels:** The base background is **Sand**. Elements placed on top (like cards) should be **White**.
- **Shadow Profile:** Use extremely diffused shadows with a slight primary tint (Deep Ocean Blue at 5-8% opacity). This prevents the UI from looking "muddy" or "grey" and keeps it looking clean and premium.
- **Interaction:** Upon hover or active state, cards should slightly lift (increase shadow spread) rather than change color, maintaining the tactile physical metaphor.

## Shapes

The shape language is defined by **High-Radius Enclosures**, mimicking the soft curves of coastal landscape and architecture.

- **Standard Elements (Buttons, Inputs):** Use 0.5rem (8px) for a professional yet accessible feel.
- **Large Containers (Property Cards, Search Bars, Modals):** These utilize `rounded-xl` (24px) to create a soft, friendly framing for photography.
- **Icons:** Should follow a "Rounded" or "Outline" style with a 2px stroke weight to match the Montserrat typography.

## Components

### Buttons & CTAs
- **Primary Button:** Deep Ocean Blue background with White text. Used for "Search" or "Confirm."
- **Conversion CTA:** Burnt Coral background with White text. Reserved strictly for "Book Now" or "Reserve."
- **Ghost Button:** Deep Ocean Blue outline with 2px stroke. Used for secondary actions like "View Gallery."

### Property Cards
Large-format cards are the hero component. 
- **Top:** 16:9 aspect ratio image container with 24px top-rounded corners.
- **Bottom:** White background container with 24px bottom-rounded corners.
- **Content:** Headline in Playfair Display, Price in Montserrat Bold (accented in Burnt Coral).

### Search Bar
A floating, pill-shaped component.
- **Background:** White with a subtle 1px Soft Grey border.
- **Shadow:** Ambient soft shadow to indicate it sits above the content.
- **Input:** Montserrat Medium with clear iconographic cues for Location, Dates, and Guests.

### Sticky Booking Widget
- **Position:** Bottom-fixed on mobile, right-rail on desktop.
- **Style:** White surface with a 24px top-rounded radius. It features the total price prominently and the Burnt Coral "Reserve" button.

### Amenities Icons
- Simple, monoline icons in Deep Ocean Blue.
- Accompanied by Label-sm text for accessibility.