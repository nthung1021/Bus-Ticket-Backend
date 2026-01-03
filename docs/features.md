# Bus Ticket Booking System - Features Documentation

This document provides a comprehensive overview of all features available in the Bus Ticket Booking System, including both backend API endpoints and frontend user interfaces.

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [User Management](#2-user-management)
3. [Trip Search & Booking](#3-trip-search--booking)
4. [Booking Management](#4-booking-management)
5. [Payment Processing](#5-payment-processing)
6. [Admin Dashboard](#6-admin-dashboard)
7. [Route & Bus Management](#7-route--bus-management)
8. [Reviews & Feedback](#8-reviews--feedback)
9. [Real-time Features](#9-real-time-features)
10. [AI-Powered Features](#10-ai-powered-features)
11. [Notifications](#11-notifications)
12. [Additional Features](#12-additional-features)

---

## 1. Authentication & Authorization

### 1.1 User Registration

**What it is:** Allows new users to create an account in the system.

**How to use:**

- **Frontend:** Navigate to `/signup` page
- **Backend API:** `POST /auth/register`

**Features:**

- Email-based registration
- Password strength validation
- Email verification code sent automatically
- Duplicate email prevention

**Request Example:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "phoneNumber": "+84123456789"
}
```

### 1.2 Email Verification

**What it is:** Verifies user email address using a 6-digit code.

**How to use:**

- **Frontend:** Navigate to `/verify-email` page after registration
- **Backend API:** `POST /auth/verify-email`

**Features:**

- 6-digit verification code
- Code expiration (15 minutes)
- Resend verification option
- Automatic account activation

### 1.3 Login

**What it is:** Authenticates users and provides access to the system.

**How to use:**

- **Frontend:** Navigate to `/login` page
- **Backend API:** `POST /auth/login`

**Features:**

- Email and password authentication
- JWT token-based authentication
- HTTP-only cookies for security
- Refresh token mechanism
- Remember me functionality

**Authentication Methods:**

1. **Email/Password Login**
2. **Google OAuth** - Sign in with Google account
3. **Phone Number Login** - Alternative login method

### 1.4 Password Reset

**What it is:** Allows users to reset forgotten passwords.

**How to use:**

- **Frontend:** Navigate to `/forgot-password` page
- **Backend API:**
  - `POST /auth/forgot-password` - Request reset
  - `POST /auth/verify-reset-token` - Verify token
  - `POST /auth/reset-password` - Set new password

**Features:**

- Email-based password reset
- Secure token generation
- Token expiration (1 hour)
- Password strength validation

### 1.5 Session Management

**What it is:** Manages user sessions and token refresh.

**How to use:**

- **Backend API:** `POST /auth/refresh-token`

**Features:**

- Automatic token refresh
- Session persistence
- Secure logout
- Multi-device support

### 1.6 Role-Based Access Control (RBAC)

**What it is:** Controls access to features based on user roles.

**Roles:**

- **USER** - Regular customers
- **ADMIN** - System administrators
- **OPERATOR** - Bus company operators

**Protected Routes:**

- Admin-only endpoints require ADMIN role
- User-specific endpoints require authentication
- Public endpoints accessible to all

---

## 2. User Management

### 2.1 User Profile

**What it is:** View and manage user account information.

**How to use:**

- **Frontend:** Navigate to `/user/profile` page
- **Backend API:**
  - `GET /users/profile` - View profile
  - `PUT /users/profile` - Update profile

**Features:**

- View personal information
- Update name, phone number
- View account statistics
- View booking history

### 2.2 Avatar Upload

**What it is:** Upload and update user profile picture.

**How to use:**

- **Frontend:** Profile page avatar section
- **Backend API:** `POST /users/avatar`

**Features:**

- Image upload (PNG, JPEG, JPG)
- Maximum file size: 5MB
- Cloudinary integration
- Automatic image optimization

### 2.3 Change Password

**What it is:** Change account password while logged in.

**How to use:**

- **Frontend:** Profile settings page
- **Backend API:** `POST /users/change-password`

**Features:**

- Current password verification
- New password validation
- Prevents reusing current password
- Blocks password change for OAuth users

### 2.4 User Bookings

**What it is:** View all bookings made by the user.

**How to use:**

- **Frontend:** Navigate to `/user/bookings` or `/my-bookings`
- **Backend API:** `GET /users/me/bookings`

**Features:**

- Filter by booking status
- View booking details
- Download e-tickets
- Cancel bookings
- Modify bookings

---

## 3. Trip Search & Booking

### 3.1 Trip Search

**What it is:** Search for available bus trips based on criteria.

**How to use:**

- **Frontend:** Homepage or `/search` page
- **Backend API:** `GET /trips/search`

**Features:**

- Search by origin and destination
- Filter by date
- Filter by departure time
- Filter by price range
- Filter by bus amenities
- Sort by price, duration, departure time
- Pagination support

**Search Parameters:**

```json
{
  "origin": "Ho Chi Minh City",
  "destination": "Da Lat",
  "date": "2026-01-15",
  "minPrice": 100000,
  "maxPrice": 500000,
  "sortBy": "price",
  "sortOrder": "asc"
}
```

### 3.2 Trip Details

**What it is:** View detailed information about a specific trip.

**How to use:**

- **Frontend:** Navigate to `/trips/[id]` page
- **Backend API:** `GET /trips/:tripId`

**Features:**

- Route information
- Bus details and amenities
- Available seats visualization
- Pricing information
- Operator details
- Departure and arrival times
- Estimated duration

### 3.3 Seat Selection

**What it is:** Interactive seat selection for booking.

**How to use:**

- **Frontend:** Trip details page, seat map component
- **Backend API:** `GET /seat-status/trip/:tripId`

**Features:**

- Visual seat map
- Real-time seat availability
- Seat status indicators (Available, Selected, Booked)
- Multiple seat selection
- Seat pricing information
- WebSocket real-time updates

### 3.4 Create Booking

**What it is:** Create a new bus ticket booking.

**How to use:**

- **Frontend:** Navigate to `/passenger-info` after seat selection
- **Backend API:** `POST /booking`

**Features:**

- Guest booking (no account required)
- Authenticated user booking
- Multiple passenger support
- Passenger detail collection
- Automatic seat reservation
- Booking expiration timer (15 minutes)
- Email confirmation

**Booking Process:**

1. Select trip and seats
2. Enter passenger details
3. Review booking summary
4. Proceed to payment
5. Receive confirmation

---

## 4. Booking Management

### 4.1 View Booking Details

**What it is:** View complete information about a booking.

**How to use:**

- **Frontend:** Navigate to `/bookings/[id]` page
- **Backend API:**
  - `GET /booking/:id` - Authenticated users
  - `GET /booking/guest` - Guest bookings (requires email + booking reference)

**Features:**

- Booking reference number
- Trip details
- Passenger information
- Seat assignments
- Payment status
- Booking status
- QR code for verification
- Remaining time before expiration

### 4.2 Modify Booking

**What it is:** Make changes to an existing booking.

**How to use:**

- **Frontend:** Booking details page
- **Backend API:**
  - `GET /booking/:id/check-modification-permissions` - Check if modification allowed
  - `PUT /booking/:id/modify` - Execute modification

**Modification Types:**

#### 4.2.1 Change Seats

**What it is:** Change seat assignments for passengers.

**How to use:**

- **Backend API:** `PUT /booking/:id/change-seats`

**Features:**

- Select new seats from available options
- Automatic price adjustment
- Refund for cheaper seats
- Additional payment for expensive seats
- Modification history tracking

#### 4.2.2 Modify Passenger Details

**What it is:** Update passenger information.

**How to use:**

- **Backend API:** `PUT /booking/:id/modify-passenger-details`

**Features:**

- Update passenger names
- Update document IDs
- Validation of changes
- Modification history

**Restrictions:**

- Cannot modify after trip departure
- Cannot modify cancelled bookings
- Limited time window for modifications

### 4.3 Cancel Booking

**What it is:** Cancel an existing booking and receive refund.

**How to use:**

- **Frontend:** Booking details page, cancel button
- **Backend API:**
  - `DELETE /booking/:id/cancel` - User cancellation
  - `DELETE /booking/:id` - Admin cancellation

**Features:**

- Automatic refund processing
- Seat release
- Cancellation confirmation email
- Cancellation reason tracking
- Refund policy enforcement

**Refund Policy:**

- More than 24 hours before departure: 90% refund
- 12-24 hours before: 50% refund
- Less than 12 hours: No refund

### 4.4 Booking Expiration

**What it is:** Automatic cancellation of unpaid bookings.

**How to use:**

- Automatic process (no user action required)
- **Backend API:** `POST /booking/cleanup-expired` - Manual trigger

**Features:**

- 15-minute payment window
- Automatic seat release
- Email notification
- Scheduled cleanup job
- Real-time countdown timer

### 4.5 Download E-Ticket

**What it is:** Download booking confirmation as PDF.

**How to use:**

- **Frontend:** Booking details page, download button
- **Backend API:** `GET /booking/:bookingId/download-eticket`

**Features:**

- PDF generation
- QR code inclusion
- Trip and passenger details
- Booking reference
- Terms and conditions

### 4.6 Email E-Ticket

**What it is:** Send e-ticket to email address.

**How to use:**

- **Frontend:** Booking details page
- **Backend API:** `POST /booking/:bookingId/send-eticket`

**Features:**

- Email delivery
- PDF attachment
- Custom email template
- Resend capability

---

## 5. Payment Processing

### 5.1 Payment Gateway Integration

**What it is:** Process payments through PayOS gateway.

**How to use:**

- **Frontend:** Navigate to `/payment` page after booking
- **Backend API:**
  - `POST /payos/create-payment-link` - Create payment
  - `POST /payos/webhook` - Payment webhook

**Features:**

- Secure payment processing
- Multiple payment methods
- QR code payment
- Payment status tracking
- Automatic booking confirmation

**Payment Methods:**

- Bank transfer
- QR code payment
- Credit/Debit cards
- E-wallets

### 5.2 Payment Confirmation

**What it is:** Confirm successful payment and activate booking.

**How to use:**

- **Frontend:** Redirect to `/payment/success` after payment
- **Backend API:** `POST /booking/:id/confirm-payment`

**Features:**

- Payment verification
- Booking status update
- E-ticket generation
- Confirmation email
- Receipt generation

### 5.3 Payment Cancellation

**What it is:** Handle cancelled or failed payments.

**How to use:**

- **Frontend:** Redirect to `/payment/cancel` or `/payment/failure`
- **Backend API:** Automatic webhook handling

**Features:**

- Booking status update
- Seat release
- Retry payment option
- Failure notification

### 5.4 Refund Processing

**What it is:** Process refunds for cancelled bookings.

**How to use:**

- **Backend API:** `POST /payos/refund`

**Features:**

- Automatic refund calculation
- Refund to original payment method
- Refund confirmation
- Refund tracking

---

## 6. Admin Dashboard

### 6.1 Dashboard Overview

**What it is:** Comprehensive admin dashboard with analytics.

**How to use:**

- **Frontend:** Navigate to `/admin` page (admin only)
- **Backend API:** `GET /admin/stats`

**Features:**

- Total bookings count
- Revenue statistics
- User statistics
- Booking trends
- Real-time metrics

### 6.2 User Management (Admin)

**What it is:** Manage all system users.

**How to use:**

- **Frontend:** Navigate to `/admin/users`
- **Backend API:**
  - `GET /admin/users` - List all users
  - `PATCH /admin/users/:userId/role` - Change user role
  - `POST /admin/account` - Create new account

**Features:**

- View all users
- Change user roles
- Create admin accounts
- User activity tracking
- Ban/unban users

### 6.3 Booking Management (Admin)

**What it is:** View and manage all bookings.

**How to use:**

- **Frontend:** Navigate to `/admin/bookings`
- **Backend API:**
  - `GET /admin/bookings` - List all bookings
  - `GET /admin/bookings/:bookingId` - View booking details
  - `PATCH /admin/bookings/:bookingId/status` - Update status
  - `POST /admin/bookings/:bookingId/refund` - Process refund

**Features:**

- View all bookings
- Filter by status, date range
- Update booking status
- Process refunds
- Cancel bookings
- Export booking data

### 6.4 Analytics & Reports

**What it is:** Detailed analytics and business intelligence.

**How to use:**

- **Frontend:** Admin dashboard analytics section
- **Backend API:** Multiple analytics endpoints

**Analytics Available:**

#### 6.4.1 Booking Analytics

- `GET /admin/analytics/bookings/summary` - Overall summary
- `GET /admin/analytics/bookings/trends` - Booking trends over time
- `GET /admin/analytics/metrics/total-bookings` - Total count
- `GET /admin/analytics/metrics/booking-growth` - Growth rate

#### 6.4.2 Route Analytics

- `GET /admin/analytics/bookings/routes` - Route performance
- `GET /admin/analytics/metrics/popular-routes` - Most popular routes
- `GET /admin/analytics/metrics/seat-occupancy` - Occupancy rates

#### 6.4.3 Conversion Analytics

- `GET /admin/analytics/conversion` - Conversion funnel
- `GET /admin/analytics/metrics/conversion-detailed` - Detailed conversion

#### 6.4.4 Payment Analytics

- `GET /admin/analytics/metrics/payment-methods` - Payment method distribution

**Features:**

- Date range filtering
- Visual charts and graphs
- Export capabilities
- Real-time updates

### 6.5 Trip Management (Admin)

**What it is:** Create and manage bus trips.

**How to use:**

- **Frontend:** Navigate to `/admin/trips`
- **Backend API:**
  - `POST /trips` - Create trip
  - `GET /trips` - List trips
  - `PUT /trips/:id` - Update trip
  - `DELETE /trips/:id` - Delete trip
  - `POST /trips/refund-and-delete/:id` - Delete with refunds

**Features:**

- Create new trips
- Assign buses to routes
- Set pricing
- Schedule management
- Delete trips with automatic refunds

### 6.6 Bus Management (Admin)

**What it is:** Manage bus fleet.

**How to use:**

- **Frontend:** Navigate to `/admin/buses`
- **Backend API:**
  - `POST /bus` - Add bus
  - `GET /bus` - List buses
  - `PUT /bus/:id` - Update bus
  - `DELETE /bus/:id` - Remove bus

**Features:**

- Add new buses
- Update bus information
- Set seat layouts
- Manage amenities
- Track bus availability

### 6.7 Route Management (Admin)

**What it is:** Manage bus routes.

**How to use:**

- **Frontend:** Navigate to `/admin/routes`
- **Backend API:**
  - `POST /route` - Create route
  - `GET /route` - List routes
  - `PUT /route/:id` - Update route
  - `DELETE /route/:id` - Delete route

**Features:**

- Create new routes
- Define route points
- Set distances and durations
- Manage route status

### 6.8 Operator Management (Admin)

**What it is:** Manage bus operators/companies.

**How to use:**

- **Frontend:** Navigate to `/admin/operators`
- **Backend API:**
  - `POST /operator` - Create operator
  - `GET /operator` - List operators
  - `PUT /operator/:id` - Update operator
  - `PATCH /operator/:id/approve` - Approve operator
  - `PATCH /operator/:id/suspend` - Suspend operator

**Features:**

- Add new operators
- Approve/reject operators
- Suspend operators
- Update operator information

### 6.9 FAQ Management (Admin)

**What it is:** Manage frequently asked questions.

**How to use:**

- **Frontend:** Navigate to `/admin/faqs`
- **Backend API:**
  - `POST /faq` - Create FAQ
  - `GET /faq` - List FAQs
  - `PUT /faq/:id` - Update FAQ
  - `DELETE /faq/:id` - Delete FAQ

**Features:**

- Create FAQs
- Categorize questions
- Update answers
- Reorder FAQs

---

## 7. Route & Bus Management

### 7.1 View Routes

**What it is:** Browse available bus routes.

**How to use:**

- **Frontend:** Navigate to `/routes` page
- **Backend API:** `GET /route`

**Features:**

- List all routes
- Route details (origin, destination, distance)
- Route points/stops
- Estimated duration
- Available trips on route

### 7.2 Route Points

**What it is:** Intermediate stops along a route.

**How to use:**

- **Backend API:**
  - `GET /route-point` - List all route points
  - `GET /route-point/route/:routeId` - Points for specific route

**Features:**

- View all stops
- Stop sequence
- Stop coordinates
- Stop facilities

### 7.3 Bus Information

**What it is:** View bus details and amenities.

**How to use:**

- **Backend API:** `GET /bus/:id`

**Features:**

- Bus model and type
- Seat capacity
- Amenities (WiFi, AC, TV, etc.)
- Operator information
- Bus photos

### 7.4 Seat Layouts

**What it is:** Visual representation of bus seating.

**How to use:**

- **Backend API:**
  - `GET /seat-layout` - List layouts
  - `GET /seat-layout/:id` - Specific layout
  - `POST /seat-layout/from-template` - Create from template

**Features:**

- Predefined layouts (40-seater, 45-seater, etc.)
- Custom layouts
- Seat numbering
- Seat types (Standard, VIP, Sleeper)

---

## 8. Reviews & Feedback

### 8.1 Submit Review

**What it is:** Rate and review completed trips.

**How to use:**

- **Frontend:** After trip completion
- **Backend API:** `POST /reviews`

**Features:**

- Star rating (1-5)
- Written review
- Review categories
- Photo upload
- Anonymous option

**Review Criteria:**

- Overall experience
- Bus condition
- Driver behavior
- Punctuality
- Value for money

### 8.2 View Reviews

**What it is:** Browse reviews for trips and operators.

**How to use:**

- **Backend API:**
  - `GET /reviews/trip/:tripId` - Trip reviews
  - `GET /reviews/operator/:operatorId` - Operator reviews

**Features:**

- Filter by rating
- Sort by date/rating
- Verified purchase badge
- Helpful votes

### 8.3 Feedback System

**What it is:** Submit general feedback about the service.

**How to use:**

- **Backend API:** `POST /feedback`

**Features:**

- Feedback categories
- Attachment support
- Priority levels
- Admin response tracking

---

## 9. Real-time Features

### 9.1 Real-time Seat Updates

**What it is:** Live seat availability updates using WebSocket.

**How to use:**

- Automatic connection when viewing trip details
- **WebSocket:** `ws://backend/seat-updates`

**Features:**

- Instant seat status updates
- Multiple user synchronization
- Seat locking mechanism
- Conflict prevention

**Events:**

- `seat-locked` - Seat temporarily reserved
- `seat-unlocked` - Seat released
- `seat-booked` - Seat permanently booked
- `seat-available` - Seat became available

### 9.2 Real-time Booking Updates

**What it is:** Live booking status updates.

**How to use:**

- Automatic connection for active bookings
- **WebSocket:** `ws://backend/booking-updates`

**Features:**

- Payment status updates
- Booking confirmation
- Cancellation notifications
- Modification updates

**Events:**

- `booking-created` - New booking
- `booking-confirmed` - Payment confirmed
- `booking-cancelled` - Booking cancelled
- `booking-modified` - Booking changed

### 9.3 Live Chat Support

**What it is:** Real-time customer support chat.

**How to use:**

- **Frontend:** Navigate to `/chat` page
- **Backend API:**
  - `GET /chat/conversations` - List conversations
  - `POST /chat/conversations` - Start conversation
  - `POST /chat/messages` - Send message
  - `GET /chat/conversations/:id/messages` - Get messages

**Features:**

- One-on-one chat with support
- Message history
- Typing indicators
- Read receipts
- File attachments

---

## 10. AI-Powered Features

### 10.1 AI Chat Assistant

**What it is:** Intelligent chatbot powered by Google Gemini AI.

**How to use:**

- **Frontend:** Chat widget on website
- **Backend API:** `POST /ai/chat`

**Features:**

- Natural language understanding
- Trip recommendations
- FAQ answering
- Booking assistance
- Multi-language support

**Capabilities:**

- Answer questions about routes
- Help with booking process
- Provide travel information
- Suggest best trips
- Explain policies

### 10.2 Smart Trip Recommendations

**What it is:** AI-powered trip suggestions based on user preferences.

**How to use:**

- **Backend API:** `POST /ai/recommend`

**Features:**

- Personalized recommendations
- Price optimization
- Route suggestions
- Best time to travel
- Alternative routes

---

## 11. Notifications

### 11.1 Email Notifications

**What it is:** Automated email notifications for important events.

**Email Types:**

- Registration confirmation
- Email verification
- Booking confirmation
- Payment confirmation
- E-ticket delivery
- Booking modification
- Cancellation confirmation
- Password reset
- Trip reminders

**Features:**

- Professional email templates
- SendGrid integration
- Attachment support (PDF tickets)
- Delivery tracking

### 11.2 In-App Notifications

**What it is:** System notifications within the application.

**How to use:**

- **Frontend:** Navigate to `/user/notifications`
- **Backend API:**
  - `GET /notifications` - List notifications
  - `PATCH /notifications/:id/read` - Mark as read

**Features:**

- Real-time notifications
- Notification categories
- Read/unread status
- Notification history
- Priority levels

**Notification Types:**

- Booking updates
- Payment status
- Trip reminders
- Promotional offers
- System announcements

---

## 12. Additional Features

### 12.1 FAQ Section

**What it is:** Frequently asked questions and answers.

**How to use:**

- **Frontend:** FAQ page
- **Backend API:** `GET /faq`

**Features:**

- Categorized questions
- Search functionality
- Helpful/not helpful voting
- Admin management

### 12.2 Health Check

**What it is:** System health monitoring endpoint.

**How to use:**

- **Backend API:** `GET /health`

**Features:**

- Database connectivity check
- Service status
- Uptime monitoring
- Version information

### 12.3 Database Management

**What it is:** Database utilities and maintenance.

**How to use:**

- **Backend API:**
  - `POST /database/seed` - Seed sample data
  - `POST /database/reset` - Reset database

**Features:**

- Sample data generation
- Database seeding
- Data cleanup
- Migration management

### 12.4 File Upload

**What it is:** Upload files and images to cloud storage.

**How to use:**

- **Backend API:** Cloudinary service integration

**Features:**

- Image upload
- Automatic optimization
- CDN delivery
- Multiple format support
- Size validation

### 12.5 Passenger Management

**What it is:** View and manage passenger information.

**How to use:**

- **Frontend:** Navigate to `/admin/passengers`
- **Backend API:** Passenger queries through booking system

**Features:**

- View all passengers
- Search by name/document ID
- Travel history
- Booking statistics

### 12.6 Trip Filtering & Sorting

**What it is:** Advanced search capabilities for trips.

**Filters:**

- Price range
- Departure time
- Bus type
- Amenities
- Operator
- Duration
- Available seats

**Sorting Options:**

- Price (low to high, high to low)
- Departure time (earliest, latest)
- Duration (shortest, longest)
- Rating (highest first)

### 12.7 Booking Reference System

**What it is:** Unique reference numbers for each booking.

**Features:**

- Auto-generated unique codes
- Format: `BK-YYYYMMDD-XXXX`
- Easy lookup
- QR code generation

### 12.8 Multi-language Support

**What it is:** Support for multiple languages (planned).

**Languages:**

- English
- Vietnamese

### 12.9 Responsive Design

**What it is:** Mobile-friendly interface.

**Features:**

- Mobile-optimized layouts
- Touch-friendly controls
- Progressive Web App (PWA) capabilities
- Offline support (limited)

---

## Feature Access Matrix

| Feature           | Guest | User | Admin |
| ----------------- | ----- | ---- | ----- |
| Search Trips      | ✅    | ✅   | ✅    |
| View Trip Details | ✅    | ✅   | ✅    |
| Create Booking    | ✅    | ✅   | ✅    |
| View Own Bookings | ❌    | ✅   | ✅    |
| Modify Booking    | ❌    | ✅   | ✅    |
| Cancel Booking    | ❌    | ✅   | ✅    |
| Submit Review     | ❌    | ✅   | ✅    |
| View Reviews      | ✅    | ✅   | ✅    |
| Live Chat         | ✅    | ✅   | ✅    |
| AI Assistant      | ✅    | ✅   | ✅    |
| User Profile      | ❌    | ✅   | ✅    |
| View All Bookings | ❌    | ❌   | ✅    |
| Manage Users      | ❌    | ❌   | ✅    |
| Manage Trips      | ❌    | ❌   | ✅    |
| Manage Routes     | ❌    | ❌   | ✅    |
| Manage Buses      | ❌    | ❌   | ✅    |
| View Analytics    | ❌    | ❌   | ✅    |
| Process Refunds   | ❌    | ❌   | ✅    |

---

## API Endpoints Summary

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/logout` - Logout
- `POST /auth/refresh-token` - Refresh access token
- `GET /auth/me` - Get current user
- `GET /auth/google` - Google OAuth login
- `POST /auth/verify-email` - Verify email
- `POST /auth/resend-verification` - Resend verification
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### Trips

- `GET /trips/search` - Search trips
- `GET /trips/:tripId` - Get trip details
- `POST /trips` - Create trip (admin)
- `PUT /trips/:id` - Update trip (admin)
- `DELETE /trips/:id` - Delete trip (admin)
- `GET /trips/available-buses` - Get available buses
- `POST /trips/assign-bus` - Assign bus to route

### Bookings

- `POST /booking` - Create booking
- `GET /booking/:id` - Get booking details
- `GET /booking/guest` - Get guest booking
- `GET /users/me/bookings` - Get user bookings
- `PUT /booking/:id/modify` - Modify booking
- `PUT /booking/:id/change-seats` - Change seats
- `DELETE /booking/:id/cancel` - Cancel booking
- `POST /booking/:id/confirm-payment` - Confirm payment
- `GET /booking/:id/download-eticket` - Download e-ticket

### Users

- `GET /users/profile` - Get profile
- `PUT /users/profile` - Update profile
- `POST /users/avatar` - Upload avatar
- `POST /users/change-password` - Change password

### Admin

- `GET /admin/stats` - Dashboard statistics
- `GET /admin/users` - List all users
- `GET /admin/bookings` - List all bookings
- `GET /admin/analytics/*` - Various analytics endpoints
- `PATCH /admin/users/:userId/role` - Change user role
- `POST /admin/account` - Create admin account

### Routes & Buses

- `GET /route` - List routes
- `POST /route` - Create route (admin)
- `GET /bus` - List buses
- `POST /bus` - Create bus (admin)
- `GET /seat-layout` - List seat layouts

### Reviews & Feedback

- `POST /reviews` - Submit review
- `GET /reviews/trip/:tripId` - Get trip reviews
- `GET /reviews/operator/:operatorId` - Get operator reviews

### Chat

- `GET /chat/conversations` - List conversations
- `POST /chat/conversations` - Start conversation
- `POST /chat/messages` - Send message

### AI

- `POST /ai/chat` - Chat with AI assistant
- `POST /ai/recommend` - Get AI recommendations

### Notifications

- `GET /notifications` - List notifications
- `PATCH /notifications/:id/read` - Mark as read

### Payment

- `POST /payos/create-payment-link` - Create payment
- `POST /payos/webhook` - Payment webhook
- `POST /payos/refund` - Process refund

---

## Frontend Pages Summary

### Public Pages

- `/` - Homepage with search
- `/search` - Trip search results
- `/trips/[id]` - Trip details
- `/routes` - Browse routes
- `/login` - Login page
- `/signup` - Registration page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset form
- `/verify-email` - Email verification

### User Pages (Authenticated)

- `/user` - User dashboard
- `/user/profile` - User profile
- `/user/bookings` - User bookings
- `/user/notifications` - Notifications
- `/my-bookings` - Alternative bookings page
- `/bookings/[id]` - Booking details
- `/passenger-info` - Passenger information form
- `/payment` - Payment page
- `/payment/success` - Payment success
- `/payment/cancel` - Payment cancelled
- `/payment/failure` - Payment failed
- `/tickets` - E-tickets
- `/chat` - Live chat support

### Admin Pages (Admin Only)

- `/admin` - Admin dashboard
- `/admin/bookings` - Manage bookings
- `/admin/buses` - Manage buses
- `/admin/routes` - Manage routes
- `/admin/trips` - Manage trips
- `/admin/operators` - Manage operators
- `/admin/passengers` - View passengers
- `/admin/faqs` - Manage FAQs

---

## Technology Stack

### Backend

- **Framework:** NestJS (Node.js)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** TypeORM
- **Authentication:** JWT, Passport.js
- **Payment:** PayOS
- **Email:** SendGrid
- **File Storage:** Cloudinary
- **AI:** Google Gemini
- **Real-time:** Socket.IO
- **API Documentation:** Swagger

### Frontend

- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI, shadcn/ui
- **State Management:** React Query
- **Forms:** React Hook Form
- **Validation:** Yup, Zod
- **HTTP Client:** Axios
- **Real-time:** Socket.IO Client

---

## Support & Documentation

For more detailed information about specific features:

- **Authentication:** See `docs/authentication.md`
- **Authorization:** See `docs/authorization.md`
- **Booking System:** See `docs/booking-modification.md`
- **Payment Integration:** See `docs/additional-booking-apis.md`
- **Database Schema:** See `docs/database-diagram.dbml`
- **Deployment:** See `docs/DEPLOYMENT.md`

---

**Last Updated:** January 3, 2026  
**Version:** 0.3.0  
**Document Type:** Features Documentation
