import { IsIn } from 'class-validator';

export class ChangeRoleDto {
  @IsIn(['customer', 'admin'], {
    message: 'role must be one of: customer, admin',
  })
  role!: 'customer' | 'admin';
}
