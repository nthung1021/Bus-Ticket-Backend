import { IsArray, IsNotEmpty, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PassengerUpdateDto {
  @IsNotEmpty()
  id: string; // ID of existing passenger detail

  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsNotEmpty()
  seatCode: string;
}

export class UpdatePassengerDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PassengerUpdateDto)
  passengers: PassengerUpdateDto[];
}