import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { SignUpDto } from './dto/signup.dto';
import { AuthResponse } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: signUpDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(signUpDto.password, salt);

    // Create and save user
    const user = this.usersRepository.create({
      email: signUpDto.email,
      passwordHash: hashedPassword,
      name: signUpDto.fullName,
      phone: signUpDto.phone,
      role: UserRole.CUSTOMER,
    });

    const savedUser = await this.usersRepository.save(user);

    // Return user data in the specified format
    return {
      success: true,
      data: {
        userId: savedUser.id,
        email: savedUser.email,
        phone: savedUser.phone,
        fullName: savedUser.name,
        role: savedUser.role,
        createdAt: savedUser.createdAt,
      },
      message: 'registration successful',
    };
  }
}
