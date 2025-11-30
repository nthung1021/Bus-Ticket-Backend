import { IsDateString, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { TripStatus } from '../../entities/trip.entity';

export class CreateTripDto {
  @IsUUID()
  routeId: string;

  @IsUUID()
  busId: string;

  @IsDateString()
  departureTime: Date;

  @IsDateString()
  arrivalTime: Date;

  @IsNumber()
  basePrice: number;

  @IsEnum(TripStatus)
  status?: TripStatus;
}
