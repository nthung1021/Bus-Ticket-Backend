# Integration Tests Setup

This document explains how to set up and run integration tests for the auth module.

## Test Structure

Integration tests are separated into two types:

1. **Controller E2E Tests** (`*.controller.e2e-spec.ts`): Tests HTTP endpoints using Supertest
2. **Service Integration Tests** (`*.service.integration-spec.ts`): Tests service layer with real database

## Test Database Configuration

Integration tests use a **separate test database** configured via environment variables:

- `TEST_DB_HOST` - Database host (default: localhost)
- `TEST_DB_PORT` - Database port (default: 5432)
- `TEST_DB_USERNAME` - Database username (default: postgres)
- `TEST_DB_PASSWORD` - Database password (default: postgres)
- `TEST_DB_NAME` - Test database name (default: bus_booking_test)

**Important**: Tests always connect to `localhost` - never to remote/online databases.

## Setup Instructions

### 1. Create Test Database

Create a separate PostgreSQL database for testing:

```sql
CREATE DATABASE bus_booking_test;
```

### 2. Create Environment File

Copy the example environment file and configure it:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your local test database credentials:

```env
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_USERNAME=postgres
TEST_DB_PASSWORD=your_password
TEST_DB_NAME=bus_booking_test
```

### 3. Run Tests

Run all integration tests:

```bash
npm run test:e2e
```

Run only controller tests:

```bash
npm run test:e2e -- *.controller.e2e-spec.ts
```

Run only service tests:

```bash
npm run test:e2e -- *.service.integration-spec.ts
```

## Test Features

### Controller E2E Tests (`auth.controller.e2e-spec.ts`)

- Tests all HTTP endpoints (`/auth/register`, `/auth/login`, etc.)
- Validates request/response format
- Tests cookie handling
- Tests authentication flows
- Uses Supertest for HTTP requests

### Service Integration Tests (`auth.service.integration-spec.ts`)

- Tests service methods directly
- Validates database operations
- Tests password hashing
- Tests token generation and storage
- Tests business logic

## Database Cleanup

Tests automatically clean up data:

- `beforeEach`: Cleans up before each test
- `afterAll`: Cleans up after all tests complete

This ensures test isolation and prevents data pollution.

## Important Notes

1. **Separate Database**: Always use a separate test database to avoid affecting development/production data
2. **Localhost Only**: Tests are configured to only connect to localhost
3. **Auto Cleanup**: Tests clean up after themselves, but you may want to manually verify the test database is clean
4. **Synchronize**: Test database uses `synchronize: true` to automatically create tables (for testing only)

## Troubleshooting

### Database Connection Errors

If you get connection errors:

1. Ensure PostgreSQL is running on localhost
2. Verify database credentials in `.env.test`
3. Ensure the test database exists: `CREATE DATABASE bus_booking_test;`

### Port Already in Use

If you get port conflicts:

- Ensure no other instances of the app are running
- Check if the test database connection is properly closed

### Test Data Not Cleaning Up

If test data persists:

- Manually clean the test database: `TRUNCATE TABLE users, refresh_tokens CASCADE;`
- Check that `beforeEach` and `afterAll` hooks are running
