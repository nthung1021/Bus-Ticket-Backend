import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsPhoneNumber,
} from 'class-validator';
import { IsUnique } from '../../common/decorators/is-unique.decorator';
import { User } from '../../entities/user.entity';

export class SignUpDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsUnique(User, 'email', { message: 'Email is already in use' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    },
  )
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @IsString({ message: 'Full name must be a string' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Full name cannot be longer than 100 characters' })
  @IsNotEmpty({ message: 'Full name is required' })
  fullName: string;

  @IsPhoneNumber('VN', {
    message: 'Please provide a valid Vietnamese phone number',
  })
  @IsUnique(User, 'phone', { message: 'Phone number is already registered' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;
}
