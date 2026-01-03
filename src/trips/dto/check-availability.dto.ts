import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CheckAvailabilityDto {
  @IsDateString()
  departureTime: string;

  @IsDateString()
  arrivalTime: string;
}