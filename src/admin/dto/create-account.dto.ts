import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { SignUpDto } from '../../auth/dto/signup.dto';
import { UserRole } from '../../entities/user.entity';

export class AdminCreateAccountDto extends SignUpDto {
  @IsEnum(UserRole, { message: 'Invalid role. Must be one of: admin, customer, operator, driver' })
  @IsNotEmpty({ message: 'Role is required' })
  role: UserRole;
}
