import { IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateRouteDto {
  @IsUUID()
  operatorId: string;

  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsNumber()
  distanceKm: number;

  @IsNumber()
  estimatedMinutes: number;
}
