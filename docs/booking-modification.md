# Booking Modification Functionality

## Overview

This document describes the comprehensive booking modification system that allows users to modify their bookings within specific business rules and constraints.

## Business Rules

### A1.1 – Permission & Rule Definition

#### Allowed Booking Status
- **PENDING**: Bookings that have been created but not yet paid
- **PAID**: Bookings that have been successfully paid

#### Time Restrictions
- Modifications are only allowed if there are **at least 24 hours** before the departure time
- This ensures operational feasibility and prevents last-minute disruptions

#### Modifiable Fields

1. **Passenger Information**
   - Full name
   - ID/CCCD (Document ID)

2. **Contact Information**
   - Phone number
   - Email address

3. **Seat Selection**
   - Can change to any available seat on the same trip
   - System validates seat availability before allowing changes

## API Endpoints

### 1. Check Modification Permissions
```
GET /bookings/:id/modification-permissions
```

**Purpose**: Check if a booking can be modified and what modifications are allowed

**Response**:
```json
{
  "success": true,
  "message": "Modification permissions retrieved successfully",
  "data": {
    "canModifyPassengerInfo": true,
    "canModifySeats": true,
    "canModifyContactInfo": true,
    "rules": [
      "Booking can be modified if:",
      "• Status is PENDING or PAID",
      "• At least 24 hours before departure time",
      "",
      "Modifiable fields:",
      "• Passenger name",
      "• ID/CCCD number",
      "• Contact phone",
      "• Seat selection (if seats are available)"
    ],
    "restrictions": ["Current restriction reason if any"]
  }
}
```

### 2. Modify Booking
```
PUT /bookings/:id/modify
```

**Purpose**: Apply modifications to a booking

**Request Body**:
```json
{
  "passengerInfo": [
    {
      "passengerId": "uuid",
      "fullName": "New Name",
      "documentId": "New ID Number"
    }
  ],
  "seatChanges": [
    {
      "passengerId": "uuid",
      "newSeatCode": "A1"
    }
  ],
  "contactInfo": {
    "contactPhone": "+84987654321",
    "contactEmail": "newemail@example.com"
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Booking modified successfully",
  "data": {
    "id": "booking-uuid",
    "bookingReference": "BK20241215ABCD",
    "status": "paid",
    "modificationAllowed": true,
    "modificationRules": ["..."],
    "lastModifiedAt": "2024-12-15T10:30:00Z",
    "modificationHistory": [
      {
        "type": "passenger_info",
        "timestamp": "2024-12-15T10:30:00Z",
        "changes": {
          "fullName": "New Name"
        }
      }
    ]
  }
}
```

### 3. Get Modification History
```
GET /bookings/:id/modification-history
```

**Purpose**: Retrieve the complete modification history of a booking

**Response**:
```json
{
  "success": true,
  "message": "Modification history retrieved successfully",
  "data": [
    {
      "id": "history-uuid",
      "bookingId": "booking-uuid",
      "userId": "user-uuid",
      "modificationType": "passenger_info",
      "description": "Updated passenger John Doe: name from 'John Smith' to 'John Doe'",
      "changes": {
        "fullName": "John Doe"
      },
      "previousValues": {
        "fullName": "John Smith"
      },
      "modifiedAt": "2024-12-15T10:30:00Z"
    }
  ]
}
```

## Database Schema

### Modified Tables

#### bookings
- Added `last_modified_at` field to track when the booking was last modified

#### booking_modification_history (New Table)
- `id`: Primary key
- `booking_id`: Foreign key to bookings
- `user_id`: Foreign key to users (nullable for guest bookings)
- `modification_type`: ENUM ('passenger_info', 'seat_change', 'contact_info')
- `description`: Human-readable description of the change
- `changes`: JSONB field storing the new values
- `previous_values`: JSONB field storing the previous values
- `modified_at`: Timestamp of the modification

## Validation Logic

### Permission Validation
1. **Status Check**: Verify booking status is PENDING or PAID
2. **Time Check**: Ensure departure time is at least 24 hours away
3. **Ownership Check**: Verify user has access to modify the booking

### Seat Change Validation
1. **Seat Existence**: Verify the new seat exists
2. **Bus Compatibility**: Ensure the seat is on the correct bus for the trip
3. **Availability Check**: Confirm the seat is not occupied by another booking
4. **Current Seat Release**: Free up the passenger's current seat

### Passenger Info Validation
1. **Passenger Existence**: Verify passenger belongs to the booking
2. **Data Validation**: Ensure new information meets format requirements
3. **Change Detection**: Only apply actual changes (no unnecessary updates)

## Audit and Tracking

### Audit Logs
- All modifications are logged in the audit_logs table
- Includes user ID, action type, and modification details

### Modification History
- Detailed tracking of each change with before/after values
- Enables rollback functionality if needed
- Provides complete audit trail for customer service

## Error Handling

### Common Error Scenarios
1. **Booking Not Found**: 404 error with descriptive message
2. **Access Denied**: 403 error for unauthorized modification attempts
3. **Invalid Status**: 400 error for bookings that cannot be modified
4. **Time Restriction**: 400 error when modification window has passed
5. **Seat Unavailable**: 409 error when requested seat is occupied
6. **Validation Errors**: 400 error with field-specific validation messages

## Security Considerations

### Access Control
- Users can only modify their own bookings
- Guest bookings require booking reference validation
- Optional JWT authentication for enhanced security

### Data Integrity
- All modifications use database transactions
- Rollback on any error during modification process
- Concurrent modification protection through optimistic locking

## Usage Examples

### Example 1: Change Passenger Name
```bash
curl -X PUT /bookings/123e4567-e89b-12d3-a456-426614174000/modify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jwt-token" \
  -d '{
    "passengerInfo": [{
      "passengerId": "456e7890-e89b-12d3-a456-426614174000",
      "fullName": "John Doe Updated"
    }]
  }'
```

### Example 2: Change Seat and Contact Info
```bash
curl -X PUT /bookings/123e4567-e89b-12d3-a456-426614174000/modify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jwt-token" \
  -d '{
    "seatChanges": [{
      "passengerId": "456e7890-e89b-12d3-a456-426614174000",
      "newSeatCode": "B5"
    }],
    "contactInfo": {
      "contactPhone": "+84987654321"
    }
  }'
```

## Migration Instructions

1. **Run Database Migration**:
   ```bash
   npm run migration:run
   ```

2. **Update Application Configuration**: No additional configuration required

3. **Test Endpoints**: Use the provided examples to verify functionality

## Future Enhancements

1. **Email Notifications**: Send confirmation emails for modifications
2. **Price Adjustments**: Handle fare differences when changing seats
3. **Bulk Modifications**: Allow multiple bookings to be modified simultaneously
4. **Approval Workflow**: Add admin approval for certain types of modifications
5. **Modification Fees**: Implement fees for certain modification types