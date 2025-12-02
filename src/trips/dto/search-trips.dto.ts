import { IsString, IsOptional, IsIn, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchTripsDto {
  @IsString()
  origin: string;

  @IsString()
  destination: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  passengers?: number = 1;

  @IsOptional()
  @IsIn(['standard', 'limousine', 'sleeper'])
  busType?: string;

  @IsOptional()
  @IsIn(['morning', 'afternoon', 'evening', 'night'])
  departureTime?: string;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  minPrice?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  maxPrice?: number;

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
