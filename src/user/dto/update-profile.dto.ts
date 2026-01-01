import { IsString, IsOptional, IsPhoneNumber, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsPhoneNumber('VN', {
    message: 'Please provide a valid Vietnamese phone number',
  })
  phone?: string;
}
