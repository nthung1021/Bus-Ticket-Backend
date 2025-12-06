import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';
import { AdminModule } from './admin/admin.module';
import { TripsModule } from './trips/trips.module';
import { BusModule } from './bus/bus.module';
import { RouteController } from './route/route.controller';
import { RouteModule } from './route/route.module';
import { OperatorModule } from './operator/operator.module';
import { SeatLayoutModule } from './seat-layout/seat-layout.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { BookingModule } from './booking/booking.module';
import { UserModule } from './user/user.module';
import { PoolMonitorMiddleware } from './middleware/pool-monitor.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        databaseConfig(configService),
      inject: [ConfigService],
    }),
    AuthModule,
    AdminModule,
    TripsModule,
    BusModule,
    RouteModule,
    OperatorModule,
    SeatLayoutModule,
    DatabaseModule,
    BookingModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PoolMonitorMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
