import {
  Controller,
  Patch,
  Get,
  UseGuards,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { ChangeRoleDto } from './dto/change-role.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('admin')
  @Get('stats')
  getAdminStats() {}

  @Roles('admin')
  @Get('users')
  async getAllUsers() {
    return await this.adminService.findAllUsers();
  }

  @Roles('admin')
  @Patch('users/:userId/role')
  async changeUserRole(
    @Param('userId') userId: string,
    @Body() body: ChangeRoleDto,
    @Req() req: Request & { user?: { sub?: string } },
  ) {
    const actorId = req.user?.sub;
    const updated = await this.adminService.updateUserRole(
      userId,
      body.role,
      actorId,
    );
    return { ok: true, updated };
  }
}
