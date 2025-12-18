# A1.2 - Modify Passenger Details API Implementation

## API Endpoint

**PUT** `/api/bookings/:id/passengers`

## Implementation Summary

✅ **API Created**: PUT endpoint for passenger details modification
✅ **Booking Ownership Validation**: Validates userId matches booking owner
✅ **Booking Status Validation**: Uses existing permission service to validate status (PENDING/PAID) and time constraints (≥24h before departure)
✅ **Passenger Payload Validation**: Comprehensive DTO validation with class-validator
✅ **Database Updates**: Updates passenger_details table with transaction safety
✅ **Modification History Logging**: Records all changes in booking_modification_history table
✅ **Audit Logging**: Creates audit trail entries for compliance

## Request Format

```json
{
  "passengers": [
    {
      "id": "passenger-uuid-1",
      "fullName": "Updated Name",
      "documentId": "123456789",
      "seatCode": "A1"
    },
    {
      "id": "passenger-uuid-2", 
      "fullName": "Another Updated Name"
    }
  ]
}
```

## Response Format

```json
{
  "success": true,
  "message": "Passenger details modified successfully",
  "data": {
    "bookingId": "booking-uuid",
    "bookingReference": "BK20241215ABCD",
    "modifiedPassengers": [
      {
        "id": "passenger-uuid-1",
        "bookingId": "booking-uuid",
        "fullName": "Updated Name",
        "documentId": "123456789",
        "seatCode": "A1",
        "modifiedAt": "2024-12-15T10:30:00Z"
      }
    ],
    "modificationHistory": [
      {
        "type": "passenger_info",
        "description": "Updated passenger John Doe: name from 'John Smith' to 'Updated Name'",
        "timestamp": "2024-12-15T10:30:00Z"
      }
    ]
  }
}
```

## Validation Rules

1. **Booking Ownership**: 
   - For authenticated users: `booking.userId === req.user.userId`
   - Guest bookings: No userId restriction

2. **Booking Status**: 
   - Status must be `PENDING` or `PAID`
   - Must be ≥24 hours before departure time

3. **Passenger Validation**:
   - Passenger ID must exist in the booking
   - All fields are optional (partial updates allowed)
   - Seat changes validate availability and bus compatibility

4. **Data Integrity**:
   - Transaction-based updates
   - Seat status management for seat changes
   - Rollback on any error

## Key Features

- **Partial Updates**: Only specified fields are updated
- **Seat Management**: Automatic seat status updates when seats change
- **Change Tracking**: Detailed before/after value logging
- **Error Handling**: Comprehensive validation with descriptive messages
- **Audit Trail**: Complete modification history for compliance

## Error Scenarios

- `404`: Booking not found
- `403`: Access denied (ownership validation failed)
- `400`: Invalid booking status or time constraint violation
- `404`: Passenger not found in booking
- `409`: Seat already occupied (for seat changes)
- `400`: Validation errors (invalid data format)

The implementation follows all requirements specified in A1.2 and integrates seamlessly with the existing booking modification framework.