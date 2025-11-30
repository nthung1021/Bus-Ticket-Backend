import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { databaseConfig } from './config/database.config';
import { AdminModule } from './admin/admin.module';
import { TripModule } from './trip/trip.module';
import { BusModule } from './bus/bus.module';
import { RouteController } from './route/route.controller';
import { RouteModule } from './route/route.module';

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
    TripModule,
    BusModule,
    RouteModule,
  ],
  controllers: [AppController, RouteController],
  providers: [AppService],
})
export class AppModule {}
