import { UserRole } from '../../entities/user.entity';

export interface AuthResponse {
  success: boolean;
  data: {
    userId: string;
    email: string;
    phone: string;
    fullName: string;
    role: UserRole;
    createdAt: Date;
  };
  message: string;
}
