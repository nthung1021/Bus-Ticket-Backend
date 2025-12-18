import { 
  IsString, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsUUID, 
  IsNotEmpty,
  IsPhoneNumber,
  IsEmail
} from 'class-validator';
import { Type } from 'class-transformer';

export class ModifyPassengerInfoDto {
  @IsUUID()
  @IsNotEmpty()
  passengerId: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  documentId?: string; // ID/CCCD
}

export class ModifySeatSelectionDto {
  @IsUUID()
  @IsNotEmpty()
  passengerId: string;

  @IsString()
  @IsNotEmpty()
  newSeatCode: string;
}

export class ModifyContactInfoDto {
  @IsOptional()
  @IsPhoneNumber('VN')
  contactPhone?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;
}

export class BookingModificationDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifyPassengerInfoDto)
  passengerInfo?: ModifyPassengerInfoDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ModifySeatSelectionDto)
  seatChanges?: ModifySeatSelectionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ModifyContactInfoDto)
  contactInfo?: ModifyContactInfoDto;
}

export class BookingModificationResponseDto {
  id: string;
  bookingReference: string;
  status: string;
  modificationAllowed: boolean;
  modificationRules?: string[];
  lastModifiedAt: Date;
  modificationHistory?: Array<{
    type: string;
    timestamp: Date;
    changes: any;
  }>;
}

export class CheckModificationPermissionsDto {
  canModifyPassengerInfo: boolean;
  canModifySeats: boolean;
  canModifyContactInfo: boolean;
  rules: string[];
  restrictions?: string[];
}