import { IsEmail, IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  code: string;
}
