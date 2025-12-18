-- Analytics Performance Optimization Indexes
-- Execute these SQL commands to optimize analytics query performance

-- Composite indexes for booking analytics
CREATE INDEX IF NOT EXISTS idx_bookings_booked_at_status 
ON bookings(booked_at, status) 
WHERE booked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_status_amount_date 
ON bookings(status, total_amount, booked_at) 
WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_bookings_trip_status_date 
ON bookings(trip_id, status, booked_at);

-- Composite indexes for route analytics
CREATE INDEX IF NOT EXISTS idx_trips_departure_route 
ON trips(departure_time, route_id) 
WHERE departure_time IS NOT NULL AND route_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_route_bus_departure 
ON trips(route_id, bus_id, departure_time);

-- Seat occupancy optimization
CREATE INDEX IF NOT EXISTS idx_seat_status_trip_state 
ON seat_status(trip_id, state) 
WHERE state = 'booked';

CREATE INDEX IF NOT EXISTS idx_trips_departure_bus 
ON trips(departure_time, bus_id) 
WHERE departure_time IS NOT NULL;

-- Performance indexes for aggregation queries
CREATE INDEX IF NOT EXISTS idx_bookings_analytics_composite 
ON bookings(booked_at, status, total_amount, trip_id);

CREATE INDEX IF NOT EXISTS idx_seat_layouts_capacity 
ON seat_layouts(bus_id, total_rows, seats_per_row);

-- Covering indexes for common analytics queries
CREATE INDEX IF NOT EXISTS idx_bookings_summary_covering 
ON bookings(booked_at, status) 
INCLUDE (total_amount, trip_id);

-- Optimized indexes for date range queries (without function expressions)
CREATE INDEX IF NOT EXISTS idx_bookings_date_status_analytics 
ON bookings(booked_at, status) 
WHERE booked_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_date_route_analytics 
ON trips(departure_time, route_id) 
WHERE departure_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_routes_analytics_covering 
ON routes(id) 
INCLUDE (name, origin, destination);

-- Partial indexes for recent data (static date ranges)
CREATE INDEX IF NOT EXISTS idx_bookings_paid_recent 
ON bookings(booked_at, total_amount) 
WHERE status = 'paid';

CREATE INDEX IF NOT EXISTS idx_trips_active_recent 
ON trips(departure_time, route_id);

-- Statistics maintenance (PostgreSQL specific)
-- Run these periodically to maintain query performance
-- ANALYZE bookings;
-- ANALYZE trips;
-- ANALYZE routes;
-- ANALYZE seat_status;

-- Index usage monitoring queries
-- Use these to monitor index effectiveness:

-- Index usage statistics
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE tablename IN ('bookings', 'trips', 'routes', 'seat_status')
-- ORDER BY idx_scan DESC;

-- Query performance monitoring
-- SELECT 
--   query,
--   calls,
--   total_time,
--   mean_time,
--   rows
-- FROM pg_stat_statements 
-- WHERE query ILIKE '%booking%' OR query ILIKE '%analytics%'
-- ORDER BY mean_time DESC;