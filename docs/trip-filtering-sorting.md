# Trip Search API Testing Guide

This document demonstrates the enhanced filtering and sorting capabilities of the trip search API.

## API Endpoint
```
GET /trips/search
```

## Enhanced Filter Parameters

### 1. Departure Time Filtering
- **Time buckets**: `morning`, `afternoon`, `evening`, `night`  
- **Exact time**: `departureTimeExact` (HH:MM format)
- **Date filtering**: `date` (ISO 8601 format)

### 2. Bus Type Filtering  
- **Available types**: `standard`, `limousine`, `sleeper`, `seater`, `vip`, `business`
- **Parameter**: `busType`

### 3. Price Range Filtering
- **Min price**: `minPrice` (numeric)
- **Max price**: `maxPrice` (numeric)

### 4. Enhanced Sorting Options
- **Sort by**: `sortBy` (`price`, `departureTime`, `duration`)
- **Sort order**: `sortOrder` (`ASC`, `DESC`)

## Test Examples

### Example 1: Morning trips, VIP buses, price range 200k-800k, sorted by price ascending
```
GET /trips/search?origin=Ho%20Chi%20Minh&destination=Da%20Lat&departureTime=morning&busType=vip&minPrice=200000&maxPrice=800000&sortBy=price&sortOrder=ASC
```

### Example 2: Evening trips, sorted by departure time descending  
```
GET /trips/search?origin=Ha%20Noi&destination=Sapa&departureTime=evening&sortBy=departureTime&sortOrder=DESC
```

### Example 3: Exact time filtering and price sorting
```
GET /trips/search?origin=Ho%20Chi%20Minh&destination=Nha%20Trang&departureTimeExact=08:30&sortBy=price&sortOrder=ASC
```

### Example 4: Business/Limousine buses under 1M VND
```
GET /trips/search?origin=Da%20Nang&destination=Hoi%20An&busType=business&maxPrice=1000000&sortBy=departureTime&sortOrder=ASC
```

## Response Format

The API returns trips with detailed information including:

```json
{
  "success": true,
  "data": [
    {
      "tripId": "uuid",
      "route": {
        "origin": "Ho Chi Minh",
        "destination": "Da Lat"
      },
      "bus": {
        "busType": "vip",
        "model": "Hyundai Universe",
        "amenities": ["wifi", "ac", "entertainment"]
      },
      "schedule": {
        "departureTime": "2026-01-02T08:30:00.000Z",
        "arrivalTime": "2026-01-02T15:30:00.000Z",
        "duration": 420
      },
      "pricing": {
        "basePrice": 350000,
        "currency": "VND"
      },
      "availability": {
        "totalSeats": 45,
        "availableSeats": 12,
        "occupancyRate": 73.33
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

## Key Improvements Made

✅ **Fixed Bus Type Filtering**: Added `busType` enum field to Bus entity
✅ **Enhanced Sorting**: Dynamic sorting by price, departure time, or duration  
✅ **Extended Bus Types**: Support for 6 bus types including VIP and Business
✅ **Proper Database Schema**: Migration added for busType column with index
✅ **Improved Response**: Now returns actual busType values instead of null

## Time Bucket Definitions

- **morning**: 05:00 - 11:59
- **afternoon**: 12:00 - 16:59  
- **evening**: 17:00 - 20:59
- **night**: 21:00 - 04:59 (spans midnight)