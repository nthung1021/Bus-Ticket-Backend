import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSampleReviewsAndFeedbacks1767040000000 implements MigrationInterface {
  name = 'AddSampleReviewsAndFeedbacks1767040000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🌟 Adding sample reviews and feedbacks data...');

    // Check if we have required base data
    const tripCount = await queryRunner.query('SELECT COUNT(*) as count FROM trips WHERE status IN (\'completed\', \'in_progress\')');
    const bookingCount = await queryRunner.query('SELECT COUNT(*) as count FROM bookings WHERE status = \'paid\'');
    const userCount = await queryRunner.query('SELECT COUNT(*) as count FROM users WHERE role = \'customer\'');

    console.log(`Found ${tripCount[0].count} trips, ${bookingCount[0].count} bookings, ${userCount[0].count} users`);

    if (parseInt(tripCount[0].count) === 0 || parseInt(bookingCount[0].count) === 0 || parseInt(userCount[0].count) === 0) {
      console.warn('⚠️  Insufficient base data for reviews. Please run the main seed script first.');
      return;
    }

    // Get all eligible bookings for realistic reviews
    const eligibleBookings = await queryRunner.query(`
      SELECT b.id as booking_id, b.user_id, b.trip_id, t.departure_time, t.status as trip_status
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      WHERE b.status = 'paid' 
        AND b.user_id IS NOT NULL
        AND (t.status = 'completed' OR (t.status = 'in_progress' AND t.departure_time < NOW() - INTERVAL '2 hours'))
      ORDER BY t.id, b.booked_at
    `);

    console.log(`Found ${eligibleBookings.length} eligible bookings for reviews`);

    if (eligibleBookings.length === 0) {
      console.warn('⚠️  No eligible bookings found for creating reviews');
      return;
    }

    // Realistic Vietnamese review comments
    const positiveComments = [
      'Tuyệt vời! Xe sạch sẽ, tài xế lái xe rất an toàn. Sẽ đi lại lần sau.',
      'Dịch vụ tốt, nhân viên thân thiện. Ghế ngồi thoải mái, có wifi free.',
      'Xe chạy đúng giờ, không delay. Driver rất careful và professional.',
      'Rất hài lòng với chuyến đi. Xe có điều hòa mát, toilet sạch sẽ.',
      'Recommended! Giá cả hợp lý, chất lượng dịch vụ tốt.',
      'Đi rất êm, không bị say xe. Có nước uống miễn phí nữa.',
      'Nhân viên hỗ trợ nhiệt tình, xe có USB sạc điện thoại tiện lợi.',
      'Chuyến đi an toàn và thoải mái. Sẽ recommend cho bạn bè.',
      'Xe mới, ghế massage rất ok. Tài xế friendly và drive steady.',
      'Good service! On time departure, comfortable seats, clean restroom.',
      'Perfect trip! Smooth ride, excellent customer service.',
      'Xe limousine sang trọng, ghế nằm thoải mái. Worth every penny!',
      'Tài xế rất niềm nở, helpful. Xe chạy an toàn suốt chặng đường.',
      'Excellent experience. Clean bus, punctual, friendly staff.',
      'Chất lượng dịch vụ 5 sao! Xe đẹp, nhân viên professional.',
      'Amazing journey, will definitely book again. Highly recommended!',
      'Xe có wifi nhanh, ghế rộng rãi. Tuyến đường này rất tiện.',
      'Safe and comfortable ride. Driver was very experienced.',
      'Dịch vụ chu đáo, xe sạch sẽ. Giá vé reasonable cho quality này.',
      'Outstanding service! From booking to arrival, everything was perfect.'
    ];

    const averageComments = [
      'Ổn, không có gì đặc biệt. Xe hơi cũ nhưng vẫn chạy được.',
      'Dịch vụ bình thường, giá cả tương đối. Có thể cải thiện thêm.',
      'Xe delay khoảng 15 phút nhưng có thông báo trước. Overall ok.',
      'Ghế ngồi hơi chật đối với người cao. Wifi có lúc chập chờn.',
      'Tài xế lái ổn, nhưng xe hơi lắc. AC không đủ mát.',
      'Dịch vụ acceptable. Nhân viên có thái độ nhưng không quá enthusiastic.',
      'Giá hơi cao so với quality. Toilet không được sạch lắm.',
      'Standard service. Nothing special but gets the job done.',
      'Xe chạy đúng route nhưng có lúc hơi nhanh. Cần cẩn thận hơn.',
      'Average experience. Room for improvement in customer service.',
      'Xe cũ hơn expected nhưng vẫn functional. Driver ok.',
      'Decent trip, không có gì để complain. Just normal service.',
      'Ghế không recline được nhiều. Wifi weak signal một số đoạn.',
      'Acceptable cho giá tiền. Có thể book lại nếu không có lựa chọn khác.',
      'Service ổn, không outstanding nhưng cũng không tệ.'
    ];

    const negativeComments = [
      'Xe delay 1 tiếng không báo trước. Nhân viên thái độ không tốt.',
      'Ghế ngồi không thoải mái, AC hỏng nửa đường. Rất thất vọng.',
      'Tài xế lái hơi bạo, làm mình stress suốt chuyến đi.',
      'Toilet bẩn và hết nước. Service cần cải thiện nhiều.',
      'Xe cũ quá, ghế rách và có mùi khó chịu. Không recommend.',
      'Delay 2 tiếng, không có explanation. Sẽ không đi lại.',
      'Wifi không work, USB port hỏng. Poor maintenance.',
      'Overcrowded và noisy. Không như advertised.',
      'Đắt mà service không tương xứng. Rất disappointed.',
      'Terrible experience! Driver rude, bus dirty and uncomfortable.',
      'Worst trip ever. Xe break down giữa đường, phải đợi 3 tiếng.',
      'Unprofessional staff, dirty restroom, uncomfortable seats.',
      'Không đúng schedule, thái độ staff tệ. Never again!',
      'Overbooked, phải đứng suốt 2 tiếng. Completely unacceptable.',
      'Scam! Xe không như hình, service quality very poor.',
      'Dangerous driving, felt unsafe throughout the journey.',
      'False advertising. Xe cũ nát, không có amenities như quảng cáo.'
    ];

    // Sample feedback data for older feedback system (if still used)
    const feedbackComments = [
      'Cảm ơn công ty đã có chuyến đi tuyệt vời!',
      'Hy vọng sẽ có thêm nhiều chuyến đi tiện lợi.',
      'Dịch vụ tốt, sẽ giới thiệu cho người thân.',
      'Xe sạch sẽ và thoải mái, cảm ơn team.',
      'Professional service, keep it up!',
      'Chuyến đi an toàn và đúng giờ, satisfied.',
      'Good value for money, recommend to others.',
      'Comfortable journey, friendly staff.',
      'Reliable service, will book again.'
    ];

    let reviewCounter = 1;
    let feedbackCounter = 1;
    const reviewValues: string[] = [];
    const feedbackValues: string[] = [];

    // Group bookings by trip to ensure each trip gets adequate reviews
    const bookingsByTrip: Record<string, any[]> = {};
    eligibleBookings.forEach((booking: any) => {
      if (!bookingsByTrip[booking.trip_id]) {
        bookingsByTrip[booking.trip_id] = [];
      }
      bookingsByTrip[booking.trip_id].push(booking);
    });

    console.log(`Grouped bookings into ${Object.keys(bookingsByTrip).length} trips`);

    const bookingsForReview: any[] = [];
    const bookingsForFeedback: any[] = [];

    // Ensure each trip gets at least 3 reviews and 2 feedbacks
    Object.entries(bookingsByTrip).forEach(([tripId, bookings]) => {
      // Shuffle bookings for this trip
      const shuffledBookings = bookings.sort(() => Math.random() - 0.5);
      
      // Take at least 3 for reviews (or all if less than 3)
      const reviewsPerTrip = Math.min(Math.max(3, Math.floor(bookings.length * 0.7)), bookings.length);
      const feedbacksPerTrip = Math.min(Math.max(2, Math.floor(bookings.length * 0.4)), bookings.length - 1);
      
      // Add bookings for reviews
      bookingsForReview.push(...shuffledBookings.slice(0, reviewsPerTrip));
      
      // Add different bookings for feedbacks (some overlap is OK)
      const feedbackStart = Math.floor(reviewsPerTrip * 0.3); // Some overlap
      bookingsForFeedback.push(...shuffledBookings.slice(feedbackStart, feedbackStart + feedbacksPerTrip));
    });

    console.log(`Selected ${bookingsForReview.length} bookings for reviews and ${bookingsForFeedback.length} for feedbacks`);

    for (const booking of bookingsForReview) {
      const reviewId = `90000000-0000-4000-8000-${reviewCounter.toString().padStart(12, '0')}`;
      
      // Create realistic rating distribution
      // 45% excellent (5 stars), 30% good (4 stars), 20% average (3 stars), 5% poor (1-2 stars)
      let rating: number;
      let comment: string;
      const rand = Math.random();
      
      if (rand < 0.45) {
        // 5 stars - excellent
        rating = 5;
        comment = positiveComments[Math.floor(Math.random() * positiveComments.length)];
      } else if (rand < 0.75) {
        // 4 stars - good
        rating = 4;
        comment = Math.random() < 0.8 ? positiveComments[Math.floor(Math.random() * positiveComments.length)] : '';
      } else if (rand < 0.95) {
        // 3 stars - average
        rating = 3;
        comment = Math.random() < 0.7 ? averageComments[Math.floor(Math.random() * averageComments.length)] : '';
      } else {
        // 1-2 stars - poor
        rating = Math.random() < 0.6 ? 1 : 2;
        comment = negativeComments[Math.floor(Math.random() * negativeComments.length)];
      }

      // Create review timestamp (after trip completion, within 30 days)
      const tripTime = new Date(booking.departure_time);
      const reviewTime = new Date(tripTime.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
      
      const commentValue = comment ? `'${comment.replace(/'/g, "''")}'` : 'NULL';
      
      reviewValues.push(`(
        '${reviewId}',
        '${booking.user_id}',
        '${booking.trip_id}',
        '${booking.booking_id}',
        ${rating},
        ${commentValue},
        '${reviewTime.toISOString()}'
      )`);

      reviewCounter++;
    }

    // Create feedbacks using the selected bookings
    for (const booking of bookingsForFeedback) {
      const feedbackId = `95000000-0000-4000-8000-${feedbackCounter.toString().padStart(12, '0')}`;
      
      // Feedbacks tend to be more positive (older system)
      let rating: number;
      let comment: string;
      const rand = Math.random();
      
      if (rand < 0.65) {
        rating = 5;
        comment = feedbackComments[Math.floor(Math.random() * feedbackComments.length)];
      } else if (rand < 0.88) {
        rating = 4;
        comment = Math.random() < 0.6 ? feedbackComments[Math.floor(Math.random() * feedbackComments.length)] : '';
      } else {
        rating = 3;
        comment = Math.random() < 0.4 ? averageComments[Math.floor(Math.random() * averageComments.length)] : '';
      }

      // Create feedback timestamp
      const tripTime = new Date(booking.departure_time);
      const feedbackTime = new Date(tripTime.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000);
      
      const commentValue = comment ? `'${comment.replace(/'/g, "''")}'` : 'NULL';
      
      feedbackValues.push(`(
        '${feedbackId}',
        '${booking.user_id}',
        '${booking.trip_id}',
        ${rating},
        ${commentValue},
        '${feedbackTime.toISOString()}'
      )`);

      feedbackCounter++;
    }

    // Insert reviews
    if (reviewValues.length > 0) {
      console.log(`📝 Inserting ${reviewValues.length} sample reviews...`);
      await queryRunner.query(`
        INSERT INTO reviews (id, user_id, trip_id, booking_id, rating, comment, created_at) 
        VALUES ${reviewValues.join(',\n')}
      `);
    }

    // Insert feedbacks
    if (feedbackValues.length > 0) {
      console.log(`💭 Inserting ${feedbackValues.length} sample feedbacks...`);
      await queryRunner.query(`
        INSERT INTO feedbacks (id, user_id, trip_id, rating, comment, submitted_at) 
        VALUES ${feedbackValues.join(',\n')}
      `);
    }

    // Create some sample statistics
    console.log('📊 Generating sample review statistics...');
    
    // Get top rated trips (buses)
    const topRatedTrips = await queryRunner.query(`
      SELECT 
        t.id,
        r.name as route_name,
        t.departure_time,
        t.arrival_time,
        b.plate_number as bus_plate,
        b.model as bus_model,
        COUNT(rev.id) as review_count,
        ROUND(AVG(rev.rating::decimal), 2) as avg_rating
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN buses b ON t.bus_id = b.id
      LEFT JOIN reviews rev ON t.id = rev.trip_id
      WHERE rev.id IS NOT NULL
      GROUP BY t.id, r.name, t.departure_time, t.arrival_time, b.plate_number, b.model
      HAVING COUNT(rev.id) >= 2
      ORDER BY AVG(rev.rating::decimal) DESC, COUNT(rev.id) DESC
      LIMIT 5
    `);

    if (topRatedTrips.length > 0) {
      console.log('🏆 Top rated trips (buses):');
      topRatedTrips.forEach((trip: any) => {
        const departureTime = new Date(trip.departure_time).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log(`   🚌 ${trip.bus_plate} (${trip.bus_model}): ${trip.avg_rating}/5.0 (${trip.review_count} reviews)`);
        console.log(`      📍 Route: ${trip.route_name}`);
        console.log(`      🕒 Departure: ${departureTime}`);
      });
    }

    // Get rating distribution
    const ratingDistribution = await queryRunner.query(`
      SELECT rating, COUNT(*) as count
      FROM reviews
      GROUP BY rating
      ORDER BY rating DESC
    `);

    if (ratingDistribution.length > 0) {
      console.log('⭐ Rating distribution:');
      ratingDistribution.forEach((row: any) => {
        const stars = '★'.repeat(row.rating) + '☆'.repeat(5 - row.rating);
        console.log(`   ${stars} (${row.rating}): ${row.count} reviews`);
      });
    }

    console.log('✅ Sample reviews and feedbacks data added successfully!');
    console.log(`   📝 Created ${reviewValues.length} reviews`);
    console.log(`   💭 Created ${feedbackValues.length} feedbacks`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🧹 Removing sample reviews and feedbacks data...');
    
    // Remove sample data (keeping any manually created reviews)
    await queryRunner.query(`
      DELETE FROM reviews 
      WHERE id::text LIKE '90000000-0000-4000-8000-%'
    `);

    await queryRunner.query(`
      DELETE FROM feedbacks 
      WHERE id::text LIKE '95000000-0000-4000-8000-%'
    `);

    console.log('✅ Sample reviews and feedbacks data removed');
  }
}