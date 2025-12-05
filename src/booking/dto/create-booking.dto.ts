import { IsNotEmpty, IsString, IsArray, ValidateNested, IsUUID, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class PassengerDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsNotEmpty()
  @IsString()
  documentId: string;

  @IsNotEmpty()
  @IsString()
  seatCode: string;
}

export class SeatDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsNotEmpty()
  @IsString()
  type: 'normal' | 'vip' | 'business';

  @IsNotEmpty()
  price: number;
}

export class CreateBookingDto {
  @IsNotEmpty()
  @IsUUID()
  tripId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one seat must be selected' })
  @ValidateNested({ each: true })
  @Type(() => SeatDto)
  seats: SeatDto[];

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one passenger must be provided' })
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @IsNotEmpty()
  totalPrice: number;
}