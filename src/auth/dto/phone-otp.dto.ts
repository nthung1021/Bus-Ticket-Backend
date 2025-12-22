import { IsPhoneNumber, IsString, Length } from 'class-validator';

export class SendOtpDto {
  @IsPhoneNumber('VN', {
    message: 'Please provide a valid Vietnamese phone number',
  })
  phone: string;
}

export class VerifyOtpDto {
  @IsPhoneNumber('VN', {
    message: 'Please provide a valid Vietnamese phone number',
  })
  phone: string;

  @IsString({ message: 'OTP must be a string' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}