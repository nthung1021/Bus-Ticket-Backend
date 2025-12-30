import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// Create DataSource
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'admin',
  database: process.env.DB_NAME || 'awad_bus_booking_user_login',
  extra: {
    ssl: process.env.DB_SSL === 'true' || 
         process.env.NODE_ENV === 'production' || 
         process.env.NODE_ENV === 'staging' ? {
      rejectUnauthorized: false,
    } : false,
  },
});

async function testSampleData() {
  console.log('🧪 Testing Reviews & Feedbacks Sample Data...\n');
  
  try {
    await dataSource.initialize();
    console.log('🔌 Connected to database\n');

    // 1. Test Reviews
    console.log('📝 REVIEWS ANALYSIS:');
    console.log('=' .repeat(50));
    
    const reviewStats = await dataSource.query(`
      SELECT 
        COUNT(*) as total_reviews,
        COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as with_comments,
        ROUND(AVG(rating::decimal), 2) as avg_rating,
        MIN(rating) as min_rating,
        MAX(rating) as max_rating,
        COUNT(DISTINCT user_id) as unique_reviewers,
        COUNT(DISTINCT trip_id) as reviewed_trips
      FROM reviews
    `);

    if (reviewStats.length > 0) {
      const stats = reviewStats[0];
      console.log(`📊 Total Reviews: ${stats.total_reviews}`);
      console.log(`💬 With Comments: ${stats.with_comments} (${Math.round(stats.with_comments/stats.total_reviews*100)}%)`);
      console.log(`⭐ Average Rating: ${stats.avg_rating}/5.0`);
      console.log(`📈 Rating Range: ${stats.min_rating} - ${stats.max_rating} stars`);
      console.log(`👥 Unique Reviewers: ${stats.unique_reviewers}`);
      console.log(`🚌 Reviewed Trips: ${stats.reviewed_trips}`);
    }

    // Rating distribution
    const ratingDist = await dataSource.query(`
      SELECT 
        rating,
        COUNT(*) as count,
        ROUND(COUNT(*)::decimal / (SELECT COUNT(*) FROM reviews) * 100, 1) as percentage
      FROM reviews
      GROUP BY rating
      ORDER BY rating DESC
    `);

    if (ratingDist.length > 0) {
      console.log(`\n⭐ Rating Distribution:`);
      ratingDist.forEach((row: any) => {
        const stars = '★'.repeat(row.rating) + '☆'.repeat(5 - row.rating);
        const bar = '█'.repeat(Math.round(row.percentage / 5));
        console.log(`   ${stars} (${row.rating}): ${row.count} reviews (${row.percentage}%) ${bar}`);
      });
    }

    // Sample reviews
    const sampleReviews = await dataSource.query(`
      SELECT 
        r.rating,
        r.comment,
        u.name as user_name,
        rt.name as route_name,
        r.created_at
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN trips t ON r.trip_id = t.id
      JOIN routes rt ON t.route_id = rt.id
      WHERE r.comment IS NOT NULL
      ORDER BY r.created_at DESC
      LIMIT 3
    `);

    if (sampleReviews.length > 0) {
      console.log(`\n💬 Sample Reviews:`);
      sampleReviews.forEach((review: any, index: number) => {
        console.log(`\n${index + 1}. ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} - ${review.user_name}`);
        console.log(`   Route: ${review.route_name}`);
        console.log(`   "${review.comment}"`);
        console.log(`   Date: ${new Date(review.created_at).toLocaleDateString('vi-VN')}`);
      });
    }

    // 2. Test Feedbacks
    console.log('\n\n💭 FEEDBACKS ANALYSIS:');
    console.log('=' .repeat(50));
    
    const feedbackStats = await dataSource.query(`
      SELECT 
        COUNT(*) as total_feedbacks,
        COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as with_comments,
        ROUND(AVG(rating::decimal), 2) as avg_rating,
        MIN(rating) as min_rating,
        MAX(rating) as max_rating,
        COUNT(DISTINCT user_id) as unique_feedback_users,
        COUNT(DISTINCT trip_id) as feedback_trips
      FROM feedbacks
    `);

    if (feedbackStats.length > 0) {
      const stats = feedbackStats[0];
      console.log(`📊 Total Feedbacks: ${stats.total_feedbacks}`);
      console.log(`💬 With Comments: ${stats.with_comments} (${Math.round(stats.with_comments/stats.total_feedbacks*100)}%)`);
      console.log(`⭐ Average Rating: ${stats.avg_rating}/5.0`);
      console.log(`📈 Rating Range: ${stats.min_rating} - ${stats.max_rating} stars`);
      console.log(`👥 Unique Users: ${stats.unique_feedback_users}`);
      console.log(`🚌 Feedback Trips: ${stats.feedback_trips}`);
    }

    // 3. Test Top Rated Trips (Buses)
    console.log('\n\n🏆 TOP RATED TRIPS (BUSES):');
    console.log('=' .repeat(50));
    
    const topTrips = await dataSource.query(`
      SELECT 
        t.id as trip_id,
        r.name as route_name,
        t.departure_time,
        b.plate_number as bus_plate,
        b.model as bus_model,
        COUNT(rev.id) as review_count,
        ROUND(AVG(rev.rating::decimal), 2) as avg_rating,
        COUNT(f.id) as feedback_count,
        ROUND(AVG(f.rating::decimal), 2) as avg_feedback_rating
      FROM trips t
      JOIN routes r ON t.route_id = r.id
      JOIN buses b ON t.bus_id = b.id
      LEFT JOIN reviews rev ON t.id = rev.trip_id
      LEFT JOIN feedbacks f ON t.id = f.trip_id
      WHERE (rev.id IS NOT NULL OR f.id IS NOT NULL)
      GROUP BY t.id, r.name, t.departure_time, b.plate_number, b.model
      HAVING COUNT(rev.id) >= 1 OR COUNT(f.id) >= 1
      ORDER BY 
        COALESCE(AVG(rev.rating::decimal), 0) DESC,
        COUNT(rev.id) + COUNT(f.id) DESC
      LIMIT 10
    `);

    if (topTrips.length > 0) {
      topTrips.forEach((trip: any, index: number) => {
        const departureTime = new Date(trip.departure_time).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric', 
          hour: '2-digit',
          minute: '2-digit'
        });
        console.log(`${index + 1}. 🚌 ${trip.bus_plate} (${trip.bus_model})`);
        console.log(`   📍 Route: ${trip.route_name}`);
        console.log(`   🕒 Departure: ${departureTime}`);
        console.log(`   📝 Reviews: ${trip.review_count || 0} (avg: ${trip.avg_rating || 'N/A'})`);
        console.log(`   💭 Feedbacks: ${trip.feedback_count || 0} (avg: ${trip.avg_feedback_rating || 'N/A'})`);
      });
    }

    // 4. Test Data Integrity
    console.log('\n\n🔍 DATA INTEGRITY CHECKS:');
    console.log('=' .repeat(50));
    
    // Check for orphaned reviews
    const orphanedReviews = await dataSource.query(`
      SELECT COUNT(*) as count FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN trips t ON r.trip_id = t.id
      LEFT JOIN bookings b ON r.booking_id = b.id
      WHERE u.id IS NULL OR t.id IS NULL OR b.id IS NULL
    `);
    
    console.log(`🔗 Orphaned Reviews: ${orphanedReviews[0].count} (should be 0)`);

    // Check for duplicate reviews per booking
    const duplicateReviews = await dataSource.query(`
      SELECT booking_id, COUNT(*) as count
      FROM reviews
      GROUP BY booking_id
      HAVING COUNT(*) > 1
    `);
    
    console.log(`📋 Duplicate Reviews per Booking: ${duplicateReviews.length} (should be 0)`);

    // Check rating range validation
    const invalidRatings = await dataSource.query(`
      SELECT 
        (SELECT COUNT(*) FROM reviews WHERE rating < 1 OR rating > 5) as invalid_reviews,
        (SELECT COUNT(*) FROM feedbacks WHERE rating < 1 OR rating > 5) as invalid_feedbacks
    `);
    
    console.log(`⭐ Invalid Ratings: Reviews=${invalidRatings[0].invalid_reviews}, Feedbacks=${invalidRatings[0].invalid_feedbacks} (both should be 0)`);

    // 5. Test API-like queries
    console.log('\n\n🔧 API QUERY TESTS:');
    console.log('=' .repeat(50));
    
    // Test getting reviews for a specific trip
    const tripReviewsTest = await dataSource.query(`
      SELECT 
        r.id, r.rating, r.comment,
        u.name as user_name,
        r.created_at
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.trip_id = (SELECT id FROM reviews LIMIT 1 OFFSET 0)
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    
    console.log(`📱 Trip Reviews Query: Found ${tripReviewsTest.length} reviews for sample trip`);

    // Test getting user's reviews
    const userReviewsTest = await dataSource.query(`
      SELECT 
        r.id, r.rating, r.comment,
        rt.name as route_name,
        r.created_at
      FROM reviews r
      JOIN trips t ON r.trip_id = t.id
      JOIN routes rt ON t.route_id = rt.id
      WHERE r.user_id = (SELECT user_id FROM reviews LIMIT 1)
      ORDER BY r.created_at DESC
      LIMIT 5
    `);
    
    console.log(`👤 User Reviews Query: Found ${userReviewsTest.length} reviews for sample user`);

    // Test stats query
    const statsTest = await dataSource.query(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating::decimal), 2) as average_rating,
        json_build_object(
          '5', COUNT(CASE WHEN rating = 5 THEN 1 END),
          '4', COUNT(CASE WHEN rating = 4 THEN 1 END),
          '3', COUNT(CASE WHEN rating = 3 THEN 1 END),
          '2', COUNT(CASE WHEN rating = 2 THEN 1 END),
          '1', COUNT(CASE WHEN rating = 1 THEN 1 END)
        ) as rating_distribution
      FROM reviews
      WHERE trip_id = (SELECT trip_id FROM reviews GROUP BY trip_id HAVING COUNT(*) > 1 LIMIT 1)
    `);
    
    if (statsTest.length > 0) {
      console.log(`📊 Stats Query: ${statsTest[0].total_reviews} reviews, avg ${statsTest[0].average_rating}`);
      console.log(`📈 Distribution: ${JSON.stringify(statsTest[0].rating_distribution)}`);
    }

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('\n👋 Database connection closed');
  }
}

// Run tests
if (require.main === module) {
  testSampleData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testSampleData };