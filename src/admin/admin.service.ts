import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAllUsers() {
    const users = await this.usersRepository.find();

    const sanitized = users.map((u) => ({
      userId: u.id,
      email: u.email,
      phone: u.phone,
      fullName: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));

    return { success: true, data: sanitized };
  }
}
