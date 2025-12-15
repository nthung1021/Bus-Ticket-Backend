import { IsArray, IsNotEmpty, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SeatChangeDto {
  @IsUUID()
  @IsNotEmpty()
  passengerId: string; // Passenger detail ID

  @IsString()
  @IsNotEmpty()
  newSeatCode: string;
}

export class ChangeSeatsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SeatChangeDto)
  seatChanges: SeatChangeDto[];
}

export class SeatChangeResultDto {
  passengerId: string;
  passengerName: string;
  oldSeatCode: string;
  newSeatCode: string;
  oldSeatPrice: number;
  newSeatPrice: number;
  priceDifference: number;
}

export class ChangeSeatsResponseDto {
  success: boolean;
  message: string;
  data: {
    bookingId: string;
    bookingReference: string;
    seatChanges: SeatChangeResultDto[];
    oldTotalAmount: number;
    newTotalAmount: number;
    totalPriceDifference: number;
    modificationHistory: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }>;
  };
}