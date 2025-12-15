# A1.3 - Change Seats API Implementation

## API Endpoint

**PUT** `/api/bookings/:id/seats`

## Implementation Summary

✅ **API Created**: PUT endpoint for seat changes
✅ **Seat Availability Check**: Validates seat exists and is available for the trip
✅ **Seat Locking**: Locks new seat and releases old seat atomically
✅ **Seat Status Updates**: Updates seat_status table with booking ownership
✅ **Price Recalculation**: Handles price differences based on seat types
✅ **Transaction Safety**: All operations wrapped in database transactions
✅ **Modification History**: Complete audit trail of seat changes

## Request Format

```json
{
  "seatChanges": [
    {
      "passengerId": "passenger-uuid-1",
      "newSeatCode": "A5"
    },
    {
      "passengerId": "passenger-uuid-2", 
      "newSeatCode": "B10"
    }
  ]
}
```

## Response Format

```json
{
  "success": true,
  "message": "Seats changed successfully",
  "data": {
    "bookingId": "booking-uuid",
    "bookingReference": "BK20241215ABCD",
    "seatChanges": [
      {
        "passengerId": "passenger-uuid-1",
        "passengerName": "John Doe",
        "oldSeatCode": "A1",
        "newSeatCode": "A5",
        "oldSeatPrice": 150000,
        "newSeatPrice": 200000,
        "priceDifference": 50000
      }
    ],
    "oldTotalAmount": 300000,
    "newTotalAmount": 350000,
    "totalPriceDifference": 50000,
    "modificationHistory": [
      {
        "type": "seat_change",
        "description": "Changed seat for John Doe from A1 to A5 (+50,000 VND)",
        "timestamp": "2024-12-15T10:30:00Z"
      }
    ]
  }
}
```

## Business Logic Implementation

### 1. Seat Availability Check
- Validates seat exists on the bus for the trip
- Checks seat is active and bookable
- Ensures seat is not occupied by another booking
- Verifies seat belongs to the correct bus

### 2. Seat Locking Mechanism
- **Release Old Seat**: Updates seat_status to AVAILABLE, removes booking ID
- **Lock New Seat**: Updates seat_status to BOOKED, assigns booking ID
- **Atomic Operation**: Both operations in single transaction

### 3. Price Recalculation Logic
```typescript
// Base price from trip
basePrice = trip.basePrice

// Seat type pricing from seat_layouts
seatTypePrices = {
  normal: 0,      // No additional charge
  vip: 50000,     // +50k VND
  business: 100000 // +100k VND
}

// Final price calculation
seatPrice = basePrice + seatTypePrices[seatType]
priceDifference = newSeatPrice - oldSeatPrice
newTotalAmount = oldTotalAmount + totalPriceDifference
```

### 4. Database Updates

#### Tables Modified:
1. **passenger_details**: Updates seatCode for each passenger
2. **seat_status**: Releases old seats, locks new seats
3. **bookings**: Updates totalAmount and lastModifiedAt
4. **booking_modification_history**: Records change details
5. **audit_logs**: Creates audit trail entry

### 5. Validation Rules
- **Booking Ownership**: User must own the booking
- **Status Check**: Booking must be PENDING or PAID
- **Time Constraint**: ≥24 hours before departure
- **Passenger Validation**: All passengers must belong to the booking
- **Seat Validation**: All seats must exist and be available

## Error Handling

### Common Error Scenarios
- `404`: Booking not found
- `404`: Passenger not found in booking
- `404`: Seat not found on bus
- `403`: Access denied (ownership validation)
- `400`: Invalid booking status or time constraint
- `409`: Seat already occupied
- `400`: Seat not active/available
- `400`: Validation errors (invalid request format)

## Database Schema Changes

### Added to seat_status table:
```sql
ALTER TABLE seat_status ADD COLUMN seat_code VARCHAR NOT NULL;
```

This improves query performance and eliminates need for joins when working with seat codes.

## Usage Examples

### Example 1: Single Seat Change
```bash
curl -X PUT /api/bookings/123e4567-e89b-12d3-a456-426614174000/seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jwt-token" \
  -d '{
    "seatChanges": [{
      "passengerId": "456e7890-e89b-12d3-a456-426614174000",
      "newSeatCode": "A10"
    }]
  }'
```

### Example 2: Multiple Seat Changes
```bash
curl -X PUT /api/bookings/123e4567-e89b-12d3-a456-426614174000/seats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer jwt-token" \
  -d '{
    "seatChanges": [
      {
        "passengerId": "456e7890-e89b-12d3-a456-426614174000",
        "newSeatCode": "B5"
      },
      {
        "passengerId": "789e0123-e89b-12d3-a456-426614174000", 
        "newSeatCode": "B6"
      }
    ]
  }'
```

## Security Considerations

- **Atomic Operations**: All seat changes in single transaction
- **Ownership Validation**: Prevents unauthorized seat changes
- **Seat Locking**: Prevents race conditions in concurrent bookings
- **Change Tracking**: Complete audit trail for accountability
- **Price Integrity**: Automatic recalculation prevents pricing errors

## Performance Optimizations

- **Batch Processing**: Multiple seat changes in single transaction
- **Efficient Queries**: Direct seat_code lookup with new column
- **Minimal Lock Time**: Quick seat status updates
- **Change Detection**: Skips unnecessary updates for same seat

The implementation ensures data integrity, handles all edge cases, and provides comprehensive audit trails for seat change operations.