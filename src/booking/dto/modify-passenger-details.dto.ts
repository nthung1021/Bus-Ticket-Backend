import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PassengerModificationDto {
  @IsUUID()
  @IsNotEmpty()
  id: string; // Passenger detail ID

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  documentId?: string; // ID/CCCD

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  seatCode?: string;
}

export class ModifyPassengerDetailsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerModificationDto)
  passengers: PassengerModificationDto[];
}

export class PassengerModificationResponseDto {
  id: string;
  bookingId: string;
  fullName: string;
  documentId?: string;
  seatCode: string;
  modifiedAt: Date;
}

export class ModifyPassengerDetailsResponseDto {
  success: boolean;
  message: string;
  data: {
    bookingId: string;
    bookingReference: string;
    modifiedPassengers: PassengerModificationResponseDto[];
    modificationHistory: Array<{
      type: string;
      description: string;
      timestamp: Date;
    }>;
  };
}