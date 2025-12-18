-- Simple Working Database Seeding Script
-- Adds realistic test data to all tables

-- 1. Add more trips using a simpler approach
DO $$
DECLARE
    route_rec RECORD;
    bus_rec RECORD;
    counter INT := 0;
BEGIN
    FOR route_rec IN SELECT id FROM routes LIMIT 15 LOOP
        FOR bus_rec IN SELECT id FROM buses LIMIT 3 LOOP
            counter := counter + 1;
            INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, base_price, status) 
            VALUES (
                uuid_generate_v4(),
                route_rec.id,
                bus_rec.id,
                NOW() + INTERVAL '1 day' * (counter % 30 + 1),
                NOW() + INTERVAL '1 day' * (counter % 30 + 1) + INTERVAL '6 hours',
                8000 + (counter % 50) * 100,
                CASE 
                    WHEN counter % 10 = 0 THEN 'cancelled'::trips_status_enum
                    WHEN counter % 5 = 0 THEN 'completed'::trips_status_enum
                    ELSE 'scheduled'::trips_status_enum
                END
            );
            EXIT WHEN counter >= 25;
        END LOOP;
        EXIT WHEN counter >= 25;
    END LOOP;
END $$;

-- 2. Add more bookings
DO $$
DECLARE
    user_rec RECORD;
    trip_rec RECORD;
    counter INT := 0;
BEGIN
    FOR user_rec IN SELECT id, email, phone FROM users WHERE role = 'customer' AND id NOT IN (SELECT user_id FROM bookings WHERE user_id IS NOT NULL) LOOP
        SELECT id INTO trip_rec FROM trips ORDER BY RANDOM() LIMIT 1;
        counter := counter + 1;
        
        INSERT INTO bookings (id, user_id, trip_id, booking_reference, total_amount, status, contact_email, contact_phone)
        VALUES (
            uuid_generate_v4(),
            user_rec.id,
            trip_rec.id,
            'BK' || EXTRACT(YEAR FROM NOW())::text || LPAD(EXTRACT(MONTH FROM NOW())::text, 2, '0') || LPAD(EXTRACT(DAY FROM NOW())::text, 2, '0') || LPAD((counter + 100)::text, 3, '0'),
            8000 + (counter % 50) * 500,
            CASE 
                WHEN counter % 10 = 0 THEN 'pending'::bookings_status_enum
                WHEN counter % 8 = 0 THEN 'cancelled'::bookings_status_enum
                WHEN counter % 6 = 0 THEN 'expired'::bookings_status_enum
                ELSE 'paid'::bookings_status_enum
            END,
            user_rec.email,
            user_rec.phone
        );
        
        EXIT WHEN counter >= 30;
    END LOOP;
END $$;

-- 3. Add seat status for existing trips and seats
DO $$
DECLARE
    trip_rec RECORD;
    seat_rec RECORD;
    booking_rec RECORD;
    counter INT := 0;
BEGIN
    FOR trip_rec IN SELECT id, bus_id FROM trips LIMIT 10 LOOP
        FOR seat_rec IN SELECT id, seat_code FROM seats WHERE bus_id = trip_rec.bus_id LIMIT 10 LOOP
            counter := counter + 1;
            
            -- Get random booking for this trip (if exists)
            SELECT id INTO booking_rec FROM bookings WHERE trip_id = trip_rec.id ORDER BY RANDOM() LIMIT 1;
            
            INSERT INTO seat_status (id, trip_id, seat_id, seat_code, booking_id, state)
            VALUES (
                uuid_generate_v4(),
                trip_rec.id,
                seat_rec.id,
                seat_rec.seat_code,
                CASE WHEN counter % 3 = 0 THEN NULL ELSE booking_rec.id END,
                CASE WHEN counter % 3 = 0 THEN 'available'::seat_status_state_enum ELSE 'booked'::seat_status_state_enum END
            );
            
            EXIT WHEN counter >= 80;
        END LOOP;
        EXIT WHEN counter >= 80;
    END LOOP;
END $$;

-- 4. Add passenger details for existing bookings
DO $$
DECLARE
    booking_rec RECORD;
    counter INT := 0;
    passenger_names TEXT[] := ARRAY['John Doe', 'Jane Smith', 'Michael Brown', 'Emily Johnson', 'David Wilson', 'Sarah Miller', 'Chris Davis', 'Ashley Garcia', 'Ryan Martinez', 'Jessica Anderson'];
BEGIN
    FOR booking_rec IN SELECT id FROM bookings LIMIT 25 LOOP
        counter := counter + 1;
        
        INSERT INTO passenger_details (id, booking_id, full_name, document_id, seat_code)
        VALUES (
            uuid_generate_v4(),
            booking_rec.id,
            passenger_names[(counter % array_length(passenger_names, 1)) + 1],
            'DOC' || LPAD(counter::text, 6, '0'),
            'A' || ((counter % 10) + 1)
        );
    END LOOP;
END $$;

-- 5. Add booking modification history
DO $$
DECLARE
    booking_rec RECORD;
    counter INT := 0;
    mod_types booking_modification_history_modification_type_enum[] := ARRAY['passenger_info', 'seat_change', 'contact_info'];
BEGIN
    FOR booking_rec IN SELECT id, user_id FROM bookings LIMIT 20 LOOP
        counter := counter + 1;
        
        INSERT INTO booking_modification_history (id, booking_id, user_id, modification_type, description, changes)
        VALUES (
            uuid_generate_v4(),
            booking_rec.id,
            COALESCE(booking_rec.user_id, '00000000-0000-4000-8000-000000000001'),
            mod_types[(counter % array_length(mod_types, 1)) + 1],
            'Automated modification record #' || counter,
            ('{"automated": true, "timestamp": "' || NOW()::text || '", "counter": ' || counter || '}')::jsonb
        );
    END LOOP;
END $$;

-- Final Summary Report
SELECT 'Database Seeding Complete - All Tables Populated' AS status;

SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'operators', COUNT(*) FROM operators
UNION ALL
SELECT 'routes', COUNT(*) FROM routes
UNION ALL
SELECT 'buses', COUNT(*) FROM buses
UNION ALL
SELECT 'seat_layouts', COUNT(*) FROM seat_layouts
UNION ALL
SELECT 'seats', COUNT(*) FROM seats
UNION ALL
SELECT 'trips', COUNT(*) FROM trips
UNION ALL
SELECT 'bookings', COUNT(*) FROM bookings
UNION ALL
SELECT 'seat_status', COUNT(*) FROM seat_status
UNION ALL
SELECT 'passenger_details', COUNT(*) FROM passenger_details
UNION ALL
SELECT 'booking_modification_history', COUNT(*) FROM booking_modification_history
ORDER BY table_name;