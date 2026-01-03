import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { BusService } from './bus.service';
import { Bus } from '../entities/bus.entity';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('buses')
export class BusController {
  constructor(private readonly busService: BusService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createBusDto: CreateBusDto): Promise<Bus> {
    return this.busService.create(createBusDto);
  }

  @Get()
  findAll(): Promise<Bus[]> {
    return this.busService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Bus> {
    return this.busService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateBusDto: UpdateBusDto): Promise<Bus> {
    return this.busService.update(id, updateBusDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string): Promise<void> {
    return this.busService.remove(id);
  }

  @Post(':id/photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FilesInterceptor('files'))
  uploadPhotos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<Bus> {
    return this.busService.uploadPhotos(id, files);
  }
}
