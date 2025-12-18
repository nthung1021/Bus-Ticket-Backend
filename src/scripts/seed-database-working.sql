-- Simplified Working Database Seeding Script
-- Uses only valid enum values and existing data

-- 1. Insert some basic seat layouts
INSERT INTO seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing) VALUES
('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'standard_2x2', 12, 2, '{"rows": []}', '{"normal": 40.00}'),
('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'standard_2x3', 16, 5, '{"rows": []}', '{"normal": 45.00}'),
('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'vip_1x2', 15, 2, '{"rows": []}', '{"vip": 80.00}'),
('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'standard_2x2', 18, 2, '{"rows": []}', '{"normal": 42.00}'),
('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'standard_2x3', 12, 5, '{"rows": []}', '{"normal": 35.00}');

-- Generate remaining seat layouts for other buses
INSERT INTO seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing) 
SELECT 
  uuid_generate_v4(),
  id,
  'standard_2x2'::seat_layouts_layouttype_enum,
  12,
  2,
  '{"rows": []}',
  '{"normal": 40.00}'
FROM buses 
WHERE id NOT IN (SELECT bus_id FROM seat_layouts);

-- 2. Insert Seats (using valid seat types)
INSERT INTO seats (id, bus_id, seat_code, "seatType") VALUES
-- Bus 1 seats
('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'A1', 'normal'),
('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'A2', 'normal'),
('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'A3', 'normal'),
('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'A4', 'normal'),
('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 'B1', 'normal'),
('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 'B2', 'normal'),
-- Bus 2 seats
('50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', 'A1', 'vip'),
('50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000002', 'A2', 'vip'),
('50000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000002', 'B1', 'normal'),
('50000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000002', 'B2', 'normal'),
-- Bus 3 seats
('50000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000003', 'A1', 'business'),
('50000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000003', 'A2', 'business'),
('50000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000003', 'B1', 'normal'),
('50000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000003', 'B2', 'normal');

-- Generate additional seats for all buses
INSERT INTO seats (id, bus_id, seat_code, "seatType")
SELECT 
  uuid_generate_v4(),
  b.id,
  'S' || LPAD(ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY b.id)::text, 2, '0'),
  CASE 
    WHEN ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY b.id) % 4 = 0 THEN 'vip'
    WHEN ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY b.id) % 8 = 0 THEN 'business'
    ELSE 'normal'
  END::seats_seattype_enum
FROM buses b
CROSS JOIN generate_series(1, 15) AS seat_num
WHERE b.id NOT IN (
  SELECT DISTINCT bus_id FROM seats WHERE seat_code LIKE 'S%'
);

-- 3. Insert additional trips (20 more)
INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status)
SELECT 
  uuid_generate_v4(),
  r.id,
  b.id,
  NOW() + INTERVAL '1 day' * (ROW_NUMBER() OVER() % 30 + 1),
  NOW() + INTERVAL '1 day' * (ROW_NUMBER() OVER() % 30 + 1) + INTERVAL '6 hours',
  8000 + (ROW_NUMBER() OVER() % 50) * 100,
  CASE 
    WHEN ROW_NUMBER() OVER() % 10 = 0 THEN 'cancelled'
    WHEN ROW_NUMBER() OVER() % 5 = 0 THEN 'completed'
    ELSE 'scheduled'
  END::trips_status_enum
FROM routes r
CROSS JOIN buses b
WHERE ROW_NUMBER() OVER() <= 20
AND NOT EXISTS (
  SELECT 1 FROM trips t WHERE t.route_id = r.id AND t.bus_id = b.id
);

-- 4. Insert Bookings (using valid status values)
INSERT INTO bookings (id, user_id, trip_id, booking_reference, total_amount, status, contact_email, contact_phone) VALUES
('70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006', (SELECT id FROM trips ORDER BY id LIMIT 1), 'BK240101001', 15000, 'paid', 'user6@example.com', '+15550000006'),
('70000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 1), 'BK240101002', 9500, 'paid', 'user7@example.com', '+15550000007'),
('70000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000008', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 2), 'BK240101003', 25500, 'pending', 'user8@example.com', '+15550000008'),
('70000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000009', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 3), 'BK240101004', 10500, 'paid', 'user9@example.com', '+15550000009'),
('70000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000010', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 4), 'BK240101005', 23000, 'paid', 'user10@example.com', '+15550000010'),
('70000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000011', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 5), 'BK240101006', 7500, 'paid', 'user11@example.com', '+15550000011'),
('70000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000012', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 6), 'BK240101007', 19000, 'expired', 'user12@example.com', '+15550000012'),
('70000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000013', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 7), 'BK240101008', 8500, 'cancelled', 'user13@example.com', '+15550000013'),
('70000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000014', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 8), 'BK240101009', 31500, 'paid', 'user14@example.com', '+15550000014'),
('70000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000015', (SELECT id FROM trips ORDER BY id LIMIT 1 OFFSET 9), 'BK240101010', 11500, 'paid', 'user15@example.com', '+15550000015');

-- Add more bookings for remaining users
INSERT INTO bookings (id, user_id, trip_id, booking_reference, total_amount, status, contact_email, contact_phone)
SELECT 
  uuid_generate_v4(),
  u.id,
  (SELECT id FROM trips ORDER BY RANDOM() LIMIT 1),
  'BK' || EXTRACT(YEAR FROM NOW())::text || LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || LPAD((ROW_NUMBER() OVER() + 10)::text, 3, '0'),
  8000 + (ROW_NUMBER() OVER() % 50) * 500,
  CASE 
    WHEN ROW_NUMBER() OVER() % 10 = 0 THEN 'pending'
    WHEN ROW_NUMBER() OVER() % 8 = 0 THEN 'cancelled'
    WHEN ROW_NUMBER() OVER() % 6 = 0 THEN 'expired'
    ELSE 'paid'
  END::bookings_status_enum,
  u.email,
  u.phone
FROM users u
WHERE u.role = 'customer'
AND u.id NOT IN (SELECT user_id FROM bookings WHERE user_id IS NOT NULL)
AND ROW_NUMBER() OVER() <= 25;

-- 5. Insert Seat Status (using existing seats and bookings)
INSERT INTO seat_status (id, trip_id, seat_id, seat_code, booking_id, state)
SELECT 
  uuid_generate_v4(),
  t.id,
  s.id,
  s.seat_code,
  CASE WHEN ROW_NUMBER() OVER() % 3 = 0 THEN NULL ELSE b.id END,
  CASE WHEN ROW_NUMBER() OVER() % 3 = 0 THEN 'available' ELSE 'booked' END::seat_status_state_enum
FROM trips t
CROSS JOIN seats s
LEFT JOIN bookings b ON b.trip_id = t.id
WHERE s.bus_id = t.bus_id
AND ROW_NUMBER() OVER() <= 100;

-- 6. Insert Passenger Details (using existing bookings)
INSERT INTO passenger_details (id, booking_id, full_name, document_id, seat_code)
SELECT 
  uuid_generate_v4(),
  b.id,
  CASE 
    WHEN ROW_NUMBER() OVER() % 10 = 1 THEN 'John Doe'
    WHEN ROW_NUMBER() OVER() % 10 = 2 THEN 'Jane Smith'
    WHEN ROW_NUMBER() OVER() % 10 = 3 THEN 'Michael Brown'
    WHEN ROW_NUMBER() OVER() % 10 = 4 THEN 'Emily Johnson'
    WHEN ROW_NUMBER() OVER() % 10 = 5 THEN 'David Wilson'
    WHEN ROW_NUMBER() OVER() % 10 = 6 THEN 'Sarah Miller'
    WHEN ROW_NUMBER() OVER() % 10 = 7 THEN 'Chris Davis'
    WHEN ROW_NUMBER() OVER() % 10 = 8 THEN 'Ashley Garcia'
    WHEN ROW_NUMBER() OVER() % 10 = 9 THEN 'Ryan Martinez'
    ELSE 'Jessica Anderson'
  END,
  'DOC' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
  'A' || ((ROW_NUMBER() OVER() % 10) + 1)
FROM bookings b
WHERE ROW_NUMBER() OVER() <= 50;

-- 7. Insert Booking Modification History (using valid modification types)
INSERT INTO booking_modification_history (id, booking_id, user_id, modification_type, description, changes)
SELECT 
  uuid_generate_v4(),
  b.id,
  COALESCE(b.user_id, '00000000-0000-4000-8000-000000000001'),
  CASE 
    WHEN ROW_NUMBER() OVER() % 3 = 0 THEN 'passenger_info'
    WHEN ROW_NUMBER() OVER() % 3 = 1 THEN 'seat_change'
    ELSE 'contact_info'
  END::booking_modification_history_modification_type_enum,
  'Automated modification record',
  '{"automated": true, "timestamp": "' || NOW()::text || '"}'
FROM bookings b
WHERE ROW_NUMBER() OVER() <= 30;

-- Final Summary Report
SELECT 
  'Database Seeding Complete' AS status,
  NOW() AS completed_at;

SELECT 'Table Name' AS table_name, 'Record Count' AS record_count
UNION ALL
SELECT 'Users', COUNT(*)::text FROM users
UNION ALL
SELECT 'Operators', COUNT(*)::text FROM operators
UNION ALL
SELECT 'Routes', COUNT(*)::text FROM routes
UNION ALL
SELECT 'Buses', COUNT(*)::text FROM buses
UNION ALL
SELECT 'Seat Layouts', COUNT(*)::text FROM seat_layouts
UNION ALL
SELECT 'Seats', COUNT(*)::text FROM seats
UNION ALL
SELECT 'Trips', COUNT(*)::text FROM trips
UNION ALL
SELECT 'Bookings', COUNT(*)::text FROM bookings
UNION ALL
SELECT 'Seat Status', COUNT(*)::text FROM seat_status
UNION ALL
SELECT 'Passenger Details', COUNT(*)::text FROM passenger_details
UNION ALL
SELECT 'Booking Modifications', COUNT(*)::text FROM booking_modification_history;