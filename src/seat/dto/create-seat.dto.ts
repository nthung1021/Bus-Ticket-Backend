import { IsString, IsUUID, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { SeatType } from '../../entities/seat.entity';

export class CreateSeatDto {
  @IsUUID()
  busId: string;

  @IsString()
  seatCode: string;

  @IsOptional()
  @IsEnum(SeatType)
  seatType?: SeatType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
