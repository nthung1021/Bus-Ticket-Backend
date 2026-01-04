# UI/UX Design Documentation

This document outlines the user interface and user experience design principles, design system, and key screens of the Bus Ticket Booking System frontend application.

---

## Table of Contents

1. [Design System Overview](#design-system-overview)
2. [Color Palette & Theming](#color-palette--theming)
3. [Typography](#typography)
4. [Component Library](#component-library)
5. [Layout Structure](#layout-structure)
6. [Key User Screens](#key-user-screens)
7. [Responsive Design](#responsive-design)
8. [Accessibility](#accessibility)

---

## Design System Overview

The Bus Ticket Booking System uses a modern, component-based design system built with:

- **Framework:** Next.js 16 with React 19
- **Styling:** Tailwind CSS v4 with custom design tokens
- **UI Components:** shadcn/ui (built on Radix UI primitives)
- **Icons:** Lucide React
- **Animations:** tw-animate-css for smooth transitions

### Design Principles

1. **Consistency** - Uniform design patterns across all pages
2. **Clarity** - Clear visual hierarchy and intuitive navigation
3. **Accessibility** - WCAG 2.1 compliant with keyboard navigation
4. **Responsiveness** - Mobile-first approach with adaptive layouts
5. **Performance** - Optimized components with lazy loading

---

## Color Palette & Theming

The application supports both **light** and **dark** themes with a sophisticated color system using OKLCH color space for better perceptual uniformity.

### Light Theme Colors

```css
--background: oklch(0.98 0 0) /* Near white */ --foreground: oklch(0.16 0 0)
  /* Near black */ --primary: oklch(0.55 0.25 260) /* Purple-blue */
  --secondary: oklch(0.93 0.02 260) /* Light purple */
  --accent: oklch(0.6 0.25 120) /* Green */ --destructive: oklch(0.63 0.25 30)
  /* Red-orange */ --muted: oklch(0.92 0 0) /* Light gray */
  --border: oklch(0.92 0 0) /* Transparent in light mode */;
```

### Dark Theme Colors

```css
--background: oklch(0.145 0 0) /* Dark gray */ --foreground: oklch(0.985 0 0)
  /* Near white */ --primary: oklch(0.6 0.25 260) /* Brighter purple-blue */
  --secondary: oklch(0.269 0 0) /* Dark gray */ --accent: oklch(0.6 0.25 120)
  /* Bright green */ --border: rgb(55 65 81) /* Visible borders in dark mode */;
```

### Theme Features

- **Automatic Detection:** Respects system preference
- **Manual Toggle:** Theme switcher in navigation
- **Persistent:** Saves user preference
- **Smooth Transitions:** Animated theme switching
- **Enhanced Borders:** Borders visible only in dark mode for better contrast

---

## Typography

The application uses the **Geist** font family for a modern, clean appearance.

### Font Stack

```css
--font-sans:
  'Geist', 'Geist Fallback' --font-mono: 'Geist Mono', 'Geist Mono Fallback';
```

### Typography Scale

- **Headings:** Clear hierarchy with h1, h2, h3 styles
- **Body Text:** Optimized for readability
- **Captions:** Smaller text for secondary information
- **Monospace:** For codes and technical data

---

## Component Library

The UI is built using reusable components from shadcn/ui, customized to match the design system.

### Core Components

**Form Elements:**

- `Button` - Primary, secondary, destructive, outline variants
- `Input` - Text inputs with validation states
- `Select` - Dropdown selections
- `Checkbox` - Boolean selections
- `Radio Group` - Single choice selections
- `Textarea` - Multi-line text input
- `Switch` - Toggle switches

**Feedback Components:**

- `Alert` - Informational messages
- `Toast` - Temporary notifications
- `Dialog` - Modal dialogs
- `Skeleton` - Loading placeholders
- `Progress` - Progress indicators

**Data Display:**

- `Card` - Content containers
- `Table` - Tabular data
- `Badge` - Status indicators
- `Avatar` - User profile images
- `Tabs` - Content organization

**Navigation:**

- `Dropdown Menu` - Context menus
- `Pagination` - Page navigation
- `Breadcrumbs` - Navigation trail

**Custom Components:**

- `Calendar` - Date picker
- `Time Picker` - Time selection
- `Rating Stars` - Star ratings
- `Notification Bell` - Notification indicator

---

## Layout Structure

### Navigation Bar (Navbar)

**Location:** Top of every page

**Components:**

- Logo/Brand (left)
- Main navigation links (center)
- User menu / Login button (right)
- Theme toggle
- Notification bell (authenticated users)

**Features:**

- Sticky positioning
- Responsive collapse on mobile
- Dropdown menus for user actions
- Search bar integration (on some pages)

### Footer

**Location:** Bottom of every page

**Sections:**

- Company information
- Quick links
- Contact details
- Social media links
- Copyright notice

**Features:**

- Multi-column layout on desktop
- Stacked layout on mobile
- Consistent branding

### Sidebar (Dashboard Pages)

**Location:** Left side on user/admin pages

**Features:**

- Navigation menu
- Active page highlighting
- Collapsible on mobile
- User profile section
- Logout button

---

## Key User Screens

### 1. Homepage (`/`)

**Purpose:** Landing page with trip search functionality

**Key Components:**

1. **Hero Section**
   - Large search form
   - Origin and destination inputs with autocomplete
   - Date picker
   - Search button
   - Background image/gradient

2. **Search Form**
   - **From City Input:** Autocomplete with Vietnamese diacritic-insensitive search
   - **To City Input:** Similar autocomplete functionality
   - **Date Picker:** Calendar widget with minimum date validation
   - **Swap Button:** Quickly swap origin and destination
   - **Search Button:** Prominent call-to-action

3. **Popular Routes Section**
   - Grid of popular route cards
   - Each card shows:
     - Origin → Destination
     - Starting price
     - Trip count
     - Route image
   - Click to search trips on that route

4. **Features Section**
   - Highlights of the service
   - Icons with descriptions
   - Benefits of using the platform

**User Flow:**

1. User enters origin city (autocomplete suggestions appear)
2. User enters destination city
3. User selects travel date
4. User clicks "Search Trips"
5. Redirects to search results page

---

### 2. Login Page (`/login`)

**Purpose:** User authentication

**Layout:**

- Centered card on background
- Maximum width: 400px
- Vertical spacing between elements

**Components:**

1. **Header**
   - "Sign in to your account" title
   - Link to registration page

2. **Error Display**
   - Red alert box for login errors
   - Icon + error message
   - Dismissible

3. **Login Form**
   - **Email Input:** Email validation
   - **Password Input:** Minimum 6 characters
   - **Remember Me Checkbox:** Optional
   - **Forgot Password Link:** Right-aligned
   - **Login Button:** Full-width, primary color
   - Loading spinner during submission

4. **Social Login Options**
   - Google Sign-In button
   - Facebook Sign-In button
   - Phone Sign-In button
   - Each with brand colors and icons

5. **Footer Link**
   - "Create a new account" link

**User Flow:**

1. User enters email and password
2. User clicks "Login"
3. System validates credentials
4. On success: Redirect to homepage or previous page
5. On error: Display error message

---

### 3. Registration Page (`/signup`)

**Purpose:** New user account creation

**Similar Layout to Login Page**

**Components:**

1. **Registration Form**
   - Full Name input
   - Email input with validation
   - Phone number input
   - Password input with strength indicator
   - Confirm Password input
   - Terms & Conditions checkbox
   - Register button

2. **Social Registration**
   - Same social login options as login page

3. **Footer Link**
   - "Already have an account? Sign in"

**User Flow:**

1. User fills in registration details
2. User agrees to terms
3. User clicks "Register"
4. System sends verification email
5. Redirect to email verification page

---

### 4. Search Results Page (`/search`)

**Purpose:** Display available trips based on search criteria

**Layout:**

- Two-column layout (desktop)
- Filters sidebar (left, 25% width)
- Results list (right, 75% width)
- Single column on mobile (filters collapsible)

**Components:**

1. **Search Summary Bar**
   - Origin → Destination
   - Selected date
   - Number of results
   - Edit search button

2. **Filters Sidebar**
   - **Price Range Slider:** Min/max price selection
   - **Departure Time:** Morning, Afternoon, Evening, Night
   - **Bus Type:** Checkboxes for bus types
   - **Amenities:** WiFi, AC, TV, etc.
   - **Operator:** Filter by bus company
   - **Clear Filters Button**

3. **Sort Options**
   - Dropdown menu:
     - Price: Low to High
     - Price: High to Low
     - Departure: Earliest First
     - Departure: Latest First
     - Highest Rated

4. **Trip Cards** (for each result)
   - **Left Section:**
     - Bus operator logo
     - Bus type badge
   - **Middle Section:**
     - Departure time → Arrival time
     - Origin → Destination
     - Duration
     - Distance
   - **Right Section:**
     - Price (prominent)
     - Available seats
     - "View Details" button
   - **Bottom Section:**
     - Amenities icons
     - Rating stars

5. **Pagination**
   - Page numbers
   - Previous/Next buttons
   - Results per page

**User Flow:**

1. User views search results
2. User applies filters to narrow results
3. User sorts results by preference
4. User clicks "View Details" on a trip
5. Redirects to trip details page

---

### 5. Trip Details Page (`/trips/[id]`)

**Purpose:** Detailed information about a specific trip with seat selection

**Layout:**

- Full-width header
- Two-column layout (desktop)
- Left: Trip info and seat map (70%)
- Right: Booking summary (30%)

**Components:**

1. **Trip Header**
   - Origin → Destination
   - Departure date and time
   - Breadcrumb navigation
   - Back button

2. **Trip Information Card**
   - **Route Details:**
     - Departure location and time
     - Arrival location and time
     - Duration
     - Distance
   - **Bus Information:**
     - Bus model
     - Bus type
     - Operator name
     - Amenities list with icons
   - **Pricing:**
     - Base price
     - Seat type pricing

3. **Pickup & Dropoff Selection**
   - **Pickup Point Dropdown:** List of route points
   - **Dropoff Point Dropdown:** List of route points
   - Validation: Cannot be the same
   - Shows selected points on map (if available)

4. **Seat Selection Map**
   - **Visual Seat Layout:**
     - Interactive seat grid
     - Color-coded seats:
       - Green: Available
       - Yellow: Selected
       - Gray: Booked
       - Blue: VIP/Business
   - **Seat Legend:**
     - Color meanings
     - Seat type indicators
   - **Selection Info:**
     - Selected seat codes
     - Seat type and price per seat
   - **Real-time Updates:**
     - WebSocket connection
     - Instant seat status changes
     - Seat locking mechanism

5. **Booking Summary Sidebar** (Sticky)
   - Selected seats list
   - Seat prices breakdown
   - Total price (prominent)
   - "Book Now" button (disabled if no seats selected)
   - Booking policies

6. **Reviews Section**
   - **Review Stats:**
     - Average rating
     - Total reviews
     - Rating distribution chart
   - **Review List:**
     - User avatar
     - Username
     - Rating stars
     - Review text
     - Review date
     - Helpful votes
   - **Write Review Button** (for authenticated users who completed trip)

7. **Related Trips**
   - Horizontal scroll of similar trips
   - Same route or operator

**User Flow:**

1. User views trip details
2. User selects pickup and dropoff points
3. User clicks on seats to select
4. Selected seats highlight and update summary
5. User reviews total price
6. User clicks "Book Now"
7. Redirects to passenger information page

---

### 6. Passenger Information Page (`/passenger-info`)

**Purpose:** Collect passenger details for booking

**Layout:**

- Full-width form
- Progress indicator at top
- Two-column layout (desktop)
- Left: Passenger forms (70%)
- Right: Booking summary (30%)

**Components:**

1. **Progress Indicator**
   - Step 1: Select Seats (completed)
   - Step 2: Passenger Info (current)
   - Step 3: Payment (upcoming)

2. **Trip Summary Card**
   - Trip details
   - Selected seats mini-map
   - Pickup and dropoff points
   - Date and time

3. **Passenger Forms** (one per seat)
   - **Form Header:**
     - "Passenger 1 - Seat A1"
     - Seat type badge
   - **Form Fields:**
     - Full Name (required)
     - Phone Number (required for first passenger)
     - Email (required for first passenger)
     - Document ID (optional)
   - **Validation:**
     - Real-time validation
     - Error messages below fields
     - Required field indicators

4. **Contact Information**
   - Auto-filled from first passenger
   - Editable
   - Used for booking confirmation

5. **Booking Summary Sidebar** (Sticky)
   - **Price Breakdown:**
     - Seats subtotal
     - Service fee
     - Processing fee
     - Total amount (prominent)
   - **Selected Seats:**
     - List with seat codes and prices
   - **Booking Policies:**
     - Cancellation policy
     - Refund policy
   - **Action Buttons:**
     - "Back to Seat Selection"
     - "Continue to Payment" (primary)

6. **Countdown Timer**
   - 15-minute reservation timer
   - Warning when < 5 minutes
   - Auto-redirect on expiration

**User Flow:**

1. User sees pre-filled trip and seat information
2. User fills in passenger details for each seat
3. Form validates in real-time
4. User reviews booking summary
5. User clicks "Continue to Payment"
6. System creates pending booking
7. Redirects to payment page

---

### 7. Payment Success Page (`/payment/success`)

**Purpose:** Confirm successful payment and display booking details

**Layout:**

- Centered content
- Maximum width: 800px
- Vertical flow

**Components:**

1. **Success Header**
   - Large checkmark icon (green)
   - "Payment Successful!" message
   - Booking reference number (prominent)

2. **Booking Confirmation Card**
   - **Trip Information:**
     - Route (Origin → Destination)
     - Date and time
     - Bus operator
     - Bus type
   - **Passenger Details:**
     - List of all passengers
     - Seat assignments
     - Document IDs
   - **Booking Details:**
     - Booking reference
     - Booking date
     - Status badge
     - QR code for verification

3. **Payment Information**
   - Payment method
   - Transaction ID
   - Amount paid
   - Payment date

4. **Action Buttons**
   - **Download E-Ticket** (primary button)
     - Downloads PDF ticket
     - Loading state during download
   - **Email E-Ticket**
     - Sends ticket to email
     - Success toast on send
   - **View My Bookings**
     - Links to bookings page
   - **Back to Home**
     - Returns to homepage

5. **Next Steps Information**
   - Instructions for trip day
   - Arrival time recommendations
   - Contact information

6. **Confirmation Email Notice**
   - "A confirmation email has been sent to..."
   - Email address display

**User Flow:**

1. User redirected after successful payment
2. System fetches booking details
3. User sees confirmation
4. User downloads or emails ticket
5. User can view booking or return home

---

### 8. User Profile Page (`/user/profile`)

**Purpose:** View and edit user account information

**Layout:**

- Dashboard layout with sidebar
- Sidebar: Navigation menu (left)
- Main content: Profile form (right)

**Components:**

1. **User Sidebar** (Desktop)
   - User avatar and name
   - Navigation menu:
     - Overview
     - My Bookings
     - Payment
     - Profile (active)
     - Notifications
     - Help & Support
   - Logout button

2. **Mobile Navigation**
   - Dropdown menu with same items
   - Hamburger icon trigger

3. **Profile Header**
   - Page title: "My Profile"
   - Last updated timestamp

4. **Avatar Section**
   - Current profile picture
   - Upload button
   - File size limit notice (5MB)
   - Accepted formats: PNG, JPEG, JPG
   - Circular avatar preview

5. **Personal Information Form**
   - **Read-Only Fields:**
     - Email (verified badge)
     - Account creation date
     - User ID
   - **Editable Fields:**
     - Full Name
     - Phone Number
     - Date of Birth (date picker)
     - Gender (select dropdown)
   - **Save Changes Button**
   - **Cancel Button**

6. **Account Settings**
   - **Change Password Section:**
     - Current password input
     - New password input
     - Confirm new password input
     - Password strength indicator
     - "Update Password" button
   - **Email Preferences:**
     - Booking confirmations
     - Promotional emails
     - Trip reminders
     - Toggle switches

7. **Account Statistics**
   - Total bookings
   - Total spent
   - Member since
   - Loyalty points (if applicable)

**User Flow:**

1. User navigates to profile page
2. User views current information
3. User edits desired fields
4. User uploads new avatar (optional)
5. User clicks "Save Changes"
6. System validates and updates
7. Success message displayed

---

### 9. User Bookings Page (`/user/bookings`)

**Purpose:** View all user bookings with filtering options

**Layout:**

- Dashboard layout with sidebar
- Main content: Bookings list with filters

**Components:**

1. **Page Header**
   - Title: "My Bookings"
   - Total bookings count

2. **Filter Bar**
   - **Status Filter Tabs:**
     - All
     - Upcoming
     - Completed
     - Cancelled
     - Pending Payment
   - **Date Range Picker:**
     - From date
     - To date
   - **Search Box:**
     - Search by booking reference
     - Search by route

3. **Booking Cards** (for each booking)
   - **Header:**
     - Booking reference
     - Status badge (color-coded)
     - Booking date
   - **Trip Information:**
     - Route (Origin → Destination)
     - Departure date and time
     - Bus operator logo
   - **Passenger Count:**
     - Number of passengers
     - Seat codes
   - **Price:**
     - Total amount
     - Payment status
   - **Actions:**
     - "View Details" button
     - "Download Ticket" button (if confirmed)
     - "Cancel Booking" button (if allowed)
     - "Modify Booking" button (if allowed)
   - **Countdown Timer** (for pending bookings)

4. **Empty State**
   - Illustration
   - "No bookings found" message
   - "Search Trips" button

5. **Pagination**
   - Page numbers
   - Results per page selector

**User Flow:**

1. User views all bookings
2. User filters by status or date
3. User searches for specific booking
4. User clicks on booking to view details
5. User performs actions (download, cancel, modify)

---

### 10. Routes Page (`/routes`)

**Purpose:** Browse available bus routes

**Layout:**

- Grid layout of route cards
- Search and filter options

**Components:**

1. **Search Bar**
   - Search by origin or destination
   - Autocomplete suggestions

2. **Filter Options**
   - Popular routes
   - By region
   - By operator

3. **Route Cards**
   - Origin → Destination
   - Distance
   - Duration
   - Starting price
   - Available trips count
   - Route image
   - "View Trips" button

**User Flow:**

1. User browses routes
2. User searches or filters
3. User clicks "View Trips"
4. Redirects to search results for that route

---

## Responsive Design

### Breakpoints

```css
sm: 640px   /* Small devices (phones) */
md: 768px   /* Medium devices (tablets) */
lg: 1024px  /* Large devices (laptops) */
xl: 1280px  /* Extra large devices (desktops) */
2xl: 1536px /* 2X large devices (large desktops) */
```

### Mobile Adaptations

**Navigation:**

- Hamburger menu on mobile
- Full navigation on desktop
- Sticky header

**Forms:**

- Single column on mobile
- Multi-column on desktop
- Touch-friendly input sizes (min 44px)

**Cards:**

- Stack vertically on mobile
- Grid layout on desktop
- Responsive images

**Tables:**

- Horizontal scroll on mobile
- Full table on desktop
- Card view alternative for mobile

**Modals:**

- Full-screen on mobile
- Centered dialog on desktop

---

## Accessibility

### WCAG 2.1 Compliance

**Keyboard Navigation:**

- All interactive elements accessible via keyboard
- Visible focus indicators
- Logical tab order
- Skip to main content link

**Screen Reader Support:**

- Semantic HTML elements
- ARIA labels and roles
- Alt text for images
- Form labels properly associated

**Color Contrast:**

- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Color not sole indicator of information

**Forms:**

- Clear labels
- Error messages
- Required field indicators
- Validation feedback

**Interactive Elements:**

- Minimum touch target size: 44x44px
- Hover and focus states
- Loading states
- Disabled states clearly indicated

---

## Design Tokens

### Spacing Scale

```css
0.5: 0.125rem  /* 2px */
1:   0.25rem   /* 4px */
2:   0.5rem    /* 8px */
3:   0.75rem   /* 12px */
4:   1rem      /* 16px */
6:   1.5rem    /* 24px */
8:   2rem      /* 32px */
12:  3rem      /* 48px */
16:  4rem      /* 64px */
```

### Border Radius

```css
--radius-sm: calc(var(--radius) - 4px) /* 6px */
  --radius-md: calc(var(--radius) - 2px) /* 8px */ --radius-lg: var(--radius)
  /* 10px */ --radius-xl: calc(var(--radius) + 4px) /* 14px */;
```

### Shadows

```css
/* Light mode - minimal shadows */
sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
md: 0 4px 6px -1px rgb(0 0 0 / 0.1)
lg: 0 10px 15px -3px rgb(0 0 0 / 0.1)

/* Dark mode - enhanced shadows */
sm: 0 1px 3px 0 rgb(0 0 0 / 0.3)
md: 0 4px 6px -1px rgb(0 0 0 / 0.4)
lg: 0 10px 15px -3px rgb(0 0 0 / 0.4)
```

---

## Animation & Transitions

### Transition Durations

```css
fast: 150ms
normal: 300ms
slow: 500ms
```

### Common Animations

- **Fade In/Out:** Opacity transitions
- **Slide In/Out:** Transform transitions
- **Scale:** Hover effects on cards
- **Spin:** Loading spinners
- **Pulse:** Attention indicators

### Animation Library

Using `tw-animate-css` for pre-built animations:

- fadeIn, fadeOut
- slideInUp, slideInDown
- zoomIn, zoomOut
- bounce, shake
- And more...

---

## Best Practices

### Component Development

1. **Reusability:** Create generic, reusable components
2. **Props Validation:** Use TypeScript for type safety
3. **Composition:** Compose complex UIs from simple components
4. **Separation of Concerns:** Separate logic from presentation

### Performance

1. **Code Splitting:** Lazy load components
2. **Image Optimization:** Use Next.js Image component
3. **Memoization:** Use React.memo for expensive components
4. **Virtual Scrolling:** For long lists

### User Experience

1. **Loading States:** Show skeletons or spinners
2. **Error States:** Clear error messages with recovery options
3. **Empty States:** Helpful messages with call-to-action
4. **Success Feedback:** Toast notifications or success messages
5. **Progressive Disclosure:** Show information gradually
6. **Confirmation Dialogs:** For destructive actions

---

## Future Enhancements

1. **Dark Mode Improvements:** More granular theme customization
2. **Animation Library:** Custom animation system
3. **Micro-interactions:** Enhanced feedback for user actions
4. **Skeleton Screens:** Better loading experiences
5. **Accessibility Audit:** Regular WCAG compliance testing
6. **Performance Monitoring:** Track and optimize Core Web Vitals

---

**Last Updated:** January 3, 2026  
**Version:** 0.3.0  
**Document Type:** UI/UX Design Documentation
