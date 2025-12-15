-- Corrected Database Seeding Script Part 2 - Remaining Tables
-- Execute this after part 1 with correct column names

-- 5. Insert Seat Layouts (40 records - one per bus)
INSERT INTO seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing) VALUES
('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'standard_2x2', 12, 2, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "aisle"}]}]}', '{"window": 45.00, "aisle": 40.00}'),
('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'standard_2x2', 16, 2, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "aisle"}]}]}', '{"window": 50.00, "aisle": 45.00}'),
('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'economy_3x2', 15, 5, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "middle"}, {"position": "C", "type": "aisle"}]}]}', '{"window": 40.00, "middle": 35.00, "aisle": 38.00}'),
('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'economy_3x2', 18, 5, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "middle"}, {"position": "C", "type": "aisle"}]}]}', '{"window": 42.00, "middle": 37.00, "aisle": 40.00}'),
('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'standard_2x2', 12, 2, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "aisle"}]}]}', '{"window": 35.00, "aisle": 32.00}'),
('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 'standard_2x2', 16, 2, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "aisle"}]}]}', '{"window": 48.00, "aisle": 43.00}'),
('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000007', 'economy_3x2', 15, 5, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "middle"}, {"position": "C", "type": "aisle"}]}]}', '{"window": 52.00, "middle": 47.00, "aisle": 50.00}'),
('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000008', 'economy_3x2', 18, 5, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "middle"}, {"position": "C", "type": "aisle"}]}]}', '{"window": 55.00, "middle": 50.00, "aisle": 53.00}'),
('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000009', 'standard_2x2', 12, 2, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "aisle"}]}]}', '{"window": 38.00, "aisle": 35.00}'),
('40000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000010', 'standard_2x2', 16, 2, '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "aisle"}]}]}', '{"window": 44.00, "aisle": 41.00}');

-- Continue with simplified seat layouts for other buses...
INSERT INTO seat_layouts (id, bus_id, "layoutType", total_rows, seats_per_row, layout_config, seat_pricing) 
SELECT 
  '40000000-0000-4000-8000-0000000000' || LPAD((ROW_NUMBER() OVER() + 10)::text, 2, '0'),
  bus_id,
  CASE WHEN seat_capacity <= 30 THEN 'standard_2x2'::seat_layouts_layouttype_enum ELSE 'economy_3x2'::seat_layouts_layouttype_enum END,
  CASE WHEN seat_capacity <= 30 THEN seat_capacity / 2 ELSE seat_capacity / 5 END,
  CASE WHEN seat_capacity <= 30 THEN 2 ELSE 5 END,
  '{"rows": [{"row": 1, "seats": [{"position": "A", "type": "window"}, {"position": "B", "type": "aisle"}]}]}',
  '{"window": 40.00, "aisle": 37.00}'
FROM buses 
WHERE id NOT IN (
  SELECT bus_id FROM seat_layouts
);

-- 6. Insert Seats (sample seats for first 10 buses)
INSERT INTO seats (id, bus_id, seat_code, "seatType") VALUES
-- Bus 1 (24 seats)
('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'A1', 'window'),
('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'A2', 'window'),
('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'A3', 'window'),
('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'A4', 'window'),
('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 'B1', 'normal'),
('50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 'B2', 'normal'),
('50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000001', 'B3', 'normal'),
('50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000001', 'B4', 'normal'),
-- Bus 2 (32 seats)
('50000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000002', 'A1', 'window'),
('50000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000002', 'A2', 'window'),
('50000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000002', 'A3', 'window'),
('50000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000002', 'B1', 'normal'),
('50000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000002', 'B2', 'normal'),
('50000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000002', 'B3', 'normal'),
('50000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000002', 'C1', 'normal'),
('50000000-0000-4000-8000-000000000016', '30000000-0000-4000-8000-000000000002', 'C2', 'normal');

-- Generate more seats for all buses (simplified approach)
INSERT INTO seats (id, bus_id, seat_code, "seatType")
SELECT 
  uuid_generate_v4(),
  b.id,
  'A' || ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY b.id),
  'normal'
FROM buses b
CROSS JOIN generate_series(1, 20) AS seat_num
WHERE b.id NOT IN (
  SELECT DISTINCT bus_id FROM seats
);

-- 7. Insert Trips (60 records with various schedules and corrected status values)
INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status) VALUES
('60000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '375 minutes', 7500, 'scheduled'),
('60000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', NOW() + INTERVAL '2 days', NOW() + INTERVAL '2 days' + INTERVAL '675 minutes', 9500, 'scheduled'),
('60000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', NOW() + INTERVAL '3 days', NOW() + INTERVAL '3 days' + INTERVAL '480 minutes', 8500, 'scheduled'),
('60000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', NOW() + INTERVAL '4 days', NOW() + INTERVAL '4 days' + INTERVAL '570 minutes', 10500, 'scheduled'),
('60000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days' + INTERVAL '630 minutes', 11500, 'scheduled'),
('60000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '375 minutes', 7500, 'completed'),
('60000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000007', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days' + INTERVAL '675 minutes', 9500, 'completed'),
('60000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000008', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '480 minutes', 8500, 'completed'),
('60000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000009', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '570 minutes', 10500, 'completed'),
('60000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000010', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '630 minutes', 11500, 'in_progress'),
('60000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000011', NOW() + INTERVAL '6 days', NOW() + INTERVAL '6 days' + INTERVAL '435 minutes', 8800, 'scheduled'),
('60000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000012', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '540 minutes', 9200, 'scheduled'),
('60000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000013', NOW() + INTERVAL '8 days', NOW() + INTERVAL '8 days' + INTERVAL '720 minutes', 12500, 'scheduled'),
('60000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000014', NOW() + INTERVAL '9 days', NOW() + INTERVAL '9 days' + INTERVAL '510 minutes', 9800, 'scheduled'),
('60000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000015', NOW() + INTERVAL '10 days', NOW() + INTERVAL '10 days' + INTERVAL '765 minutes', 13500, 'scheduled'),
('60000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000016', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '420 minutes', 7800, 'completed'),
('60000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000017', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days' + INTERVAL '585 minutes', 10200, 'completed'),
('60000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000018', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days' + INTERVAL '660 minutes', 11800, 'completed'),
('60000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000019', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '405 minutes', 8200, 'completed'),
('60000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000020', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days' + INTERVAL '780 minutes', 14500, 'cancelled');

-- Continue with additional trips (simplified for brevity)
INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status)
SELECT 
  uuid_generate_v4(),
  r.id,
  b.id,
  NOW() + INTERVAL '1 day' * (ROW_NUMBER() OVER() % 30 + 1),
  NOW() + INTERVAL '1 day' * (ROW_NUMBER() OVER() % 30 + 1) + INTERVAL '6 hours',
  8000 + (ROW_NUMBER() OVER() % 50) * 100,
  'scheduled'
FROM routes r
CROSS JOIN buses b
WHERE ROW_NUMBER() OVER() <= 40
AND NOT EXISTS (
  SELECT 1 FROM trips t WHERE t.route_id = r.id AND t.bus_id = b.id
);

-- 8. Insert Bookings (100 records with corrected column names)
INSERT INTO bookings (id, user_id, trip_id, booking_reference, total_amount, status, contact_email, contact_phone) VALUES
('70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000001', 'BK240101001', 15000, 'confirmed', 'user6@example.com', '+15550000006'),
('70000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000002', 'BK240101002', 9500, 'confirmed', 'user7@example.com', '+15550000007'),
('70000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000008', '60000000-0000-4000-8000-000000000003', 'BK240101003', 25500, 'pending', 'user8@example.com', '+15550000008'),
('70000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000009', '60000000-0000-4000-8000-000000000004', 'BK240101004', 10500, 'confirmed', 'user9@example.com', '+15550000009'),
('70000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000005', 'BK240101005', 23000, 'confirmed', 'user10@example.com', '+15550000010'),
('70000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000011', '60000000-0000-4000-8000-000000000006', 'BK240101006', 7500, 'confirmed', 'user11@example.com', '+15550000011'),
('70000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-000000000012', '60000000-0000-4000-8000-000000000007', 'BK240101007', 19000, 'confirmed', 'user12@example.com', '+15550000012'),
('70000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000013', '60000000-0000-4000-8000-000000000008', 'BK240101008', 8500, 'confirmed', 'user13@example.com', '+15550000013'),
('70000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000014', '60000000-0000-4000-8000-000000000009', 'BK240101009', 31500, 'confirmed', 'user14@example.com', '+15550000014'),
('70000000-0000-4000-8000-000000000010', '00000000-0000-4000-8000-000000000015', '60000000-0000-4000-8000-000000000010', 'BK240101010', 11500, 'confirmed', 'user15@example.com', '+15550000015'),
('70000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000016', '60000000-0000-4000-8000-000000000011', 'BK240101011', 17600, 'confirmed', 'user16@example.com', '+15550000016'),
('70000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000017', '60000000-0000-4000-8000-000000000012', 'BK240101012', 9200, 'confirmed', 'user17@example.com', '+15550000017'),
('70000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000018', '60000000-0000-4000-8000-000000000013', 'BK240101013', 50000, 'pending', 'user18@example.com', '+15550000018'),
('70000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000019', '60000000-0000-4000-8000-000000000014', 'BK240101014', 9800, 'confirmed', 'user19@example.com', '+15550000019'),
('70000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000020', '60000000-0000-4000-8000-000000000015', 'BK240101015', 27000, 'confirmed', 'user20@example.com', '+15550000020');

-- Add more bookings (simplified approach)
INSERT INTO bookings (id, user_id, trip_id, booking_reference, total_amount, status, contact_email, contact_phone)
SELECT 
  uuid_generate_v4(),
  u.id,
  t.id,
  'BK' || EXTRACT(YEAR FROM NOW())::text || LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || LPAD((ROW_NUMBER() OVER() + 15)::text, 3, '0'),
  t.base_price + (ROW_NUMBER() OVER() % 10) * 500,
  CASE 
    WHEN ROW_NUMBER() OVER() % 10 = 0 THEN 'pending'
    WHEN ROW_NUMBER() OVER() % 8 = 0 THEN 'cancelled'
    ELSE 'confirmed'
  END,
  u.email,
  u.phone
FROM users u
CROSS JOIN trips t
WHERE u.role = 'customer'
AND ROW_NUMBER() OVER() <= 85;

-- 9. Sample Seat Status (200 records with corrected column names)
INSERT INTO seat_status (id, trip_id, seat_id, booking_id, seat_status) VALUES
-- Trip 1 seats
('80000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'booked'),
('80000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000001', 'booked'),
('80000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', NULL, 'available'),
('80000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000003', NULL, 'available'),
-- Trip 2 seats  
('80000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000009', '70000000-0000-4000-8000-000000000002', 'booked'),
('80000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000010', NULL, 'available'),
('80000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000011', NULL, 'available');

-- Generate more seat status entries
INSERT INTO seat_status (id, trip_id, seat_id, booking_id, seat_status)
SELECT 
  uuid_generate_v4(),
  t.id,
  s.id,
  CASE WHEN ROW_NUMBER() OVER() % 4 = 0 THEN NULL ELSE b.id END,
  CASE WHEN ROW_NUMBER() OVER() % 4 = 0 THEN 'available' ELSE 'booked' END
FROM trips t
CROSS JOIN seats s
LEFT JOIN bookings b ON b.trip_id = t.id
WHERE s.bus_id = t.bus_id
AND ROW_NUMBER() OVER() <= 200;

-- 10. Sample Passenger Details (150 records with corrected column names)
INSERT INTO passenger_details (id, booking_id, "fullName", age, gender, document_type, document_number) VALUES
('90000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'Sarah Johnson', 32, 'female', 'passport', 'P12345678'),
('90000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000001', 'Mike Johnson', 34, 'male', 'drivers_license', 'DL987654'),
('90000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000002', 'David Brown', 28, 'male', 'passport', 'P23456789'),
('90000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000003', 'Lisa Garcia', 25, 'female', 'drivers_license', 'DL876543'),
('90000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000003', 'Robert Miller', 29, 'male', 'passport', 'P34567890'),
('90000000-0000-4000-8000-000000000006', '70000000-0000-4000-8000-000000000003', 'Emma Davis', 31, 'female', 'drivers_license', 'DL765432'),
('90000000-0000-4000-8000-000000000007', '70000000-0000-4000-8000-000000000004', 'James Rodriguez', 38, 'male', 'passport', 'P45678901'),
('90000000-0000-4000-8000-000000000008', '70000000-0000-4000-8000-000000000005', 'Anna Martinez', 26, 'female', 'drivers_license', 'DL654321'),
('90000000-0000-4000-8000-000000000009', '70000000-0000-4000-8000-000000000005', 'Kevin Lee', 33, 'male', 'passport', 'P56789012'),
('90000000-0000-4000-8000-000000000010', '70000000-0000-4000-8000-000000000006', 'Michelle Taylor', 27, 'female', 'drivers_license', 'DL543210');

-- Add more passenger details for existing bookings
INSERT INTO passenger_details (id, booking_id, "fullName", age, gender, document_type, document_number)
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
  20 + (ROW_NUMBER() OVER() % 40),
  CASE WHEN ROW_NUMBER() OVER() % 2 = 0 THEN 'male' ELSE 'female' END,
  CASE WHEN ROW_NUMBER() OVER() % 3 = 0 THEN 'passport' ELSE 'drivers_license' END,
  'DOC' || LPAD((ROW_NUMBER() OVER())::text, 6, '0')
FROM bookings b
WHERE ROW_NUMBER() OVER() <= 140;

-- 11. Sample Booking Modification History (80 records with corrected column names)
INSERT INTO booking_modification_history (id, booking_id, user_id, modification_type, changes) VALUES
('A0000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006', 'seat_change', '{"old_seats": ["A1", "A2"], "new_seats": ["A1", "B1"], "reason": "Customer preference"}'),
('A0000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000007', 'passenger_info_update', '{"field": "phone", "old_value": "+15550000007", "new_value": "+15550000077"}'),
('A0000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001', 'status_change', '{"old_status": "pending", "new_status": "confirmed", "reason": "Payment processed"}'),
('A0000000-0000-4000-8000-000000000004', '70000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'cancellation', '{"reason": "Customer request", "refund_amount": 50000, "cancellation_fee": 0}'),
('A0000000-0000-4000-8000-000000000005', '70000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000018', 'passenger_addition', '{"added_passenger": {"name": "John Doe Jr", "age": 8, "document": "birth_certificate"}}');

-- Add more modification history entries
INSERT INTO booking_modification_history (id, booking_id, user_id, modification_type, changes)
SELECT 
  uuid_generate_v4(),
  b.id,
  COALESCE(b.user_id, '00000000-0000-4000-8000-000000000001'),
  CASE 
    WHEN ROW_NUMBER() OVER() % 4 = 0 THEN 'status_change'
    WHEN ROW_NUMBER() OVER() % 4 = 1 THEN 'passenger_info_update'
    WHEN ROW_NUMBER() OVER() % 4 = 2 THEN 'seat_change'
    ELSE 'contact_update'
  END,
  '{"automated": true, "timestamp": "' || NOW()::text || '"}'
FROM bookings b
WHERE ROW_NUMBER() OVER() <= 75;

-- Summary report
SELECT 'Users' AS table_name, COUNT(*) AS record_count FROM users
UNION ALL
SELECT 'Operators', COUNT(*) FROM operators
UNION ALL
SELECT 'Routes', COUNT(*) FROM routes
UNION ALL
SELECT 'Buses', COUNT(*) FROM buses
UNION ALL
SELECT 'Seat Layouts', COUNT(*) FROM seat_layouts
UNION ALL
SELECT 'Seats', COUNT(*) FROM seats
UNION ALL
SELECT 'Trips', COUNT(*) FROM trips
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'Seat Status', COUNT(*) FROM seat_status
UNION ALL
SELECT 'Passenger Details', COUNT(*) FROM passenger_details
UNION ALL
SELECT 'Booking Modifications', COUNT(*) FROM booking_modification_history;