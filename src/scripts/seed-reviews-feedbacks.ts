import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { AddSampleReviewsAndFeedbacks1767040000000 } from '../migrations/1767040000000-AddSampleReviewsAndFeedbacks';

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
  entities: ['src/entities/**/*.ts'],
  migrations: ['src/migrations/**/*.ts'],
  extra: {
    ssl: process.env.DB_SSL === 'true' || 
         process.env.NODE_ENV === 'production' || 
         process.env.NODE_ENV === 'staging' ? {
      rejectUnauthorized: false,
    } : false,
  },
});

async function seedReviewsAndFeedbacks() {
  console.log('🚀 Starting reviews and feedbacks seeding...');
  
  try {
    await dataSource.initialize();
    console.log('🔌 Connected to database');

    // Check if migration has already been run
    const existingReviews = await dataSource.query(`
      SELECT COUNT(*) as count FROM reviews WHERE id LIKE '90000000-0000-4000-8000-%'
    `);
    
    if (parseInt(existingReviews[0].count) > 0) {
      console.log('🔄 Sample reviews already exist. Do you want to refresh them? (y/N)');
      
      const migration = new AddSampleReviewsAndFeedbacks1767040000000();
      
      // Remove existing sample data
      console.log('🧹 Removing existing sample data...');
      await migration.down(dataSource.createQueryRunner());
      
      // Add fresh sample data
      console.log('🌱 Adding fresh sample data...');
      await migration.up(dataSource.createQueryRunner());
    } else {
      // Run migration for the first time
      const migration = new AddSampleReviewsAndFeedbacks1767040000000();
      await migration.up(dataSource.createQueryRunner());
    }

    // Display summary statistics
    console.log('\n📊 Final Statistics:');
    
    const reviewStats = await dataSource.query(`
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating::decimal), 2) as avg_rating,
        COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as reviews_with_comments
      FROM reviews
    `);

    const feedbackStats = await dataSource.query(`
      SELECT 
        COUNT(*) as total_feedbacks,
        ROUND(AVG(rating::decimal), 2) as avg_rating,
        COUNT(CASE WHEN comment IS NOT NULL THEN 1 END) as feedbacks_with_comments
      FROM feedbacks
    `);

    const topRoutes = await dataSource.query(`
      SELECT 
        r.name,
        COUNT(rev.id) as review_count,
        ROUND(AVG(rev.rating::decimal), 2) as avg_rating
      FROM routes r
      JOIN trips t ON r.id = t.route_id
      LEFT JOIN reviews rev ON t.id = rev.trip_id
      WHERE rev.id IS NOT NULL
      GROUP BY r.id, r.name
      ORDER BY AVG(rev.rating::decimal) DESC, COUNT(rev.id) DESC
      LIMIT 5
    `);

    if (reviewStats.length > 0) {
      console.log(`📝 Reviews: ${reviewStats[0].total_reviews} total, ${reviewStats[0].avg_rating}/5.0 average, ${reviewStats[0].reviews_with_comments} with comments`);
    }

    if (feedbackStats.length > 0) {
      console.log(`💭 Feedbacks: ${feedbackStats[0].total_feedbacks} total, ${feedbackStats[0].avg_rating}/5.0 average, ${feedbackStats[0].feedbacks_with_comments} with comments`);
    }

    if (topRoutes.length > 0) {
      console.log('\n🏆 Top Rated Routes:');
      topRoutes.forEach((route: any, index: number) => {
        console.log(`${index + 1}. ${route.name}: ${route.avg_rating}/5.0 (${route.review_count} reviews)`);
      });
    }

    console.log('\n✅ Reviews and feedbacks seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('👋 Database connection closed');
  }
}

// Usage instructions
function showUsage() {
  console.log(`
🌟 Reviews & Feedbacks Seeding Script

Usage:
  npm run seed:reviews           - Add sample reviews and feedbacks
  npm run ts-node src/scripts/seed-reviews-feedbacks.ts

What this script does:
  ✅ Creates realistic Vietnamese reviews and feedbacks
  ✅ Uses existing bookings and trips as a base
  ✅ Generates diverse rating distributions (mostly positive)
  ✅ Includes Vietnamese comments with mixed English
  ✅ Creates both reviews (new system) and feedbacks (legacy)
  ✅ Shows statistics and top-rated routes

Note: 
  - Requires existing users, trips, and bookings in database
  - Run the main seed script first if database is empty
  - Safe to run multiple times (will refresh sample data)

Rating Distribution:
  ⭐⭐⭐⭐⭐ (5 stars): 40% - Excellent service
  ⭐⭐⭐⭐☆ (4 stars): 35% - Good service  
  ⭐⭐⭐☆☆ (3 stars): 20% - Average service
  ⭐⭐☆☆☆ (2 stars): 4% - Poor service
  ⭐☆☆☆☆ (1 star): 1% - Very poor service
`);
}

// Check if script is run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }
  
  seedReviewsAndFeedbacks()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { seedReviewsAndFeedbacks };